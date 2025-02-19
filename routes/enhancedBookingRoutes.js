const express = require('express');
const router = express.Router();
const EnhancedBookingRepository = require('../repositories/EnhancedBookingRepository');
const EnhancedBookingController = require('../controllers/EnhancedBookingController');

module.exports = (models) => {
    const repository = new EnhancedBookingRepository(models);
    const controller = new EnhancedBookingController(repository);

    router.post('/branches', controller.createBranch.bind(controller));
    router.post('/timeslots/generate', controller.generateTimeSlots.bind(controller));
    router.post('/enhanced-bookings', controller.createEnhancedBooking.bind(controller));

    return router;
};