'use strict';

const { Service, ServiceForm, Form, FormField, FormResponse } = require('../models');
const { Op } = require('sequelize');

class ServiceService {
  static async createService(data) {
    try {
      const { name, price, duration, image_url, store_id, category, description, type } = data;

      if (!['fixed', 'dynamic'].includes(type)) {
        throw new Error('Invalid service type. Must be "fixed" or "dynamic".');
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

      return newService;
    } catch (error) {
      throw error;
    }
  }

  static async getServices() {
    try {
      return await Service.findAll();
    } catch (error) {
      throw error;
    }
  }

  static async getServiceById(id) {
    try {
      const service = await Service.findByPk(id);
      if (!service) {
        throw new Error('Service not found');
      }
      return service;
    } catch (error) {
      throw error;
    }
  }

  static async updateService(id, data) {
    try {
      const service = await Service.findByPk(id);
      if (!service) {
        throw new Error('Service not found');
      }

      if (data.type && !['fixed', 'dynamic'].includes(data.type)) {
        throw new Error('Invalid service type. Must be "fixed" or "dynamic".');
      }

      const updatedService = await service.update({
        ...data,
        price: data.type === 'dynamic' ? null : data.price || service.price,
        duration: data.type === 'dynamic' ? null : data.duration || service.duration,
      });

      return updatedService;
    } catch (error) {
      throw error;
    }
  }

  static async deleteService(id) {
    try {
      const service = await Service.findByPk(id);
      if (!service) {
        throw new Error('Service not found');
      }

      await service.destroy();
      return { message: 'Service deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  static async getServicesByStoreId(storeId) {
    try {
      return await Service.findAll({ where: { store_id: storeId } });
    } catch (error) {
      throw error;
    }
  }

  static async createServiceForm(service_id, dynamicFields) {
    try {
      if (!service_id || !dynamicFields || dynamicFields.length === 0) {
        throw new Error('Invalid input');
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

      return createdFields;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ServiceService;
