require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const db = require('./models');
const { authenticateUser } = require('./middlewares/authMiddleware');
const enhancedBookingRoutes = require('./routes/enhancedBookingRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors());

// Add debugging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import routes
const authRoutes = require('./routes/authRoutes');
const storeRoutes = require('./routes/storeRoutes');
const staffRoutes = require('./routes/staffRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const offerRoutes = require('./routes/offerRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const interactionRoutes = require('./routes/interactionRoutes');

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes with authentication
app.use('/api/stores', authenticateUser, storeRoutes);
app.use('/api/staff', authenticateUser, staffRoutes);
app.use('/api/services', authenticateUser, serviceRoutes);
app.use('/api/offers', authenticateUser, offerRoutes);
app.use('/api/bookings', authenticateUser, bookingRoutes);
app.use('/api/interactions', authenticateUser, interactionRoutes);
app.use('/api/enhanced-bookings', authenticateUser, enhancedBookingRoutes(db));

// Test database connection
db.sequelize.authenticate()
    .then(() => console.log('Database connected successfully'))
    .catch((err) => console.log('Database connection error:', err));

// Move 404 handler to after routes
const notFoundHandler = (req, res) => {
    console.log(`404 - Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        message: 'Route not found'
    });
};

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        message: 'Something broke!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// 404 handler - MOVED TO HERE
app.use(notFoundHandler);

// Sync database and start server
db.sequelize.sync()
    .then(() => {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('\nAvailable API endpoints:');
            console.log('  /api/auth');
            console.log('  /api/stores');
            console.log('  /api/staff');
            console.log('  /api/services');
            console.log('  /api/offers');
            console.log('  /api/bookings');
            console.log('  /api/interactions');
            console.log('  /api/enhanced-bookings');
        });
    })
    .catch(err => {
        console.error('Unable to sync database:', err);
    });

module.exports = app;