'use strict';

const { Model, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  class Booking extends Model {}

  Booking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
      },
      offerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      paymentId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      paymentUniqueCode: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'cancelled', 'fulfilled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      startTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endTime: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Booking',
      tableName: 'Bookings',
      timestamps: true,
    }
  );

  // Define Chat model
  Booking.Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'Chats',
    timestamps: true,
  });

  // Define Message model
  Booking.Message = sequelize.define('Message', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    chatId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Chats',
        key: 'id',
      },
    },
    senderType: {
      type: DataTypes.ENUM('user', 'storeOwner'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'Messages',
    timestamps: true,
  });

  // Define Follow model
  Booking.Follow = sequelize.define('Follow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Stores',
        key: 'id',
      },
    },
  }, {
    timestamps: true,
    tableName: 'Follows',
  });

  // Define Invoice model
  Booking.Invoice = sequelize.define('Invoice', {
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
    invoice_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    billing_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('unpaid', 'paid'),
      defaultValue: 'unpaid',
    },
    mpesa_transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  }, {
    timestamps: true,
    tableName: 'Invoices',
  });

  // Define Payment model
  Booking.Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    offer_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'successful', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    gateway: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    MerchantRequestID: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    unique_code: {
      type: DataTypes.STRING(8),
      allowNull: false,
    },
  }, {
    tableName: 'Payments',
    timestamps: true,
  });

  // Define Review model
  Booking.Review = sequelize.define('Review', {
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 5,
      },
    },
  }, {
    timestamps: true,
    tableName: 'Reviews',
  });

  // Define all associations
  Booking.associate = (models) => {
    // Booking associations
    Booking.belongsTo(models.Offer, { foreignKey: 'offerId' });
    Booking.belongsTo(models.Store, { foreignKey: 'storeId' });
    Booking.belongsTo(models.User, { foreignKey: 'userId' });

    // Chat associations
    Booking.Chat.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Booking.Chat.hasMany(Booking.Message, { foreignKey: 'chatId', as: 'messages' });

    // Message associations
    Booking.Message.belongsTo(Booking.Chat, { foreignKey: 'chatId', as: 'chat' });

    // Follow associations
    Booking.Follow.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Booking.Follow.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });

    // Invoice associations
    Booking.Invoice.belongsTo(models.Store, {
      foreignKey: 'store_id',
      onDelete: 'CASCADE',
    });

    // Payment associations
    Booking.Payment.belongsTo(models.User, { foreignKey: 'user_id' });
    Booking.Payment.belongsTo(models.Offer, { foreignKey: 'offer_id' });

    // Review associations
    Booking.Review.belongsTo(models.Store, {
      foreignKey: 'store_id',
      onDelete: 'CASCADE',
    });
    Booking.Review.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'SET NULL',
    });
  };

  return Booking;
};