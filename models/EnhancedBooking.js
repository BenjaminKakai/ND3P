// models/EnhancedBooking.js
module.exports = (sequelize, DataTypes) => {
    const Branch = sequelize.define('Branch', {
        name: DataTypes.STRING,
        address: DataTypes.STRING,
        latitude: DataTypes.FLOAT,
        longitude: DataTypes.FLOAT,
        status: {
            type: DataTypes.ENUM('available', 'unavailable'),
            defaultValue: 'available'
        },
        contactPhone: DataTypes.STRING,
        contactEmail: DataTypes.STRING
    });

    const WorkingHours = sequelize.define('WorkingHours', {
        day: DataTypes.STRING,
        openTime: DataTypes.STRING,
        closeTime: DataTypes.STRING
    });

    const TimeSlot = sequelize.define('TimeSlot', {
        startTime: DataTypes.DATE,
        endTime: DataTypes.DATE,
        status: {
            type: DataTypes.ENUM('available', 'booked'),
            defaultValue: 'available'
        }
    });

    const EnhancedStaff = sequelize.define('EnhancedStaff', {
        status: {
            type: DataTypes.ENUM('available', 'unavailable'),
            defaultValue: 'available'
        },
        specializations: DataTypes.JSON // Array of strings
    });

    const StaffUnavailability = sequelize.define('StaffUnavailability', {
        startTime: DataTypes.DATE,
        endTime: DataTypes.DATE,
        reason: DataTypes.STRING
    });

    const EnhancedBooking = sequelize.define('EnhancedBooking', {
        serviceDuration: DataTypes.INTEGER,
        status: {
            type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
            defaultValue: 'pending'
        },
        paymentAmount: DataTypes.DECIMAL(10, 2),
        bookingFee: DataTypes.DECIMAL(10, 2),
        paymentModel: {
            type: DataTypes.ENUM('fixed', 'quote'),
            defaultValue: 'fixed'
        },
        paymentStatus: {
            type: DataTypes.ENUM('pending', 'paid', 'refunded'),
            defaultValue: 'pending'
        }
    });

    // Define associations
    const associate = (models) => {
        Branch.hasMany(WorkingHours);
        WorkingHours.belongsTo(Branch);

        Branch.hasMany(TimeSlot);
        TimeSlot.belongsTo(Branch);

        Branch.hasMany(EnhancedStaff);
        EnhancedStaff.belongsTo(Branch);

        EnhancedStaff.hasMany(StaffUnavailability);
        StaffUnavailability.belongsTo(EnhancedStaff);

        EnhancedStaff.belongsTo(models.Staff);

        EnhancedBooking.belongsTo(models.Booking);
        EnhancedBooking.belongsTo(Branch);
        EnhancedBooking.belongsTo(TimeSlot);
        EnhancedBooking.belongsTo(EnhancedStaff);
    };

    return {
        Branch,
        WorkingHours,
        TimeSlot,
        EnhancedStaff,
        StaffUnavailability,
        EnhancedBooking,
        associate
    };
};