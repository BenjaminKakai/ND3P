const axios = require('axios');
const { Payment, Booking } = require('../models');
const { generateUniqueCode } = require('../utils/paymentUtils');

class PaymentService {
    /**
     * Gets M-Pesa access token
     * @returns {Promise<string>} - Access token
     */
    async getMpesaAccessToken() {
        try {
            if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET) {
                throw new Error('M-Pesa credentials are not properly configured');
            }

            const auth = Buffer.from(
                `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
            ).toString('base64');

            console.log('Attempting to get M-Pesa token');

            const response = await axios.get(
                `${process.env.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
                {
                    headers: {
                        'Authorization': `Basic ${auth}`
                    }
                }
            );

            if (!response.data.access_token) {
                throw new Error('No access token in response');
            }

            return response.data.access_token;
        } catch (error) {
            console.error('Detailed token error:', error.response?.data || error.message);
            throw new Error(`Failed to fetch M-Pesa access token: ${error.message}`);
        }
    }

    /**
     * Initiates a payment transaction via M-Pesa STK Push
     * @param {Object} param0 - Payment details object
     * @returns {Promise<Object>} - Payment initiation result
     */
    async initiatePayment({ bookingId, amount, phoneNumber }) {
        try {
            if (!process.env.BUSINESS_SHORTCODE || !process.env.LIPA_SHORTCODE_KEY) {
                throw new Error('M-Pesa business credentials are not properly configured');
            }

            const accessToken = await this.getMpesaAccessToken();

            const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
            
            const password = Buffer.from(
                `${process.env.BUSINESS_SHORTCODE}${process.env.LIPA_SHORTCODE_KEY}${timestamp}`
            ).toString('base64');

            const formattedPhone = phoneNumber.startsWith('254') ? 
                phoneNumber : 
                `254${phoneNumber.replace(/^0+/, '')}`;


                const stkPushRequest = {
                    BusinessShortCode: process.env.BUSINESS_SHORTCODE,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: parseInt(amount),
                    PartyA: formattedPhone,
                    PartyB: process.env.BUSINESS_SHORTCODE,
                    PhoneNumber: formattedPhone,
                    CallBackURL: `${process.env.BASE_URL}/api/bookings/payments/callback`, // Updated path
                    AccountReference: `Booking #${bookingId}`,
                    TransactionDesc: "Payment for booking"
                };

            console.log('STK Push Request:', stkPushRequest);

            const response = await axios.post(
                `${process.env.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
                stkPushRequest,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('STK Push Response:', response.data);

            if (response.data.ResponseCode === '0') {
                await this.recordPaymentTransaction({
                    bookingId,
                    amount,
                    phoneNumber: formattedPhone,
                    status: 'pending',
                    merchantRequestId: response.data.MerchantRequestID
                });
                return {
                    success: true,
                    message: 'Payment initiated successfully',
                    data: response.data
                };
            } else {
                throw new Error(`STK push failed: ${response.data.ResponseDescription}`);
            }
        } catch (error) {
            console.error('Detailed payment error:', error.response?.data || error.message);
            throw new Error(`Failed to initiate payment: ${error.message}`);
        }
    }

    async recordPaymentTransaction(paymentDetails) {
        const { bookingId, amount, phoneNumber, status, merchantRequestId } = paymentDetails;
        
        try {
            // First fetch the booking to get the user_id and offer_id
            const booking = await Booking.findByPk(bookingId);
            if (!booking) {
                throw new Error('Booking not found');
            }
    
            console.log('Found booking:', booking); // Add this to debug
    
            return await Payment.create({
                bookingId,
                user_id: booking.userId,  // Changed from booking.user_id to booking.userId
                offer_id: booking.offerId,  // Changed from booking.offer_id to booking.offerId
                amount,
                phone_number: phoneNumber,
                status,
                gateway: 'mpesa',
                MerchantRequestID: merchantRequestId,
                unique_code: generateUniqueCode(),
                payment_date: new Date()
            });
        } catch (error) {
            console.error('Error recording payment transaction:', error);
            throw new Error('Failed to record payment transaction');
        }
    }

    async handlePaymentCallback(callbackData) {
        const { MerchantRequestID, ResultCode, ResultDesc } = callbackData;

        try {
            const payment = await Payment.findOne({
                where: { merchantRequestId: MerchantRequestID },
                include: [{ model: Booking }],
            });

            if (!payment) {
                throw new Error('Payment not found');
            }

            payment.status = ResultCode === 0 ? 'completed' : 'failed';
            payment.resultDescription = ResultDesc;
            await payment.save();

            if (ResultCode === 0 && payment.Booking) {
                payment.Booking.status = 'confirmed';
                await payment.Booking.save();
            }

            return { success: true, message: 'Payment callback processed successfully' };
        } catch (error) {
            console.error('Error processing payment callback:', error);
            throw new Error('Failed to process payment callback');
        }
    }
}

module.exports = new PaymentService();