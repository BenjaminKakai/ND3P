const { Service, Offer, Store, Follow, ServiceForm, Form, FormField, FormResponse } = require('../models');
const { Op } = require('sequelize');

class ServiceRepository {
  async createService(serviceData) {
    const { name, price, duration, image_url, store_id, category, description, type } = serviceData;

    if (!['fixed', 'dynamic'].includes(type)) {
      throw new Error('Invalid service type. Must be "fixed" or "dynamic".');
    }

    return await Service.create({
      name,
      price: type === 'fixed' ? price : null,
      duration: type === 'fixed' ? duration : null,
      image_url,
      store_id,
      category,
      description,
      type,
    });
  }

  async getAllServices() {
    return await Service.findAll();
  }

  async getServiceById(id) {
    return await Service.findByPk(id);
  }

  async searchServices(searchParams, userId = null) {
    const { term, minPrice, maxPrice } = searchParams;
    const whereClause = {};
    const storeWhereClause = {};

    if (term) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${term}%` } },
        { category: { [Op.like]: `%${term}%` } },
        { description: { [Op.like]: `%${term}%` } }
      ];
      
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

    if (userId) {
      const followedStores = await Follow.findAll({
        where: { user_id: userId },
        attributes: ['store_id'],
      });

      const followedStoreIds = new Set(followedStores.map(follow => follow.store_id));
      
      return {
        services,
        stores: stores.map(store => ({
          ...store.toJSON(),
          following: followedStoreIds.has(store.id)
        }))
      };
    }

    return { services, stores };
  }

  async updateService(id, updateData) {
    const service = await this.getServiceById(id);
    if (!service) {
      throw new Error('Service not found');
    }

    const { type } = updateData;
    if (type && !['fixed', 'dynamic'].includes(type)) {
      throw new Error('Invalid service type. Must be "fixed" or "dynamic".');
    }

    return await service.update({
      ...updateData,
      price: type === 'dynamic' ? null : updateData.price || service.price,
      duration: type === 'dynamic' ? null : updateData.duration || service.duration,
    });
  }

  async deleteService(id) {
    const service = await this.getServiceById(id);
    if (!service) {
      throw new Error('Service not found');
    }
    await service.destroy();
    return true;
  }

  async getServicesByStoreId(storeId) {
    return await Service.findAll({
      where: { store_id: storeId }
    });
  }

  // Form related methods
  async createServiceForm(serviceId, dynamicFields) {
    return await ServiceForm.bulkCreate(
      dynamicFields.map(field => ({
        service_id: serviceId,
        field_name: field.field_name,
        field_type: field.field_type,
        required: field.required ? 1 : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    );
  }

  async getServiceForms(serviceId) {
    return await ServiceForm.findAll({
      where: { service_id: serviceId }
    });
  }

  async createForm(formData) {
    const { name, description, service_id } = formData;
    
    const service = await this.getServiceById(service_id);
    if (!service) {
      throw new Error('Service not found');
    }

    const existingForm = await Form.findOne({ where: { service_id } });
    if (existingForm) {
      throw new Error('Service already has an associated form');
    }

    return await Form.create({ name, description, service_id });
  }

  async getFormsByServiceId(serviceId) {
    return await Form.findAll({
      where: { service_id: serviceId },
      include: [{
        model: FormField,
        as: 'fields'
      }]
    });
  }

  async getFormById(formId) {
    return await Form.findByPk(formId, {
      include: [{
        model: FormField,
        as: 'fields'
      }]
    });
  }

  async createFormField(fieldData) {
    return await FormField.create(fieldData);
  }

  async getFormFields(formId) {
    return await FormField.findAll({
      where: { form_id: formId }
    });
  }

  async createFormResponse(responseData) {
    return await FormResponse.create(responseData);
  }

  async getFormResponses(formId) {
    return await FormResponse.findAll({
      where: { form_id: formId }
    });
  }

  async updateFormResponse(id, responseData) {
    const response = await FormResponse.findByPk(id);
    if (!response) {
      throw new Error('Form response not found');
    }
    return await response.update(responseData);
  }

  async deleteFormResponse(id) {
    const response = await FormResponse.findByPk(id);
    if (!response) {
      throw new Error('Form response not found');
    }
    await response.destroy();
    return true;
  }
}

module.exports = new ServiceRepository();