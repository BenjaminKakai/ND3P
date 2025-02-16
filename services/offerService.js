'use strict';

const { Offer, Service, Store, Quote, FormResponse, sequelize } = require('../models');

class OfferService {
  static async createOffer(data) {
    try {
      const { discount, expiration_date, service_id, description, status } = data;
      const fee = (discount * 0.05).toFixed(2);

      return await Offer.create({
        discount,
        expiration_date,
        service_id,
        description,
        status,
        fee,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      throw new Error('Error creating offer');
    }
  }

  static async getOffers() {
    try {
      return await Offer.findAll({
        include: {
          model: Service,
          attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
        },
      });
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw new Error('Error fetching offers');
    }
  }

  static async getRandomOffers() {
    try {
      return await Offer.findAll({
        order: sequelize.fn('RAND'),
        limit: 12,
        include: {
          model: Service,
          attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
        },
      });
    } catch (error) {
      console.error('Error fetching random offers:', error);
      throw new Error('Error fetching random offers');
    }
  }

  static async getOffersByStore(storeId) {
    try {
      const store = await Store.findByPk(storeId, {
        include: {
          model: Service,
          include: {
            model: Offer,
            attributes: ['id', 'discount', 'expiration_date', 'description', 'status', 'fee'],
          },
          attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
        },
      });

      if (!store) throw new Error('Store not found');

      return store.Services.flatMap(service =>
        service.Offers.map(offer => ({
          ...offer.toJSON(),
          service: {
            id: service.id,
            name: service.name,
            image_url: service.image_url,
            price: service.price,
            duration: service.duration,
            category: service.category,
            type: service.type,
          },
        }))
      );
    } catch (error) {
      console.error('Error fetching offers by store:', error);
      throw new Error('Error fetching offers by store');
    }
  }

  static async getOfferById(id) {
    try {
      const offer = await Offer.findByPk(id, {
        include: {
          model: Service,
          attributes: ['id', 'name', 'price', 'duration', 'image_url', 'category', 'description', 'type'],
        },
      });

      if (!offer) throw new Error('Offer not found');

      return offer;
    } catch (error) {
      console.error('Error fetching offer:', error);
      throw new Error('Error fetching offer');
    }
  }

  static async updateOffer(id, data) {
    try {
      const offer = await Offer.findByPk(id);
      if (!offer) throw new Error('Offer not found');

      const { discount, expiration_date, service_id, description, status } = data;
      const fee = (discount * 0.05).toFixed(2);

      return await offer.update({
        discount,
        expiration_date,
        service_id,
        description,
        status,
        fee,
      });
    } catch (error) {
      console.error('Error updating offer:', error);
      throw new Error('Error updating offer');
    }
  }

  static async deleteOffer(id) {
    try {
      const offer = await Offer.findByPk(id);
      if (!offer) throw new Error('Offer not found');

      await offer.destroy();
      return { message: 'Offer deleted successfully' };
    } catch (error) {
      console.error('Error deleting offer:', error);
      throw new Error('Error deleting offer');
    }
  }

  static async createQuote(data) {
    try {
      const { form_response_id, quote_details, status } = data;
      const formResponse = await FormResponse.findByPk(form_response_id);

      if (!formResponse) throw new Error('Form response not found');

      return await Quote.create({
        form_response_id,
        quote_details,
        status,
      });
    } catch (error) {
      console.error('Error creating quote:', error);
      throw new Error('Error creating quote');
    }
  }

  static async getQuotesForFormResponse(form_response_id) {
    try {
      const quotes = await Quote.findAll({ where: { form_response_id } });
      if (!quotes.length) throw new Error('No quotes found for this form response');
      return quotes;
    } catch (error) {
      console.error('Error fetching quotes:', error);
      throw new Error('Error fetching quotes');
    }
  }

  static async updateQuoteStatus(id, status) {
    try {
      const quote = await Quote.findByPk(id);
      if (!quote) throw new Error('Quote not found');

      quote.status = status;
      await quote.save();
      return quote;
    } catch (error) {
      console.error('Error updating quote:', error);
      throw new Error('Error updating quote');
    }
  }
}

module.exports = OfferService;
