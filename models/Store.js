const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    // Store Model
    const Store = sequelize.define('Store', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        merchant_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Merchants',
                key: 'id',
            },
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        primary_email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },
        phone_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        website_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        logo_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        opening_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        closing_time: {
            type: DataTypes.TIME,
            allowNull: false,
        },
        working_days: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        status: {
            type: DataTypes.ENUM('open', 'closed', 'under_construction'),
            defaultValue: 'closed',
        },
        created_by: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Merchants',
                key: 'id',
            },
        },
        updated_by: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'Merchants',
                key: 'id',
            },
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    }, {
        timestamps: true,
        tableName: 'Stores',
    });

    // StoreGallery Model
    const StoreGallery = sequelize.define('StoreGallery', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Stores',
                key: 'id',
            },
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    }, {
        timestamps: true,
        tableName: 'StoreGallery',
    });

    // StoreSubscription Model
    const StoreSubscription = sequelize.define('StoreSubscription', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        store_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Stores',
                key: 'id',
            },
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        next_billing_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        is_trial: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'canceled'),
            defaultValue: 'active',
        },
    }, {
        timestamps: true,
        tableName: 'StoreSubscriptions',
    });

    // Merchant Model
    const Merchant = sequelize.define('Merchant', {
        id: {
            type: DataTypes.UUID,
            defaultValue: uuidv4,
            primaryKey: true,
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    });

    // Category Model
    const Category = sequelize.define('Category', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        image_url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    });

    // Merchant Hooks
    Merchant.beforeCreate(async (merchant) => {
        const existingMerchant = await Merchant.findOne({ where: { email: merchant.email } });
        if (existingMerchant) {
            throw new Error('Merchant with this email already exists');
        }

        const existingPhone = await Merchant.findOne({ where: { phoneNumber: merchant.phoneNumber } });
        if (existingPhone) {
            throw new Error('Merchant with this phone number already exists');
        }

        if (merchant.password) {
            const hashedPassword = await bcrypt.hash(merchant.password, 10);
            merchant.password = hashedPassword;
        }
    });

    // Associations
    const defineAssociations = (models) => {
        // Store Associations
        Store.belongsTo(models.Merchant, {
            foreignKey: 'merchant_id',
            as: 'storeMerchant',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        Store.belongsTo(models.Merchant, {
            foreignKey: 'created_by',
            as: 'creator',
            onDelete: 'SET NULL',
        });

        Store.belongsTo(models.Merchant, {
            foreignKey: 'updated_by',
            as: 'updater',
            onDelete: 'SET NULL',
        });

        Store.hasMany(models.Social, {
            foreignKey: 'store_id',
            onDelete: 'CASCADE',
        });

        Store.hasMany(models.StoreGallery, {
            foreignKey: 'store_id',
            onDelete: 'CASCADE',
        });

        Store.hasMany(models.Review, {
            foreignKey: 'store_id',
            onDelete: 'SET NULL',
        });

        // StoreGallery Associations
        StoreGallery.belongsTo(models.Store, {
            foreignKey: 'store_id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        // StoreSubscription Associations
        StoreSubscription.belongsTo(models.Store, {
            foreignKey: 'store_id',
            as: 'store',
            onDelete: 'CASCADE',
        });

        // Merchant Associations
        Merchant.hasMany(models.Store, {
            foreignKey: 'merchant_id',
            onDelete: 'CASCADE',
        });
    };

    // Password validation for Merchant
    Merchant.prototype.validPassword = async function (password) {
        return bcrypt.compare(password, this.password);
    };

    return {
        Store,
        StoreGallery,
        StoreSubscription,
        Merchant,
        Category,
        defineAssociations
    };
};