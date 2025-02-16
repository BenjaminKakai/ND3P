const express = require('express');
const router = express.Router();

const {
    registerMerchant,
    loginMerchant,
    requestPasswordReset,
    resetPassword,
    getMerchantProfile,
    createMerchant,
    searchMerchants,
    createCategory,
    getCategories,
    getRandomCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    uploadImage,
    getGallery,
    createStore
} = require('../controllers/storeController');

// Store Creation Route
router.post('/', createStore);

// Merchant Authentication Routes
router.post('/merchants/register', registerMerchant);
router.post('/merchants/login', loginMerchant);
router.post('/merchants/request-password-reset', requestPasswordReset);
router.post('/merchants/reset-password', resetPassword);

// Merchant Management Routes
router.get('/merchants/profile/:merchantId', getMerchantProfile);
router.post('/merchants/create', createMerchant);
router.get('/merchants/search', searchMerchants);

// Category Routes
router.post('/categories', createCategory);
router.get('/categories', getCategories);
router.get('/categories/random', getRandomCategories);
router.get('/categories/:id', getCategoryById);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Store Gallery Routes
router.post('/:storeId/gallery', uploadImage);
router.get('/:storeId/gallery', getGallery);

// Store Management Routes
router.get('/', (req, res) => {
    // GET all stores
    res.json({ message: 'Get all stores' });
});

router.get('/:id', (req, res) => {
    // GET specific store
    res.json({ message: `Get store ${req.params.id}` });
});

router.put('/:id', (req, res) => {
    // UPDATE store
    res.json({ message: `Update store ${req.params.id}` });
});

router.delete('/:id', (req, res) => {
    // DELETE store
    res.json({ message: `Delete store ${req.params.id}` });
});

module.exports = router;