const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: Sequelize.UUIDV4,
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
            unique: true, // Add unique constraint
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

    User.beforeCreate(async (user) => {
        if (user.password) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            user.password = hashedPassword;
        }
    });



    const Social = sequelize.define('Social', {
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
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        },
        platform: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        link: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
    });

    // Hash password before saving the user
    User.beforeCreate(async (user) => {
        if (user.password) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            user.password = hashedPassword;
        }

        // Check if email already exists before creating
        const existingUser = await User.findOne({ where: { email: user.email } });
        if (existingUser) {
            throw new Error('Email is already in use');
        }
    });

    // Check password validity (for login)
    User.prototype.validPassword = async function (password) {
        return bcrypt.compare(password, this.password);
    };

    // Define associations
    User.associate = (models) => {
        // Add user associations here if needed
    };

    Social.associate = (models) => {
        Social.belongsTo(models.Store, {
            foreignKey: 'store_id',
            as: 'store'
        });
    };

    return {
        User,
        Social
    };
};