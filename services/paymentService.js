// services/paymentService.js
const axios = require('axios');
const { Payment } = require('../models');
const { generateUniqueCode } = require('../utils/paymentUtils');

class PaymentService {
    /**
     * Gets M-Pesa access token
     * @returns {Promise<string>} - Access token
     */
    async getMpesaAccessToken() {
        try {
            const response = await axios({
                method: 'GET',
                url: `${process.env.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
                auth: {
                    username: process.env.MPESA_CONSUMER_KEY,
                    password: process.env.MPESA_CONSUMER_SECRET,
                },
            });

            return response.data.access_token;
        } catch (error) {
            console.error('Error fetching M-Pesa access token:', error);
            throw new Error('Failed to fetch M-Pesa access token');
        }
    }

    /**
     * Initiates a payment transaction via M-Pesa STK Push
     * @param {number} amount - The amount to be paid
     * @param {string} phoneNumber - The customer's phone number
     * @param {string} accessToken - M-Pesa API access token
     * @returns {Promise<Object>} - M-Pesa API response
     */
    async initiatePayment(amount, phoneNumber, accessToken) {
        const paymentData = {
            BusinessShortCode: process.env.BUSINESS_SHORTCODE,
            LipaNaMpesaOnlineShortcode: process.env.LIPA_SHORTCODE,
            LipaNaMpesaOnlineShortcodeKey: process.env.LIPA_SHORTCODE_KEY,
            PhoneNumber: phoneNumber,
            Amount: amount,
            AccountReference: "Payment for service",
            TransactionDesc: "Payment for service",
        };

        const headers = {
            'Authorization': `Bearer ${accessToken}`
        };

        try {
            const response = await axios.post(
                'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
                paymentData,
                { headers }
            );

            return response.data;
        } catch (error) {
            console.error('Error making payment request', error);
            throw new Error('Failed to make payment request');
        }
    }

    /**
     * Records a payment transaction in the database
     * @param {Object} paymentDetails - Payment details
     * @returns {Promise<Payment>} - Created payment record
     */
    async recordPaymentTransaction(paymentDetails) {
        const { bookingId, amount, phoneNumber, status, merchantRequestId } = paymentDetails;

        const uniqueCode = generateUniqueCode();
        try {
            const newPayment = await Payment.create({
                bookingId,
                amount,
                phoneNumber,
                status,
                merchantRequestId,
                uniqueCode,
                payment_date: new Date()
            });

            return newPayment;
        } catch (error) {
            console.error('Error recording payment transaction:', error);
            throw new Error('Failed to record payment transaction');
        }
    }

    /**
     * Handles M-Pesa payment callback
     * @param {Object} callbackData - Callback data from M-Pesa
     * @returns {Promise<Object>} - Processing result
     */
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