const { Service, Offer, Store, Follow, ServiceForm, Form, FormField, FormResponse } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

exports.createService = async (req, res) => {
  try {
    const { name, price, duration, image_url, store_id, category, description, type } = req.body;

    if (!['fixed', 'dynamic'].includes(type)) {
      return res.status(400).json({ message: 'Invalid service type. Must be "fixed" or "dynamic".' });
    }

    const newService = await Service.create({
      name,
      price: type === 'fixed' ? price : null,
      duration: type === 'fixed' ? duration : null,
      image_url,
      store_id,
      category,
      description,
      type,
    });

    return res.status(201).json({ newService });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error creating service' });
  }
};


exports.getServices = async (req, res) => {
    try {
      const services = await Service.findAll({
        attributes: [
          'id', 
          'name', 
          'price', 
          'duration', 
          'image_url', 
          'store_id', 
          'category', 
          'description', 
          'type',
          'createdAt',
          'updatedAt'
        ]
      });
      return res.status(200).json({ services });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error fetching services' });
    }
  };

exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    return res.status(200).json({ service });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching service' });
  }
};

exports.searchServices = async (req, res) => {
  try {
    const { term, minPrice, maxPrice } = req.query;

    const whereClause = {};
    const storeWhereClause = {};

    if (term) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${term}%` } },
        { category: { [Op.like]: `%${term}%` } },
        { description: { [Op.like]: `%${term}%` } }
      ];
      if (term.toLowerCase().includes('sale') || term.toLowerCase().includes('offer')) {
        whereClause[Op.or] = [
          ...(whereClause[Op.or] || []),
          { name: { [Op.like]: '%sale%' } },
          { description: { [Op.like]: '%offer%' } }
        ];
      }
    }

    if (term) {
      storeWhereClause[Op.or] = [
        { name: { [Op.like]: `%${term}%` } },
        { location: { [Op.like]: `%${term}%` } },
        { description: { [Op.like]: `%${term}%` } }
      ];
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    const services = await Service.findAll({
      where: whereClause,
      include: [{
        model: Offer,
        required: false
      }]
    });

    const stores = await Store.findAll({
      where: storeWhereClause
    });

    let userId = null;
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded?.userId;
      } catch (err) {
        console.error('Error verifying token:', err);
        userId = null;
      }
    }

    let followedStoreIds = new Set();
    if (userId) {
      const followedStores = await Follow.findAll({
        where: { user_id: userId },
        attributes: ['store_id'],
      });

      followedStoreIds = new Set(followedStores.map(follow => follow.store_id));
    }

    const storesWithFollowStatus = stores.map(store => {
      const isFollowing = followedStoreIds.has(store.id);
      return {
        ...store.toJSON(),
        following: isFollowing
      };
    });

    if (services.length === 0 && storesWithFollowStatus.length === 0) {
      return res.status(200).json({ message: 'No services or stores found matching your criteria' });
    }

    return res.status(200).json({ services, stores: storesWithFollowStatus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error searching services and stores' });
  }
};

exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (type && !['fixed', 'dynamic'].includes(type)) {
      return res.status(400).json({ message: 'Invalid service type. Must be "fixed" or "dynamic".' });
    }

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const updatedService = await service.update({
      ...req.body,
      price: type === 'dynamic' ? null : req.body.price || service.price,
      duration: type === 'dynamic' ? null : req.body.duration || service.duration,
    });

    return res.status(200).json({ message: 'Service updated successfully', service: updatedService });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating service' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    await service.destroy();
    return res.status(200).json({ message: 'Service deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error deleting service' });
  }
};

exports.getServicesByStoreId = async (req, res) => {
  try {
    const { storeId } = req.params;
    const services = await Service.findAll({
      where: {
        store_id: storeId,
      },
    });

    if (services.length === 0) {
      return res.status(404).json({ message: 'No services found for this store' });
    }

    return res.status(200).json({ services });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching services for this store' });
  }
};

exports.createServiceForm = async (req, res) => {
  try {
    const { service_id, dynamicFields } = req.body;

    if (!service_id || !dynamicFields || dynamicFields.length === 0) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const createdFields = await ServiceForm.bulkCreate(
      dynamicFields.map(field => ({
        service_id,
        field_name: field.field_name,
        field_type: field.field_type,
        required: field.required ? 1 : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );

    return res.status(201).json({ form: createdFields });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating service form' });
  }
};

exports.getServiceForms = async (req, res) => {
  try {
    const { service_id } = req.query;

    if (!service_id) {
      return res.status(400).json({ message: 'Service ID is required' });
    }

    const forms = await ServiceForm.findAll({
      where: { service_id },
    });

    return res.status(200).json({ forms });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching service forms' });
  }
};

exports.getServiceFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await ServiceForm.findByPk(id);

    if (!form) {
      return res.status(404).json({ message: 'Service form not found' });
    }

    return res.status(200).json({ form });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching service form' });
  }
};

exports.updateServiceForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await ServiceForm.findByPk(id);

    if (!form) {
      return res.status(404).json({ message: 'Service form not found' });
    }

    const updatedForm = await form.update(req.body);
    return res.status(200).json({ form: updatedForm });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating service form' });
  }
};

exports.deleteServiceForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await ServiceForm.findByPk(id);

    if (!form) {
      return res.status(404).json({ message: 'Service form not found' });
    }

    await form.destroy();
    return res.status(200).json({ message: 'Service form deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting service form' });
  }
};

exports.createForm = async (req, res) => {
  try {
    const { name, description, service_id } = req.body;
    const service = await Service.findByPk(service_id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const existingForm = await Form.findOne({ where: { service_id } });
    if (existingForm) {
      return res.status(400).json({ message: 'Service already has an associated form' });
    }
    const form = await Form.create({ name, description, service_id });
    return res.status(201).json({ form });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating form' });
  }
};

exports.getForms = async (req, res) => {
  try {
    const forms = await Form.findAll({
      include: [
        {
          model: FormField,
          as: 'fields',
        },
        {
          model: Service,
          as: 'service',
        },
      ],
    });

    return res.status(200).json({ forms });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching forms' });
  }
};

exports.getFormsByServiceId = async (req, res) => {
  try {
    const { serviceId } = req.params;

    const forms = await Form.findAll({
      where: {
        service_id: serviceId,
      },
      include: [
        {
          model: FormField,
          as: 'fields',
        },
      ],
    });

    if (forms.length === 0) {
      return res.status(404).json({ message: 'No forms found for this service' });
    }

    return res.status(200).json({ forms });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching forms by service ID' });
  }
};

exports.getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findByPk(id, {
      include: [
        {
          model: FormField,
          as: 'fields',
        },
      ],
    });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    return res.status(200).json({ form });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching form' });
  }
};

exports.updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findByPk(id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const updatedForm = await form.update(req.body);
    return res.status(200).json({ form: updatedForm });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating form' });
  }
};

exports.deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await Form.findByPk(id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    await form.destroy();
    return res.status(200).json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting form' });
  }
};

exports.createFormField = async (req, res) => {
  try {
    const { form_id, field_name, field_type, required } = req.body;
    const field = await FormField.create({ form_id, field_name, field_type, required });
    return res.status(201).json({ field });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating form field' });
  }
};

exports.getFormFields = async (req, res) => {
  try {
    const { form_id } = req.params;
    const fields = await FormField.findAll({ where: { form_id } });
    return res.status(200).json({ fields });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching form fields' });
  }
};

exports.updateFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await FormField.findByPk(id);

    if (!field) {
      return res.status(404).json({ message: 'Form field not found' });
    }

    const updatedField = await field.update(req.body);
    return res.status(200).json({ field: updatedField });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating form field' });
  }
};

exports.deleteFormField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = await FormField.findByPk(id);

    if (!field) {
      return res.status(404).json({ message: 'Form field not found' });
    }

    await field.destroy();
    return res.status(200).json({ message: 'Form field deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting form field' });
  }
};

exports.createFormResponse = async (req, res) => {
  try {
    const { form_id, response_data } = req.body;
    const response = await FormResponse.create({ form_id, response_data });
    return res.status(201).json({ response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error creating form response' });
  }
};

exports.getFormResponses = async (req, res) => {
  try {
    const { form_id } = req.params;
    const responses = await FormResponse.findAll({ where: { form_id } });
    return res.status(200).json({ responses });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error fetching form responses' });
  }
};

exports.updateFormResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { response_data } = req.body;

    const response = await FormResponse.findByPk(id);

    if (!response) {
      return res.status(404).json({ message: 'Form response not found' });
    }

    await response.update({ response_data });

    return res.status(200).json({ message: 'Form response updated successfully', response });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error updating form response' });
  }
};

exports.deleteFormResponse = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await FormResponse.findByPk(id);

    if (!response) {
      return res.status(404).json({ message: 'Form response not found' });
    }

    await response.destroy();
    return res.status(200).json({ message: 'Form response deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error deleting form response' });
  }
};