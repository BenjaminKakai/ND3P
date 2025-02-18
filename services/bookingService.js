const { Op } = require('sequelize');
const { Booking, Offer, Service, Store, User, Payment } = require('../models');
const QRCode = require('qrcode');
const path = require('path');
const moment = require('moment');
const { generateUniqueCode } = require('../utils/paymentUtils');
const { sendEmail } = require('../utils/emailUtil');
const ejs = require('ejs');
const fs = require('fs');
const axios = require('axios');

const BookingService = {
    generateTimeSlots: (openingTime, closingTime) => {
        const timeSlots = [];
        let currentTime = moment(openingTime, 'HH:mm');
        const endTime = moment(closingTime, 'HH:mm');

        while (currentTime.isBefore(endTime)) {
            timeSlots.push(currentTime.format('HH:mm'));
            currentTime.add(30, 'minutes');
        }
        return timeSlots;
    },

    formatDateTime: (date) => {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        };

        const formattedDate = new Date(date).toLocaleString('en-GB', options);
        const day = new Date(date).getDate();
        let suffix = 'th';
        if (day % 10 === 1 && day !== 11) suffix = 'st';
        else if (day % 10 === 2 && day !== 12) suffix = 'nd';
        else if (day % 10 === 3 && day !== 13) suffix = 'rd';

        return formattedDate.replace(day, day + suffix);
    },

    async createBooking(bookingData) {
        const { offerId, userId, paymentUniqueCode, startTime } = bookingData;
        
        const payment = paymentUniqueCode ? 
            await Payment.findOne({ where: { unique_code: paymentUniqueCode } }) : null;
        if (paymentUniqueCode && !payment) throw new Error('Payment not found');

        const offer = await Offer.findByPk(offerId, {
            include: {
                model: Service,
                include: { model: Store }
            }
        });
        if (!offer) throw new Error('Offer not found');
        if (!offer.Service) throw new Error('Service not found');
        if (!offer.Service.duration) throw new Error('Service duration not defined');

        const user = await User.findByPk(userId);
        if (!user) throw new Error('User not found');

        const endTime = new Date(new Date(startTime).getTime() + offer.Service.duration * 60000);
        
        const existingBooking = await Booking.findOne({
            where: {
                offerId,
                status: { [Op.not]: 'cancelled' },
                [Op.or]: [
                    { startTime: { [Op.between]: [startTime, endTime] } },
                    { endTime: { [Op.between]: [startTime, endTime] } },
                    {
                        [Op.and]: [
                            { startTime: { [Op.lte]: startTime } },
                            { endTime: { [Op.gte]: endTime } }
                        ]
                    }
                ]
            }
        });
        if (existingBooking) throw new Error('Time slot already booked');

        const booking = await Booking.create({
            offerId,
            userId,
            paymentId: payment?.id,
            paymentUniqueCode: payment?.unique_code,
            status: 'pending',
            startTime,
            endTime
        });

        const qrData = JSON.stringify({ paymentUniqueCode: booking.paymentUniqueCode || 'N/A' });
        const qrCodePath = path.join(__dirname, '..', 'public', 'qrcodes', `${booking.id}.png`);
        await QRCode.toFile(qrCodePath, qrData);

        booking.qrCode = `${process.env.BASE_URL}/qrcodes/${booking.id}.png`;
        await booking.save();

        const emailContent = await this.generateConfirmationEmail(user, offer.Service, booking);
        await sendEmail(
            user.email,
            'Booking Confirmation',
            '',
            emailContent
        );

        return booking;
    },

    async generateConfirmationEmail(user, service, booking) {
        const templatePath = path.join(__dirname, '..', 'templates', 'customerBookingConfirmation.ejs');
        const template = fs.readFileSync(templatePath, 'utf8');
        
        return ejs.render(template, {
            userName: user.firstName,
            serviceName: service.name,
            bookingStartTime: this.formatDateTime(booking.startTime),
            bookingEndTime: this.formatDateTime(booking.endTime),
            status: booking.status,
            qrCode: booking.qrCode,
            code: booking.paymentUniqueCode
        });
    },

    async getAllBookings() {
        return await Booking.findAll();
    },

    async getAvailableSlots(date, offerId) {
        const offer = await Offer.findByPk(offerId, {
            include: {
                model: Service,
                include: { model: Store }
            }
        });
        if (!offer) throw new Error('Offer not found');
        
        const store = offer.Service.Store;
        let workingDays = typeof store.working_days === 'string' ? 
            store.working_days.split(',').map(d => d.trim()) : 
            store.working_days;

        const dayOfWeek = moment(date).format('dddd');
        if (!workingDays.includes(dayOfWeek)) throw new Error('Store closed on this day');

        const openingTime = moment(store.opening_time, 'HH:mm:ss').format('HH:mm');
        const closingTime = moment(store.closing_time, 'HH:mm:ss').format('HH:mm');

        const bookings = await Booking.findAll({
            where: {
                startTime: {
                    [Op.between]: [
                        moment(date).startOf('day').toDate(),
                        moment(date).endOf('day').toDate()
                    ]
                },
                offerId
            }
        });

        const bookedSlots = bookings.map(b => ({
            start: moment(b.startTime).format('HH:mm'),
            end: moment(b.endTime).format('HH:mm')
        }));

        return this.generateTimeSlots(openingTime, closingTime)
            .filter(slot => !bookedSlots.some(bs => slot >= bs.start && slot <= bs.end));
    },

    async getBookingDetails(id) {
        return await Booking.findOne({
            where: { id },
            include: [
                {
                    model: Offer,
                    include: {
                        model: Service,
                        include: { model: Store }
                    }
                },
                { model: User }
            ]
        });
    },

    async updateBooking(id, updateData) {
        const booking = await Booking.findByPk(id);
        if (!booking) throw new Error('Booking not found');

        return await booking.update(updateData);
    },

    async cancelBooking(id) {
        const booking = await Booking.findByPk(id);
        if (!booking) throw new Error('Booking not found');
        
        return await booking.update({ status: 'cancelled' });
    },

    async fulfillBooking(paymentUniqueCode) {
        const booking = await Booking.findOne({ 
            where: { paymentUniqueCode, status: 'pending' }
        });
        if (!booking) throw new Error('Invalid or expired booking code');

        return await booking.update({ status: 'fulfilled' });
    },

    async getStoreBookings(storeId) {
        return await Booking.findAll({
            include: {
                model: Offer,
                include: {
                    model: Service,
                    include: {
                        model: Store,
                        where: { id: storeId }
                    }
                }
            }
        });
    },

    async getUserBookings(userId) {
        return await Booking.findAll({
            where: { userId },
            include: {
                model: Offer,
                include: {
                    model: Service,
                    include: { model: Store }
                }
            }
        });
    },

    async getStoreAnalytics(storeId, startDate, endDate) {
        const bookings = await Booking.findAll({
            where: {
                startTime: { [Op.between]: [new Date(startDate), new Date(endDate)] }
            },
            include: {
                model: Offer,
                include: {
                    model: Service,
                    include: {
                        model: Store,
                        where: { id: storeId }
                    }
                }
            }
        });

        return {
            totalBookings: bookings.length,
            completedBookings: bookings.filter(b => b.status === 'fulfilled').length,
            cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
            pendingBookings: bookings.filter(b => b.status === 'pending').length,
            totalRevenue: bookings.reduce((sum, b) => sum + (b.Offer?.Service?.price || 0), 0),
            averageBookingsPerDay: bookings.length / moment(endDate).diff(startDate, 'days')
        };
    },

    async processPayment(bookingId, amount, phoneNumber) {
        const booking = await Booking.findByPk(bookingId);
        if (!booking) throw new Error('Booking not found');

        // Get M-Pesa access token
        const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
        const tokenResponse = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}` }
        });
        const accessToken = tokenResponse.data.access_token;

        // Initiate STK Push
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, -4);
        const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

        const stkResponse = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                BusinessShortCode: process.env.MPESA_SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: phoneNumber,
                PartyB: process.env.MPESA_SHORTCODE,
                PhoneNumber: phoneNumber,
                CallBackURL: `${process.env.BASE_URL}/api/mpesa/callback`,
                AccountReference: `Booking-${bookingId}`,
                TransactionDesc: 'Payment for booking'
            },
            {
                headers: { Authorization: `Bearer ${accessToken}` }
            }
        );

        // Save payment details
        const payment = await Payment.create({
            bookingId,
            amount,
            phoneNumber,
            status: 'pending',
            merchantRequestId: stkResponse.data.MerchantRequestID,
            checkoutRequestId: stkResponse.data.CheckoutRequestID,
            unique_code: generateUniqueCode()
        });

        return payment;
    },

    async handlePaymentCallback(merchantRequestId, resultCode) {
        const payment = await Payment.findOne({
            where: { merchantRequestId },
            include: { model: Booking }
        });
        if (!payment) throw new Error('Payment not found');

        payment.status = resultCode === 0 ? 'completed' : 'failed';
        await payment.save();

        if (resultCode === 0 && payment.Booking) {
            await payment.Booking.update({ status: 'confirmed' });
        }

        return payment;
    }
};

module.exports = BookingService;