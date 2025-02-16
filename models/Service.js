'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Service = sequelize.define('Service', {
    id: {
      type: DataTypes.UUID,
      defaultValue: uuidv4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: true, // For dynamic services, price can be null
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true, // Optional for dynamic services
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    store_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Stores',
        key: 'id',
      },
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('fixed', 'dynamic'),
      allowNull: false,
      defaultValue: 'fixed',
    },
  }, {
    tableName: 'Services',
    timestamps: true,
    paranoid: true,
    indexes: [],
  });

  // Define all the related models on Service
  Service.Form = sequelize.define('Form', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  }, {
    tableName: 'Forms',
    timestamps: true,
  });

  Service.FormField = sequelize.define('FormField', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    form_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Forms',
        key: 'id',
      },
    },
    field_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    field_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'FormFields',
    timestamps: true,
  });

  Service.FormResponse = sequelize.define('FormResponse', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    form_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Forms',
        key: 'id',
      },
    },
    response_data: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  }, {
    tableName: 'FormResponses',
    timestamps: true,
  });

  Service.ServiceForm = sequelize.define('ServiceForm', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Services',
        key: 'id',
      },
    },
    field_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    field_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    tableName: 'ServiceForms',
    timestamps: true,
  });

  Service.ServiceLike = sequelize.define('ServiceLike', {
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
    service_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Services',
        key: 'id',
      },
    },
  }, {
    timestamps: true,
    tableName: 'ServiceLikes',
  });

  // Define all associations
  Service.associate = (models) => {
    // Service associations
    Service.belongsToMany(models.Staff, {
      through: models.StaffService,
      foreignKey: 'serviceId',
      otherKey: 'staffId',
      as: 'staff',
    });

    Service.belongsTo(models.Store, {
      foreignKey: 'store_id',
      onDelete: 'CASCADE',
      as: 'store',
    });

    // Form associations
    Service.Form.hasMany(Service.FormField, {
      foreignKey: 'form_id',
      as: 'fields',
    });

    Service.Form.hasMany(Service.FormResponse, {
      foreignKey: 'form_id',
      as: 'responses',
    });

    Service.Form.belongsTo(Service, {
      foreignKey: 'service_id',
      as: 'service',
    });

    // FormField associations
    Service.FormField.belongsTo(Service.Form, {
      foreignKey: 'form_id',
      as: 'form',
    });

    // FormResponse associations
    Service.FormResponse.belongsTo(Service.Form, {
      foreignKey: 'form_id',
      as: 'form',
    });

    // ServiceForm associations
    Service.ServiceForm.belongsTo(Service, {
      foreignKey: 'service_id',
      as: 'service',
    });

    // ServiceLike associations
    Service.ServiceLike.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });

    Service.ServiceLike.belongsTo(Service, {
      foreignKey: 'service_id',
      as: 'service',
    });
  };

  return Service;
};