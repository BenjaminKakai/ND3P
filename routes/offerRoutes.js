// offerRoutes.js
const express = require('express');
const router = express.Router();

// Import Controller
const offerController = require('../controllers/offerController');

// Offer Routes
router.post('/', offerController.createOffer);           // Changed from '/offers'
router.get('/', offerController.getOffers);             // Changed from '/offers'
router.get('/random', offerController.getRandomOffers); // Changed from '/offers/random'
router.get('/:id', offerController.getOfferById);       // Changed from '/offers/:id'
router.get('/:storeId/store', offerController.getOffersByStore);
router.put('/:id', offerController.updateOffer);        // Changed from '/offers/:id'
router.delete('/:id', offerController.deleteOffer);     // Changed from '/offers/:id'

// Quote Routes (using the same controller)
router.post('/quotes', offerController.createQuote);
router.get('/quotes/:form_response_id', offerController.getQuotesForFormResponse);
router.patch('/quotes/:id/status', offerController.updateQuoteStatus);

module.exports = router;