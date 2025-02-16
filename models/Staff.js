'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
    // Staff Model
    const Staff = sequelize.define('Staff', {
        id: {
            type: DataTypes.UUID,
            defaultValue: uuidv4,
            primaryKey: true,
        },
        storeId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active',
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        sequelize,
        modelName: 'Staff',
    });

    // StaffService Junction Model
    const StaffService = sequelize.define('StaffService', {
        staffId: {
            type: DataTypes.UUID,
            references: {
                model: 'Staff',
                key: 'id',
            },
        },
        serviceId: {
            type: DataTypes.UUID,
            references: {
                model: 'Services',
                key: 'id',
            },
        },
    }, {
        tableName: 'StaffServices',
        timestamps: false,
    });

    Staff.associate = (models) => {
        // Many-to-Many relationship with Service through StaffService
        Staff.belongsToMany(models.Service, {
            through: models.StaffService,
            foreignKey: 'staffId',
            otherKey: 'serviceId',
            as: 'services',
        });

        Staff.hasMany(models.Service, {
            foreignKey: 'staffId',
            as: 'Services',
        });

        // Staff belongs to a Store (one-to-many)
        Staff.belongsTo(models.Store, {
            foreignKey: 'storeId',
            as: 'store',
        });
    };

    return {
        Staff,
        StaffService
    };
};