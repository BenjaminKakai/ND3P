'use strict';

const { Model, DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');


module.exports = (sequelize) => {
    class Offer extends Model {
      static associate(models) {
        // Define associations here
        Offer.belongsTo(models.Service, {
          foreignKey: 'service_id',
          as: 'service',
        });
  
        Offer.hasMany(models.OfferLike, {
          foreignKey: 'offer_id',
          as: 'likes',
        });
  
        Offer.hasMany(models.Quote, {
          foreignKey: 'offer_id',
          as: 'quotes',
        });
      }
    }

    
  Offer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: uuidv4,
        primaryKey: true,
      },
      discount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      expiration_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      fee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get() {
          const discount = this.getDataValue('discount');
          return discount ? discount * 0.05 : 0;
        },
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('active', 'expired', 'paused'),
        defaultValue: 'active',
      },
      service_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Services',
          key: 'id',
        },
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Offer',
      tableName: 'Offers',
      timestamps: true,
    }
  );

  class Quote extends Model {}

  Quote.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      form_response_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quote_details: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
      },
      offer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Offers',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'Quote',
      tableName: 'Quotes',
      timestamps: true,
    }
  );

  class OfferLike extends Model {}

  OfferLike.init(
    {
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
      offer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Offers',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'OfferLike',
      tableName: 'OfferLikes',
      timestamps: true,
    }
  );

  // Define associations
  Offer.associate = (models) => {
    // Offer associations
    Offer.belongsTo(models.Service, {
      foreignKey: 'service_id',
      as: 'service',
    });

    // OfferLike associations
    OfferLike.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    OfferLike.belongsTo(Offer, {
      foreignKey: 'offer_id',
      as: 'offer',
    });

    // Quote associations - reference the FormResponse through Service
    Quote.belongsTo(models.Service.FormResponse, {
      foreignKey: 'form_response_id',
      as: 'formResponse',
    });

    // Add reverse associations
    Offer.hasMany(OfferLike, {
      foreignKey: 'offer_id',
      as: 'likes',
    });

    Offer.hasMany(Quote, {
      foreignKey: 'offer_id',
      as: 'quotes',
    });
  };

  return {
    Offer,
    Quote,
    OfferLike
  };
};