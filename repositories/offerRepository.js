const { Offer, Service, FormResponse, Quote, sequelize } = require('../models');

class OfferRepository {
  async create(offerData) {
    try {
      const { discount, expiration_date, service_id, description, status, created_by } = offerData;
      const fee = (discount * 0.05).toFixed(2);

      const newOffer = await Offer.create({
        discount,
        expiration_date,
        service_id,
        description,
        status,
        fee,
        created_by
      });

      return newOffer;
    } catch (error) {
      throw new Error(`Error creating offer: ${error.message}`);
    }
  }

  async findAll(includeService = true) {
    try {
      const options = {
        include: includeService ? {
          model: Service,
          attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
        } : undefined
      };

      return await Offer.findAll(options);
    } catch (error) {
      throw new Error(`Error fetching offers: ${error.message}`);
    }
  }

  async findRandom(limit = 12) {
    try {
      return await Offer.findAll({
        order: sequelize.fn('RAND'),
        limit,
        include: {
          model: Service,
          attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
        },
      });
    } catch (error) {
      throw new Error(`Error fetching random offers: ${error.message}`);
    }
  }

  async findByStore(storeId) {
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

      if (!store) {
        throw new Error('Store not found');
      }

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
      throw new Error(`Error fetching offers by store: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const offer = await Offer.findByPk(id, {
        include: {
          model: Service,
          attributes: ['id', 'name', 'price', 'duration', 'image_url', 'category', 'description', 'type'],
        },
      });

      if (!offer) {
        throw new Error('Offer not found');
      }

      return offer;
    } catch (error) {
      throw new Error(`Error fetching offer: ${error.message}`);
    }
  }

  async update(id, offerData) {
    try {
      const offer = await this.findById(id);
      const { discount, expiration_date, service_id, description, status, updated_by } = offerData;
      const fee = (discount * 0.05).toFixed(2);

      const updatedOffer = await offer.update({
        discount,
        expiration_date,
        service_id,
        description,
        status,
        fee,
        updated_by
      });

      return updatedOffer;
    } catch (error) {
      throw new Error(`Error updating offer: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const offer = await this.findById(id);
      await offer.destroy();
      return true;
    } catch (error) {
      throw new Error(`Error deleting offer: ${error.message}`);
    }
  }

  // Quote-related methods
  async createQuote(quoteData) {
    try {
      const { form_response_id, quote_details, status } = quoteData;

      const formResponse = await FormResponse.findByPk(form_response_id);
      if (!formResponse) {
        throw new Error('Form response not found');
      }

      return await Quote.create({
        form_response_id,
        quote_details,
        status,
      });
    } catch (error) {
      throw new Error(`Error creating quote: ${error.message}`);
    }
  }

  async findQuotesByFormResponse(formResponseId) {
    try {
      const quotes = await Quote.findAll({
        where: { form_response_id: formResponseId },
      });

      if (!quotes || quotes.length === 0) {
        throw new Error('No quotes found for this form response');
      }

      return quotes;
    } catch (error) {
      throw new Error(`Error fetching quotes: ${error.message}`);
    }
  }

  async updateQuoteStatus(quoteId, status) {
    try {
      const quote = await Quote.findByPk(quoteId);
      if (!quote) {
        throw new Error('Quote not found');
      }

      quote.status = status;
      await quote.save();
      return quote;
    } catch (error) {
      throw new Error(`Error updating quote status: ${error.message}`);
    }
  }
}

module.exports = new OfferRepository();