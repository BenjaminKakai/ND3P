const { Sequelize, DataTypes } = require('sequelize');
const UserModel = require('./User');
const StoreModel = require('./Store');
const StaffModel = require('./Staff');
const ServiceModel = require('./Service');
const OfferModel = require('./Offer');
const BookingModel = require('./Booking');

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

// Initialize models in correct order
const userModels = UserModel(sequelize, DataTypes);
const { User, Social } = userModels;
const { Store } = StoreModel(sequelize, DataTypes);
const { Staff, StaffService } = StaffModel(sequelize, DataTypes);
const Service = ServiceModel(sequelize, DataTypes);
const { Offer, Quote, OfferLike } = OfferModel(sequelize, DataTypes);
const { Booking } = BookingModel(sequelize, DataTypes);

// Store all models in an object
const db = {
    User,
    Social,
    Store,
    Staff,
    Service,
    Offer,
    Quote,
    OfferLike,
    Booking,
    StaffService
};

// Add sequelize instance to db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Run associations after all models are properly initialized
Object.keys(db).forEach(modelName => {
    if (db[modelName] && db[modelName].associate) {
        db[modelName].associate(db);
    }
});

module.exports = db;