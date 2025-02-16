const { Follow, Store, User, ServiceLike, OfferLike, Service, Offer } = require('../models');

// Follow/Unfollow Store Functions
const followStore = async (userId, storeId) => {
    console.log('UserId:', userId);
    console.log('StoreId:', storeId);

    const existingFollow = await Follow.findOne({ where: { user_id: userId, store_id: storeId } });
    if (existingFollow) {
        throw new Error('Already following this store');
    }
    return await Follow.create({ user_id: userId, store_id: storeId });
};

const unfollowStore = async (userId, storeId) => {
    const follow = await Follow.findOne({ where: { user_id: userId, store_id: storeId } });
    if (!follow) {
        throw new Error('Not following this store');
    }
    return await follow.destroy();
};

const getFollowedStores = async (userId) => {
    return await Follow.findAll({
        where: { user_id: userId },
        include: [{ model: Store, as: 'store' }],
    });
};

const getStoreFollowers = async (storeId) => {
    return await Follow.findAll({
        where: { store_id: storeId },
        include: [{ model: User, as: 'user' }],
    });
};

// Like/Unlike Service Functions
const likeService = async (userId, serviceId) => {
    const existingLike = await ServiceLike.findOne({ where: { user_id: userId, service_id: serviceId } });
    if (existingLike) {
        throw new Error('Service already liked');
    }
    return await ServiceLike.create({ user_id: userId, service_id: serviceId });
};

const unlikeService = async (userId, serviceId) => {
    const like = await ServiceLike.findOne({ where: { user_id: userId, service_id: serviceId } });
    if (!like) {
        throw new Error('Service not liked');
    }
    return await like.destroy();
};

// Like/Unlike Offer Functions
const likeOffer = async (userId, offerId) => {
    const existingLike = await OfferLike.findOne({ where: { user_id: userId, offer_id: offerId } });
    if (existingLike) {
        throw new Error('Offer already liked');
    }
    return await OfferLike.create({ user_id: userId, offer_id: offerId });
};

const unlikeOffer = async (userId, offerId) => {
    const like = await OfferLike.findOne({ where: { user_id: userId, offer_id: offerId } });
    if (!like) {
        throw new Error('Offer not liked');
    }
    return await like.destroy();
};

// Get Liked Services and Offers
const getLikedServices = async (userId) => {
    return await ServiceLike.findAll({
        where: { user_id: userId },
        include: [{ model: Service, as: 'service' }],
    });
};

const getLikedOffers = async (userId) => {
    return await OfferLike.findAll({
        where: { user_id: userId },
        include: [{ model: Offer, as: 'offer' }],
    });
};

module.exports = {
    followStore,
    unfollowStore,
    getFollowedStores,
    getStoreFollowers,
    likeService,
    unlikeService,
    likeOffer,
    unlikeOffer,
    getLikedServices,
    getLikedOffers,
};