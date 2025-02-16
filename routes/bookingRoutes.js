const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');

// Booking Core Routes
router.post('/', BookingController.create);
router.get('/', BookingController.getAll);
router.get('/:id', BookingController.getById);
router.put('/:id', BookingController.update);
router.delete('/:id', BookingController.delete);

// Booking Query Routes
router.get('/offer/:offerId', BookingController.getByOffer);
router.get('/store/:storeId', BookingController.getByStore);
router.get('/user/:userId', BookingController.getByUser);
router.get('/store/:storeId/analytics', BookingController.getStoreAnalytics);
router.get('/available-slots', BookingController.getAvailableSlots);
router.get('/booking-times', BookingController.getBookingTimes);

// Booking Status Routes
router.post('/validate', BookingController.validateAndFulfill);
router.post('/fulfill', BookingController.markAsFulfilled);

// Payment Routes (your existing routes)
router.post('/transactions/subscribe', BookingController.createPayment);
router.post('/transactions/pay', BookingController.createPayment);
router.post('/transactions/mpesa-callback', BookingController.handlePaymentCallback);
router.post('/payments', BookingController.createPayment);
router.post('/payments/callback', BookingController.handlePaymentCallback);
router.get('/payments', BookingController.getAllPayments);
router.get('/payments/status/:status', BookingController.getPaymentsByStatus);
router.get('/payments/user/:user_id', BookingController.getPaymentsByUser);
router.get('/payments/offer/:offer_id', BookingController.getPaymentsByOffer);
router.get('/payments/store/:store_id', BookingController.getPaymentsByStore);

module.exports = router;