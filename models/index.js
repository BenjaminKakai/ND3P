const { Sequelize, DataTypes } = require('sequelize');
const UserModel = require('./User');
const StoreModel = require('./Store');
const StaffModel = require('./Staff');
const ServiceModel = require('./Service');
const OfferModel = require('./Offer');
const BookingModel = require('./Booking');
const EnhancedBookingModel = require('./EnhancedBooking');

// Initialize Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mariadb',
        logging: false,
        dialectOptions: {
            timezone: 'Etc/GMT-3',
        }
    }
);

// Initialize all models first
const db = {};

// Initialize models and store them in db object
const userModels = UserModel(sequelize, DataTypes);
db.User = userModels.User;
db.Social = userModels.Social;

const storeModel = StoreModel(sequelize, DataTypes);
db.Store = storeModel.Store;

const staffModels = StaffModel(sequelize, DataTypes);
db.Staff = staffModels.Staff;
db.StaffService = staffModels.StaffService;

db.Service = ServiceModel(sequelize, DataTypes);

const offerModels = OfferModel(sequelize, DataTypes);
db.Offer = offerModels.Offer;
db.Quote = offerModels.Quote;
db.OfferLike = offerModels.OfferLike;

// Initialize booking-related models
const bookingModels = BookingModel(sequelize, DataTypes);
db.Booking = bookingModels.Booking;
db.Payment = bookingModels.Payment;
db.Chat = bookingModels.Chat;
db.Message = bookingModels.Message;
db.Follow = bookingModels.Follow;
db.Invoice = bookingModels.Invoice;
db.Review = bookingModels.Review;

// Initialize enhanced booking-related models
const enhancedBookingModels = EnhancedBookingModel(sequelize, DataTypes);
db.Branch = enhancedBookingModels.Branch;
db.WorkingHours = enhancedBookingModels.WorkingHours;
db.TimeSlot = enhancedBookingModels.TimeSlot;
db.EnhancedStaff = enhancedBookingModels.EnhancedStaff;
db.StaffUnavailability = enhancedBookingModels.StaffUnavailability;
db.EnhancedBooking = enhancedBookingModels.EnhancedBooking;

// Add sequelize instance to db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Run associations after all models are properly initialized
Object.keys(db).forEach(modelName => {
    if (db[modelName] && typeof db[modelName].associate === 'function') {
        db[modelName].associate(db);
    }
});

// Run the booking models associations
bookingModels.associate(db);

module.exports = db;