'use strict';

const { Model, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
  // Define all model classes
  class Booking extends Model {}
  class Payment extends Model {}
  class Chat extends Model {}
  class Message extends Model {}
  class Follow extends Model {}
  class Invoice extends Model {}
  class Review extends Model {}

  // Initialize Booking
  Booking.init({
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
  }, {
    sequelize,
    modelName: 'Booking',
    tableName: 'Bookings',
    timestamps: true,
  });

  // Initialize Payment
  Payment.init({
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
    sequelize,
    modelName: 'Payment',
    tableName: 'Payments',
    timestamps: true,
  });

  // Initialize Chat
  Chat.init({
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
    sequelize,
    modelName: 'Chat',
    tableName: 'Chats',
    timestamps: true,
  });

  // Initialize Message
  Message.init({
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
    sequelize,
    modelName: 'Message',
    tableName: 'Messages',
    timestamps: true,
  });

  // Initialize Follow
  Follow.init({
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
    sequelize,
    modelName: 'Follow',
    tableName: 'Follows',
    timestamps: true,
  });

  // Initialize Invoice
  Invoice.init({
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
    sequelize,
    modelName: 'Invoice',
    tableName: 'Invoices',
    timestamps: true,
  });

  // Initialize Review
  Review.init({
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
    sequelize,
    modelName: 'Review',
    tableName: 'Reviews',
    timestamps: true,
  });

  // Define associations function
  const associate = (models) => {
    // Booking associations
    Booking.belongsTo(models.Offer, { foreignKey: 'offerId' });
    Booking.belongsTo(models.Store, { foreignKey: 'storeId' });
    Booking.belongsTo(models.User, { foreignKey: 'userId' });
    Booking.belongsTo(Payment, { foreignKey: 'paymentId' });

    // Payment associations
    Payment.belongsTo(models.User, { foreignKey: 'user_id' });
    Payment.belongsTo(models.Offer, { foreignKey: 'offer_id' });
    Payment.hasMany(Booking, { foreignKey: 'paymentId' });

    // Chat associations
    Chat.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages' });

    // Message associations
    Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

    // Follow associations
    Follow.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Follow.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });

    // Invoice associations
    Invoice.belongsTo(models.Store, {
      foreignKey: 'store_id',
      onDelete: 'CASCADE',
    });

    // Review associations
    Review.belongsTo(models.Store, {
      foreignKey: 'store_id',
      onDelete: 'CASCADE',
    });
    Review.belongsTo(models.User, {
      foreignKey: 'user_id',
      onDelete: 'SET NULL',
    });
  };

  // Return all models and associate function
  return {
    Booking,
    Payment,
    Chat,
    Message,
    Follow,
    Invoice,
    Review,
    associate
  };
};