const express = require('express');
const router = express.Router();

// Import the consolidated controller
const {
    // Booking core methods
    create,
    getAll,
    getById,
    update,
    delete: deleteBooking,
    validateAndFulfill,
    getByOffer,
    getByStore,
    getByUser,
    markAsFulfilled,
    getStoreAnalytics,
    getAvailableSlots,
    getBookingTimes,

    // Payment methods
    createPayment,
    handlePaymentCallback,
    getAllPayments,
    getPaymentsByStatus,
    getPaymentsByUser,
    getPaymentsByOffer,
    getPaymentsByStore,

    // Follow methods
    followStore,
    unfollowStore,
    getFollowedStores,
    getStoreFollowers,

    // Like methods
    likeServiceHandler,
    unlikeServiceHandler,
    getLikedServicesHandler,
    likeOfferHandler,
    unlikeOfferHandler,
    getLikedOffersHandler,

    // Review methods
    createReview,
    getReviewsByStore,
    getReviewById,
    updateReview,
    deleteReview
} = require('../controllers/bookingController');

const { authenticateUser } = require('../middlewares/authMiddleware');
const { fileUploadConfig } = require('../config/auth');
const { uploadImage, uploadDocument } = fileUploadConfig;

// Booking core routes
router.post('/bookings', create);
router.get('/bookings', getAll);
router.get('/bookings/:id', getById);
router.put('/bookings/:id', update);
router.delete('/bookings/:id', deleteBooking);
router.post('/bookings/validate', validateAndFulfill);
router.get('/bookings/offer/:offerId', getByOffer);
router.get('/bookings/store/:storeId', getByStore);
router.get('/bookings/user/:userId', getByUser);
router.post('/bookings/fulfill', markAsFulfilled);
router.get('/bookings/analytics/:storeId', getStoreAnalytics);
router.get('/bookings/available-slots', getAvailableSlots);
router.get('/bookings/times', getBookingTimes);

// Payment routes
router.post('/payments', createPayment);
router.post('/payments/callback', handlePaymentCallback);
router.get('/payments', getAllPayments);
router.get('/payments/status/:status', getPaymentsByStatus);
router.get('/payments/user/:user_id', getPaymentsByUser);
router.get('/payments/offer/:offer_id', getPaymentsByOffer);
router.get('/payments/store/:store_id', getPaymentsByStore);

// Follow routes
router.post('/follow', authenticateUser, followStore);
router.post('/unfollow', unfollowStore);
router.get('/user/:userId/followed-stores', getFollowedStores);
router.get('/store/:storeId/followers', getStoreFollowers);

// Like routes
router.post('/service/like', likeServiceHandler);
router.post('/service/unlike', unlikeServiceHandler);
router.get('/user/:userId/liked-services', getLikedServicesHandler);
router.post('/offer/like', likeOfferHandler);
router.post('/offer/unlike', unlikeOfferHandler);
router.get('/user/:userId/liked-offers', getLikedOffersHandler);

// Review routes
router.post('/reviews', createReview);
router.get('/stores/:store_id/reviews', getReviewsByStore);
router.get('/reviews/:id', getReviewById);
router.put('/reviews/:id', updateReview);
router.delete('/reviews/:id', deleteReview);

// File upload routes
router.post('/files/upload-image', uploadImage.single('file'), (req, res) => {
    try {
        res.status(200).json({
            message: 'Image uploaded successfully',
            url: req.file.path,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/files/upload-document', uploadDocument.single('file'), (req, res) => {
    try {
        res.status(200).json({
            message: 'Document uploaded successfully',
            url: req.file.path,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;