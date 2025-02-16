const { Offer, Store, Service, FormResponse, sequelize } = require('../models');

exports.createOffer = async (req, res) => {
  try {
    const { discount, expiration_date, service_id, description, status } = req.body;
    const fee = (discount * 0.05).toFixed(2);

    const newOffer = await Offer.create({
      discount,
      expiration_date,
      service_id,
      description,
      status,
      fee,
    });

    return res.status(201).json({ newOffer });
  } catch (err) {
    console.error('Error creating offer:', err);
    return res.status(500).json({ message: 'Error creating offer', error: err.message });
  }
};

exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.findAll({
      include: [{
        model: Service,
        as: 'service', // Add the alias here
        attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
      }],
    });

    return res.status(200).json({ offers });
  } catch (err) {
    console.error('Error fetching offers:', err);
    return res.status(500).json({ message: 'Error fetching offers', error: err.message });
  }
};

exports.getRandomOffers = async (req, res) => {
  try {
    const offers = await Offer.findAll({
      order: sequelize.fn('RAND'),
      limit: 12,
      include: [{
        model: Service,
        as: 'service', // Add the alias here
        attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
      }],
    });

    if (!offers || offers.length === 0) {
      return res.status(404).json({ message: 'No offers found' });
    }

    res.status(200).json(offers);
  } catch (error) {
    console.error('Error fetching random offers:', error);
    return res.status(500).json({ message: 'Error fetching random offers', error: error.message });
  }
};

exports.getOffersByStore = async (req, res) => {
  try {
    const { storeId } = req.params;

    const store = await Store.findByPk(storeId, {
      include: {
        model: Service,
        as: 'services', // Add the alias here
        include: {
          model: Offer,
          as: 'offers', // Add the alias here
          attributes: ['id', 'discount', 'expiration_date', 'description', 'status', 'fee'],
        },
        attributes: ['id', 'name', 'image_url', 'price', 'duration', 'category', 'type'],
      },
    });

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    const offers = store.services.flatMap(service =>
      service.offers.map(offer => ({
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

    return res.status(200).json({ offers });
  } catch (err) {
    console.error('Error fetching offers by store:', err);
    return res.status(500).json({ message: 'Error fetching offers by store', error: err.message });
  }
};

exports.getOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    const offer = await Offer.findByPk(id, {
      include: [{
        model: Service,
        as: 'service', // Add the alias here
        attributes: ['id', 'name', 'price', 'duration', 'image_url', 'category', 'description', 'type'],
      }],
    });

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    return res.status(200).json({ offer });
  } catch (err) {
    console.error('Error fetching offer:', err);
    return res.status(500).json({ message: 'Error fetching offer', error: err.message });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    const { discount, expiration_date, service_id, description, status } = req.body;
    const fee = (discount * 0.05).toFixed(2);

    const updatedOffer = await offer.update({
      discount,
      expiration_date,
      service_id,
      description,
      status,
      fee,
    });

    return res.status(200).json({ message: 'Offer updated successfully', offer: updatedOffer });
  } catch (err) {
    console.error('Error updating offer:', err);
    return res.status(500).json({ message: 'Error updating offer', error: err.message });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByPk(id);

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    await offer.destroy();
    return res.status(200).json({ message: 'Offer deleted successfully' });
  } catch (err) {
    console.error('Error deleting offer:', err);
    return res.status(500).json({ message: 'Error deleting offer', error: err.message });
  }
};

// Quote functions
exports.createQuote = async (req, res) => {
  try {
    const { form_response_id, quote_details, offer_id } = req.body;

    const formResponse = await FormResponse.findByPk(form_response_id);
    if (!formResponse) {
      return res.status(404).json({ message: 'Form response not found' });
    }

    const quote = await Quote.create({
      form_response_id,
      quote_details,
      offer_id,
      status: 'pending'
    });

    return res.status(201).json({ quote });
  } catch (err) {
    console.error('Error creating quote:', err);
    return res.status(500).json({ message: 'Error creating quote', error: err.message });
  }
};

exports.getQuotesForFormResponse = async (req, res) => {
  try {
    const { form_response_id } = req.params;

    const quotes = await Quote.findAll({
      where: { form_response_id },
      include: [{
        model: FormResponse,
        as: 'formResponse'
      }]
    });

    return res.status(200).json({ quotes });
  } catch (err) {
    console.error('Error fetching quotes:', err);
    return res.status(500).json({ message: 'Error fetching quotes', error: err.message });
  }
};

exports.updateQuoteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const quote = await Quote.findByPk(id);
    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await quote.update({ status });

    return res.status(200).json({ 
      message: 'Quote status updated successfully',
      quote 
    });
  } catch (err) {
    console.error('Error updating quote status:', err);
    return res.status(500).json({ message: 'Error updating quote status', error: err.message });
  }
};