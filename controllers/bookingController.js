const db = require('../models'); // Import the db object that contains all models
const { 
    Booking, 
    Offer, 
    Service, 
    Store, 
    User, 
    Payment,
    Staff,
    Chat,
    Message,
    Review,
    Follow,
    Invoice
} = db;  // Destructure the models from the db object

const QRCode = require('qrcode');
const { sendEmail } = require('../utils/emailUtil');
const ejs = require('ejs');
const path = require('path');
const { Op } = require('sequelize');
const moment = require('moment');
const fs = require('fs');
const { generateUniqueCode } = require('../utils/paymentUtils');
const followService = require('../services/socialService');
const paymentService = require('../services/paymentService');

const BookingController = {
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


    async create(req, res) {
        try {
            console.log('Payment model:', Payment); // Debugging line
            const { offerId, paymentUniqueCode, startTime } = req.body;
            
            // Get userId from the authenticated user in req.user
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Authentication required' });
            }
    
            // Validate the payment code if provided
            let paymentId = null;
            if (paymentUniqueCode) {
                console.log('Looking for payment with unique_code:', paymentUniqueCode); // Debugging line
                const payment = await Payment.findOne({
                    where: { unique_code: paymentUniqueCode },
                });
    
                if (!payment) {
                    return res.status(404).json({ error: 'Payment not found' });
                }
    
                paymentId = payment.id;
            }
    
            // Retrieve the offer details
            const offer = await Offer.findByPk(offerId, {
                include: [{
                    model: Service,
                    as: 'service',
                    attributes: ['id', 'name', 'duration'],
                    include: [{
                        model: Store,
                        as: 'store',
                        attributes: ['id', 'name']
                    }]
                }]
            });
    
            if (!offer) {
                return res.status(404).json({ error: 'Offer not found' });
            }
    
            const service = offer.service;
            if (!service) {
                return res.status(404).json({ error: 'Service not found' });
            }
    
            // Retrieve user details
            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
    
            // Calculate the end time based on the start time and service duration
            const endTime = new Date(new Date(startTime).getTime() + service.duration * 60000);
    
            // Check for booking conflicts
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
    
            if (existingBooking) {
                return res.status(400).json({ 
                    error: 'This time slot is already booked. Please choose a different time.' 
                });
            }
    
            // Create the booking
            const booking = await Booking.create({
                offerId,
                userId,
                paymentId,
                paymentUniqueCode,
                status: paymentId ? 'pending' : 'pending',
                startTime,
                endTime,
            });
    
            // Generate QR code
            const qrData = JSON.stringify({ paymentUniqueCode: booking.paymentUniqueCode || 'N/A' });
            const qrCodeDir = path.join(__dirname, '..', 'public', 'qrcodes');
            
            // Ensure the qrcodes directory exists
            if (!fs.existsSync(qrCodeDir)){
                fs.mkdirSync(qrCodeDir, { recursive: true });
            }
            
            const qrCodePath = path.join(qrCodeDir, `${booking.id}.png`);
            await QRCode.toFile(qrCodePath, qrData);
    
            const qrCodeUrl = `${req.protocol}://${req.get('host')}/qrcodes/${booking.id}.png`;
            booking.qrCode = qrCodeUrl;
            await booking.save();
    
            // Format date/time for email
            const formattedStartTime = moment(startTime).format('YYYY-MM-DD HH:mm');
            const formattedEndTime = moment(endTime).format('YYYY-MM-DD HH:mm');
    
            // Send confirmation email
            const customerTemplatePath = path.join(__dirname, '..', 'templates', 'customerBookingConfirmation.ejs');
            const customerTemplate = fs.readFileSync(customerTemplatePath, 'utf8');
    
            const customerEmailContent = ejs.render(customerTemplate, {
                userName: user.firstName,
                serviceName: service.name,
                bookingStartTime: formattedStartTime,
                bookingEndTime: formattedEndTime,
                status: booking.status,
                qrCode: booking.qrCode,
                bookingLink: booking.link,
                code: booking.paymentUniqueCode,
            });
    
            await sendEmail(
                user.email,
                'Booking Confirmation',
                '',
                customerEmailContent
            );
    
            return res.status(201).json({ booking });
        } catch (error) {
            console.error('Booking creation error:', error);
            return res.status(500).json({ 
                error: 'Failed to create booking',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    },

    async getAll(req, res) {
        try {
            const bookings = await Booking.findAll();
            res.status(200).json(bookings);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch bookings' });
        }
    },

    async getAvailableSlots(req, res) {
        const { date, offerId } = req.query;

        if (!date || !offerId) {
            return res.status(400).json({ message: 'Date and offerId are required.' });
        }

        try {
            const offer = await Offer.findByPk(offerId);
            if (!offer) {
                return res.status(404).json({ message: 'Offer not found.' });
            }

            const service = await offer.getService();
            if (!service) {
                return res.status(404).json({ message: 'Service for the offer not found.' });
            }

            const store = await service.getStore();
            if (!store) {
                return res.status(404).json({ message: 'Store for the service not found.' });
            }

            let workingDays = store.working_days;
            if (typeof workingDays === 'string') {
                workingDays = workingDays.split(',').map(day => day.trim());
            }

            const openingTime = moment(store.opening_time, 'HH:mm:ss').format('HH:mm');
            const closingTime = moment(store.closing_time, 'HH:mm:ss').format('HH:mm');

            const dayOfWeek = moment(date).format('dddd');

            if (!workingDays.includes(dayOfWeek)) {
                return res.status(400).json({ message: 'The store is closed on this day.' });
            }

            const bookings = await Booking.findAll({
                where: {
                    startTime: {
                        [Op.gte]: moment(date).startOf('day').toDate(),
                        [Op.lte]: moment(date).endOf('day').toDate(),
                    },
                    offerId: offerId,
                },
            });

            const availableSlots = BookingController.generateTimeSlots(openingTime, closingTime);

            const bookedSlots = bookings.map(booking => {
                const bookingStart = moment(booking.startTime).format('HH:mm');
                const bookingEnd = moment(booking.endTime).format('HH:mm');
                return { start: bookingStart, end: bookingEnd };
            });

            if (bookings.length === 0) {
                return res.status(200).json({ availableSlots: availableSlots });
            }

            const freeSlots = availableSlots.filter(slot => {
                return !bookedSlots.some(bookingSlot => {
                    return slot >= bookingSlot.start && slot <= bookingSlot.end;
                });
            });

            return res.status(200).json({ availableSlots: freeSlots });

        } catch (error) {
            console.error('Error getting available slots:', error);
            return res.status(500).json({ message: 'Error fetching available slots' });
        }
    },

    async getBookingTimes(req, res) {
        const { serviceId } = req.body;

        const formatDatetime = (isoString) => {
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            };
            return new Date(isoString).toLocaleString('en-US', options);
        };

        const isBookingFromToday = (startTime) => {
            const today = new Date();
            const bookingDate = new Date(startTime);
            today.setHours(0, 0, 0, 0);
            return bookingDate >= today;
        };

        try {
            if (!serviceId) {
                return res.status(400).json({ error: 'Service ID is required.' });
            }

            const service = await Service.findByPk(serviceId, {
                include: [
                    {
                        model: Offer,
                        as: 'Offers',
                        include: {
                            model: Booking,
                            as: 'Bookings',
                        },
                    },
                ],
            });

            if (!service) {
                return res.status(404).json({ error: 'Service not found.' });
            }

            const bookings = [];

            service.Offers.forEach(offer => {
                if (offer.Bookings && offer.Bookings.length > 0) {
                    offer.Bookings.forEach(booking => {
                        if (isBookingFromToday(booking.startTime)) {
                            bookings.push({
                                startTime: booking.startTime,
                                endTime: booking.endTime,
                            });
                        }
                    });
                }
            });

            res.status(200).json({ bookings });
        } catch (error) {
            console.error('Error fetching booking times:', error);
            res.status(500).json({ error: 'An error occurred while fetching booking times.' });
        }
    },

    async getById(req, res) {
        const { id } = req.params;

        try {
            const booking = await Booking.findOne({
                where: { id },
                include: [
                    {
                        model: Offer,
                        attributes: ['discount', 'expiration_date', 'description', 'status'],
                        include: [
                            {
                                model: Service,
                                attributes: ['name', 'price', 'duration', 'category', 'description'],
                                include: [
                                    {
                                        model: Store,
                                        attributes: ['name', 'location'],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: User,
                        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
                    },
                ],
            });

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            res.status(200).json(booking);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch booking details' });
        }
    },

    async update(req, res) {
        const { id } = req.params;
        const { status, startTime, endTime } = req.body;

        try {
            const booking = await Booking.findByPk(id);

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            booking.status = status || booking.status;
            booking.startTime = startTime || booking.startTime;
            booking.endTime = endTime || booking.endTime;
            await booking.save();

            res.status(200).json({ message: 'Booking updated successfully', booking });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update booking' });
        }
    },

    async delete(req, res) {
        const { id } = req.params;

        try {
            const booking = await Booking.findByPk(id);

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }

            await booking.destroy();
            res.status(200).json({ message: 'Booking deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete booking' });
        }
    },

    async validateAndFulfill(req, res) {
        const { qrData } = req.body;

        try {
            const { paymentUniqueCode } = JSON.parse(qrData);

            const booking = await Booking.findOne({ where: { paymentUniqueCode, status: 'pending' } });

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found or already fulfilled/cancelled' });
            }

            booking.status = 'fulfilled';
            await booking.save();

            res.status(200).json({ message: 'Booking marked as fulfilled successfully', booking });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to validate and fulfill booking' });
        }
    },

    async getByOffer(req, res) {
        const { offerId } = req.params;

        try {
            const bookings = await Booking.findAll({
                where: { offerId },
                include: [
                    {
                        model: Offer,
                        attributes: ['name', 'description'],
                        include: [
                            {
                                model: Service,
                                attributes: ['name'],
                                include: [
                                    {
                                        model: Store,
                                        attributes: ['name', 'location'],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            if (!bookings.length) {
                return res.status(404).json({ error: 'No bookings found for this offer' });
            }

            res.status(200).json(bookings);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch bookings by offer' });
        }
    },

    async getByStore(req, res) {
        const { storeId } = req.params;

        try {
            const bookings = await Booking.findAll({
                include: [
                    {
                        model: Offer,
                        attributes: ['discount', 'expiration_date', 'description', 'status'],
                        include: [
                            {
                                model: Service,
                                attributes: ['name', 'price', 'duration', 'category', 'description'],
                                include: [
                                    {
                                        model: Store,
                                        where: { id: storeId },
                                        attributes: ['name', 'location'],
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        model: User,
                        attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber'],
                    },
                ],
            });

            if (!bookings.length) {
                return res.status(404).json({ error: 'No bookings found for this store' });
            }

            res.status(200).json(bookings);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch bookings by store' });
        }
    },

    async getByUser(req, res) {
        const { userId } = req.params;

        try {
            const bookings = await Booking.findAll({
                where: { userId },
                include: [
                    {
                        model: Offer,
                        attributes: ['discount', 'expiration_date', 'description', 'status'],
                        include: [
                            {
                                model: Service,
                                attributes: ['name', 'price', 'duration', 'category', 'description'],
                                include: [
                                    {
                                        model: Store,
                                        attributes: ['name', 'location'],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            if (!bookings.length) {
                return res.status(404).json({ error: 'No bookings found for this user' });
            }

            res.status(200).json(bookings);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch bookings by user' });
        }
    },

    async markAsFulfilled(req, res) {
        const { paymentUniqueCode } = req.body;

        try {
            const booking = await Booking.findOne({ where: { paymentUniqueCode, status: 'pending' } });

            if (!booking) {
                return res.status(404).json({ error: 'Booking not found or already fulfilled/cancelled' });
            }

            booking.status = 'fulfilled';
            await booking.save();

            res.status(200).json({ message: 'Booking marked as fulfilled successfully', booking });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to mark booking as fulfilled' });
        }
    },

    async getStoreAnalytics(req, res) {
        const { storeId } = req.params;
        const { startDate, endDate } = req.query;

        try {
            const query = {
                include: [
                    {
                        model: Offer,
                        include: [
                            {
                                model: Service,
                                include: [
                                    {
                                        model: Store,
                                        where: { id: storeId },
                                    },
                                ],
                            },
                        ],
                    },
                ],
            };

            if (startDate && endDate) {
                query.where = {
                    startTime: {
                        [Op.between]: [new Date(startDate), new Date(endDate)],
                    },
                };
            }

            const bookings = await Booking.findAll(query);

            const analytics = {
                totalBookings: bookings.length,
                completedBookings: bookings.filter(b => b.status === 'fulfilled').length,
                cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
                pendingBookings: bookings.filter(b => b.status === 'pending').length,
                totalRevenue: bookings.reduce((sum, booking) => {
                    return sum + (booking.Offer?.Service?.price || 0);
                }, 0),
                averageBookingsPerDay: bookings.length / (moment(endDate).diff(moment(startDate), 'days') || 1),
            };

            res.status(200).json(analytics);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch store analytics' });
        }
    },

    async createPayment(req, res) {
        const { bookingId, amount, phoneNumber } = req.body;
    
        try {
            const booking = await Booking.findByPk(bookingId);
            if (!booking) {
                return res.status(404).json({ error: 'Booking not found' });
            }
    
            // Initiate STK Push payment with the new service structure
            const paymentResponse = await paymentService.initiatePayment({
                bookingId,
                amount,
                phoneNumber
            });
    
            // The payment recording is now handled inside initiatePayment
            // We can return the payment response directly
            res.status(201).json({ 
                success: true,
                merchantRequestId: paymentResponse.MerchantRequestID,
                checkoutRequestId: paymentResponse.CheckoutRequestID
            });
        } catch (error) {
            console.error('Payment creation error:', error);
            res.status(500).json({ error: 'Failed to create payment' });
        }
    },

    async handlePaymentCallback(req, res) {
        try {
            const result = await paymentService.handlePaymentCallback(req.body);
            res.status(200).json(result);
        } catch (error) {
            console.error('Error handling payment callback:', error);
            res.status(500).json({ error: 'Failed to handle payment callback' });
        }
    },

    async getAllPayments(req, res) {
        try {
            const payments = await Payment.findAll({
                include: [
                    {
                        model: Booking,
                        include: [
                            {
                                model: Offer,
                                include: [
                                    {
                                        model: Service,
                                        include: [{ model: Store }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            res.status(200).json(payments);
        } catch (error) {
            console.error('Error fetching payments:', error);
            res.status(500).json({ error: 'Failed to fetch payments' });
        }
    },

    async getPaymentsByStatus(req, res) {
        const { status } = req.params;
        try {
            const payments = await Payment.findAll({
                where: { status },
                include: [
                    {
                        model: Booking,
                        include: [
                            {
                                model: Offer,
                                include: [
                                    {
                                        model: Service,
                                        include: [{ model: Store }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            res.status(200).json(payments);
        } catch (error) {
            console.error('Error fetching payments by status:', error);
            res.status(500).json({ error: 'Failed to fetch payments by status' });
        }
    },

    async getPaymentsByUser(req, res) {
        const { user_id } = req.params;
        try {
            const payments = await Payment.findAll({
                include: [
                    {
                        model: Booking,
                        where: { userId: user_id },
                        include: [
                            {
                                model: Offer,
                                include: [
                                    {
                                        model: Service,
                                        include: [{ model: Store }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            res.status(200).json(payments);
        } catch (error) {
            console.error('Error fetching payments by user:', error);
            res.status(500).json({ error: 'Failed to fetch payments by user' });
        }
    },

    async getPaymentsByOffer(req, res) {
        const { offer_id } = req.params;
        try {
            const payments = await Payment.findAll({
                include: [
                    {
                        model: Booking,
                        where: { offerId: offer_id },
                        include: [
                            {
                                model: Offer,
                                include: [
                                    {
                                        model: Service,
                                        include: [{ model: Store }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            res.status(200).json(payments);
        } catch (error) {
            console.error('Error fetching payments by offer:', error);
            res.status(500).json({ error: 'Failed to fetch payments by offer' });
        }
    },

    async getPaymentsByStore(req, res) {
        const { store_id } = req.params;
        try {
            const payments = await Payment.findAll({
                include: [
                    {
                        model: Booking,
                        include: [
                            {
                                model: Offer,
                                include: [
                                    {
                                        model: Service,
                                        where: { storeId: store_id },
                                        include: [{ model: Store }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });
            res.status(200).json(payments);
        } catch (error) {
            console.error('Error fetching payments by store:', error);
            res.status(500).json({ error: 'Failed to fetch payments by store' });
        }
    },




    // Follow-related methods
    async followStore(req, res) {
        const { userId, storeId } = req.body;
        try {
            const existingFollow = await Follow.findOne({
                where: { userId, storeId }
            });

            if (existingFollow) {
                return res.status(400).json({ error: 'Already following this store' });
            }

            const follow = await Follow.create({
                userId,
                storeId,
                followDate: new Date()
            });

            res.status(201).json({ message: 'Store followed successfully', follow });
        } catch (error) {
            console.error('Error following store:', error);
            res.status(500).json({ error: 'Failed to follow store' });
        }
    },

    async unfollowStore(req, res) {
        const { userId, storeId } = req.body;
        try {
            const follow = await Follow.findOne({
                where: { userId, storeId }
            });

            if (!follow) {
                return res.status(404).json({ error: 'Not following this store' });
            }

            await follow.destroy();
            res.status(200).json({ message: 'Store unfollowed successfully' });
        } catch (error) {
            console.error('Error unfollowing store:', error);
            res.status(500).json({ error: 'Failed to unfollow store' });
        }
    },

    async getFollowedStores(req, res) {
        const { userId } = req.params;
        try {
            const follows = await Follow.findAll({
                where: { userId },
                include: [{
                    model: Store,
                    attributes: ['id', 'name', 'location', 'description', 'rating']
                }]
            });

            res.status(200).json(follows);
        } catch (error) {
            console.error('Error getting followed stores:', error);
            res.status(500).json({ error: 'Failed to get followed stores' });
        }
    },

    async getStoreFollowers(req, res) {
        const { storeId } = req.params;
        try {
            const followers = await Follow.findAll({
                where: { storeId },
                include: [{
                    model: User,
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            });

            res.status(200).json(followers);
        } catch (error) {
            console.error('Error getting store followers:', error);
            res.status(500).json({ error: 'Failed to get store followers' });
        }
    },

    // Like-related methods
    async likeServiceHandler(req, res) {
        const { userId, serviceId } = req.body;
        try {
            const existingLike = await Like.findOne({
                where: { 
                    userId,
                    serviceId,
                    type: 'service'
                }
            });

            if (existingLike) {
                return res.status(400).json({ error: 'Service already liked' });
            }

            const like = await Like.create({
                userId,
                serviceId,
                type: 'service',
                likeDate: new Date()
            });

            res.status(201).json({ message: 'Service liked successfully', like });
        } catch (error) {
            console.error('Error liking service:', error);
            res.status(500).json({ error: 'Failed to like service' });
        }
    },

    async unlikeServiceHandler(req, res) {
        const { userId, serviceId } = req.body;
        try {
            const like = await Like.findOne({
                where: { 
                    userId,
                    serviceId,
                    type: 'service'
                }
            });

            if (!like) {
                return res.status(404).json({ error: 'Like not found' });
            }

            await like.destroy();
            res.status(200).json({ message: 'Service unliked successfully' });
        } catch (error) {
            console.error('Error unliking service:', error);
            res.status(500).json({ error: 'Failed to unlike service' });
        }
    },

    async getLikedServicesHandler(req, res) {
        const { userId } = req.params;
        try {
            const likes = await Like.findAll({
                where: { 
                    userId,
                    type: 'service'
                },
                include: [{
                    model: Service,
                    attributes: ['id', 'name', 'description', 'price', 'duration'],
                    include: [{
                        model: Store,
                        attributes: ['id', 'name', 'location']
                    }]
                }]
            });

            res.status(200).json(likes);
        } catch (error) {
            console.error('Error getting liked services:', error);
            res.status(500).json({ error: 'Failed to get liked services' });
        }
    },

    async likeOfferHandler(req, res) {
        const { userId, offerId } = req.body;
        try {
            const existingLike = await Like.findOne({
                where: { 
                    userId,
                    offerId,
                    type: 'offer'
                }
            });

            if (existingLike) {
                return res.status(400).json({ error: 'Offer already liked' });
            }

            const like = await Like.create({
                userId,
                offerId,
                type: 'offer',
                likeDate: new Date()
            });

            res.status(201).json({ message: 'Offer liked successfully', like });
        } catch (error) {
            console.error('Error liking offer:', error);
            res.status(500).json({ error: 'Failed to like offer' });
        }
    },

    async unlikeOfferHandler(req, res) {
        const { userId, offerId } = req.body;
        try {
            const like = await Like.findOne({
                where: { 
                    userId,
                    offerId,
                    type: 'offer'
                }
            });

            if (!like) {
                return res.status(404).json({ error: 'Like not found' });
            }

            await like.destroy();
            res.status(200).json({ message: 'Offer unliked successfully' });
        } catch (error) {
            console.error('Error unliking offer:', error);
            res.status(500).json({ error: 'Failed to unlike offer' });
        }
    },

    async getLikedOffersHandler(req, res) {
        const { userId } = req.params;
        try {
            const likes = await Like.findAll({
                where: { 
                    userId,
                    type: 'offer'
                },
                include: [{
                    model: Offer,
                    attributes: ['id', 'name', 'description', 'discount', 'expiration_date'],
                    include: [{
                        model: Service,
                        attributes: ['id', 'name', 'price'],
                        include: [{
                            model: Store,
                            attributes: ['id', 'name', 'location']
                        }]
                    }]
                }]
            });

            res.status(200).json(likes);
        } catch (error) {
            console.error('Error getting liked offers:', error);
            res.status(500).json({ error: 'Failed to get liked offers' });
        }
    },

    // Review-related methods
    async createReview(req, res) {
        const { userId, storeId, rating, comment } = req.body;
        try {
            const review = await Review.create({
                userId,
                storeId,
                rating,
                comment,
                reviewDate: new Date()
            });

            // Update store's average rating
            const storeReviews = await Review.findAll({
                where: { storeId }
            });

            const averageRating = storeReviews.reduce((acc, curr) => acc + curr.rating, 0) / storeReviews.length;

            await Store.update(
                { rating: averageRating },
                { where: { id: storeId } }
            );

            res.status(201).json({ message: 'Review created successfully', review });
        } catch (error) {
            console.error('Error creating review:', error);
            res.status(500).json({ error: 'Failed to create review' });
        }
    },

    async getReviewsByStore(req, res) {
        const { store_id } = req.params;
        try {
            const reviews = await Review.findAll({
                where: { storeId: store_id },
                include: [{
                    model: User,
                    attributes: ['id', 'firstName', 'lastName', 'profileImage']
                }],
                order: [['reviewDate', 'DESC']]
            });

            res.status(200).json(reviews);
        } catch (error) {
            console.error('Error getting store reviews:', error);
            res.status(500).json({ error: 'Failed to get store reviews' });
        }
    },

    async getReviewById(req, res) {
        const { id } = req.params;
        try {
            const review = await Review.findByPk(id, {
                include: [
                    {
                        model: User,
                        attributes: ['id', 'firstName', 'lastName', 'profileImage']
                    },
                    {
                        model: Store,
                        attributes: ['id', 'name', 'location']
                    }
                ]
            });

            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            res.status(200).json(review);
        } catch (error) {
            console.error('Error getting review:', error);
            res.status(500).json({ error: 'Failed to get review' });
        }
    },

    async updateReview(req, res) {
        const { id } = req.params;
        const { rating, comment } = req.body;
        try {
            const review = await Review.findByPk(id);

            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            review.rating = rating || review.rating;
            review.comment = comment || review.comment;
            await review.save();

            // Update store's average rating
            const storeReviews = await Review.findAll({
                where: { storeId: review.storeId }
            });

            const averageRating = storeReviews.reduce((acc, curr) => acc + curr.rating, 0) / storeReviews.length;

            await Store.update(
                { rating: averageRating },
                { where: { id: review.storeId } }
            );

            res.status(200).json({ message: 'Review updated successfully', review });
        } catch (error) {
            console.error('Error updating review:', error);
            res.status(500).json({ error: 'Failed to update review' });
        }
    },

    async deleteReview(req, res) {
        const { id } = req.params;
        try {
            const review = await Review.findByPk(id);

            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }

            const storeId = review.storeId;
            await review.destroy();

            // Update store's average rating after deletion
            const storeReviews = await Review.findAll({
                where: { storeId }
            });

            const averageRating = storeReviews.length > 0
                ? storeReviews.reduce((acc, curr) => acc + curr.rating, 0) / storeReviews.length
                : 0;

            await Store.update(
                { rating: averageRating },
                { where: { id: storeId } }
            );

            res.status(200).json({ message: 'Review deleted successfully' });
        } catch (error) {
            console.error('Error deleting review:', error);
            res.status(500).json({ error: 'Failed to delete review' });
        }
    }
};

module.exports = BookingController;