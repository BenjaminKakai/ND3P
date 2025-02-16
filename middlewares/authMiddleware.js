const jwt = require('jsonwebtoken');
const { Merchant } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;
const validApiKey = process.env.API_KEY;

/**
 * Validates API key from request headers
 */
const validateApiKey = (req, res, next) => {
    const apiKey = req.header('api-key');

    if (!apiKey) {
        return res.status(400).json({ message: 'API key is missing' });
    }

    if (apiKey !== validApiKey) {
        return res.status(403).json({ message: 'Forbidden: Invalid API key' });
    }

    next();
};

/**
 * Verifies JWT token without requiring authentication
 * Attaches decoded user to request if token is valid
 */
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.decode(token);
        req.user = decoded;
    } catch (err) {
        console.error('Token decode error:', err);
    }

    next();
};

/**
 * Authenticates user by verifying JWT token
 * Requires valid token to proceed
 */
const authenticateUser = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded;
        next();
    });
};

/**
 * Authenticates merchant by verifying JWT token and checking merchant exists in DB
 */
const authenticateMerchant = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const merchant = await Merchant.findByPk(decoded.id);
        
        if (!merchant) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.user = merchant;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized', error });
    }
};

module.exports = {
    validateApiKey,
    verifyToken,
    authenticateUser,
    authenticateMerchant
};