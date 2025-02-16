const express = require('express');
const StaffController = require('../controllers/staffController');
const router = express.Router();

// Base routes - removed '/staff' prefix since app.js handles it
router.post('/', StaffController.create);
router.get('/', StaffController.getAll);
router.get('/:id', StaffController.getStaffById);
router.put('/:id', StaffController.update);
router.delete('/:id', StaffController.delete);

// Service assignment routes
router.post('/assign-service', StaffController.assignService);
router.post('/unassign-service', StaffController.unassignService);

// Specific routes should come before parameterized routes
router.get('/store/:storeId', StaffController.getStaffByStore);

// Staff-related routes
router.get('/:staffId/services', StaffController.getServicesByStaffId);
router.get('/:staffId/bookings', StaffController.getBookingsByStaffId);

module.exports = router;