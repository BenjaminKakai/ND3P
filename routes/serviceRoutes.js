const express = require('express');
const router = express.Router();

// Import all controllers from the single serviceController file
const {
    // Service Controllers
    createService,
    getServices,
    searchServices,
    getServiceById,
    getServicesByStoreId,
    updateService,
    deleteService,

    // Service Form Controllers
    createServiceForm,
    getServiceForms,
    getServiceFormById,
    updateServiceForm,
    deleteServiceForm,

    // Form Controllers
    createForm,
    getForms,
    getFormById,
    updateForm,
    deleteForm,
    getFormsByServiceId,

    // Form Field Controllers
    createFormField,
    getFormFields,
    updateFormField,
    deleteFormField,

    // Form Response Controllers
    createFormResponse,
    getFormResponses,
    updateFormResponse,
    deleteFormResponse
} = require('../controllers/serviceController');

// Service Routes - Note: /services prefix is removed as it's handled by app.js
router.post('/', createService);
router.get('/', getServices);
router.get('/search', searchServices);
// Important: specific routes should come before parameterized routes
router.get('/store/:storeId', getServicesByStoreId);
router.get('/:id', getServiceById);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

// Service Form Routes - removed /service prefix
router.post('/forms', createServiceForm);
router.get('/forms', getServiceForms);
router.get('/forms/:id', getServiceFormById);
router.put('/forms/:id', updateServiceForm);
router.delete('/forms/:id', deleteServiceForm);

// General Form Routes
router.post('/general-forms', createForm);
router.get('/general-forms', getForms);
router.get('/general-forms/service/:serviceId', getFormsByServiceId);
router.get('/general-forms/:id', getFormById);
router.put('/general-forms/:id', updateForm);
router.delete('/general-forms/:id', deleteForm);

// Form Fields Routes
router.post('/fields', createFormField);
router.get('/fields/:form_id', getFormFields);
router.put('/fields/:id', updateFormField);
router.delete('/fields/:id', deleteFormField);

// Form Response Routes
router.post('/responses', createFormResponse);
router.get('/responses', getFormResponses);
router.put('/responses/:id', updateFormResponse);
router.delete('/responses/:id', deleteFormResponse);

module.exports = router;