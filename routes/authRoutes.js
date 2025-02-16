const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// User Authentication Routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected Routes
router.get('/protected', verifyToken, (req, res) => {
    res.status(200).json({
        message: 'You have access to this protected route',
        user: req.user
    });
});

// Social Media Routes (using the same authController since that's where your social methods are)
router.post('/socials', verifyToken, authController.createSocial);
router.get('/socials/:storeId', authController.getSocialsByStore);
router.put('/socials/:id', verifyToken, authController.updateSocial);
router.delete('/socials/:id', verifyToken, authController.deleteSocial);

module.exports = router;