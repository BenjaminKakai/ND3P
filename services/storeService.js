const { Store, StoreGallery, StoreSubscription, Merchant } = require('../models');
const { Op } = require('sequelize');

class StoreService {
    // Create a new store
    static async createStore(storeData) {
        const { merchant_id, primary_email } = storeData;

        // Check if a store with the same primary email already exists
        const existingStore = await Store.findOne({ where: { primary_email } });
        if (existingStore) {
            throw new Error('A store with this primary email already exists');
        }

        // Check if the merchant exists
        const merchant = await Merchant.findByPk(merchant_id);
        if (!merchant) {
            throw new Error('Merchant not found');
        }

        // Create the store
        const newStore = await Store.create(storeData);
        return newStore;
    }

    // Get all stores
    static async getStores(userId = null) {
        const stores = await Store.findAll();

        if (userId) {
            const followedStores = await Follow.findAll({
                where: { user_id: userId },
                attributes: ['store_id'],
            });

            const followedStoreIds = new Set(followedStores.map(follow => follow.store_id));

            const storesWithFollowStatus = stores.map(store => {
                return {
                    ...store.toJSON(),
                    following: followedStoreIds.has(store.id)
                };
            });

            return storesWithFollowStatus;
        }

        const storesWithNoFollow = stores.map(store => ({
            ...store.toJSON(),
            following: false
        }));

        return storesWithNoFollow;
    }

    // Get a store by ID
    static async getStoreById(storeId, userId = null) {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new Error('Store not found');
        }

        let following = false;

        if (userId) {
            const followedStore = await Follow.findOne({
                where: { user_id: userId, store_id: storeId },
            });

            if (followedStore) {
                following = true;
            }
        }

        return {
            ...store.toJSON(),
            following,
        };
    }

    // Get random stores
    static async getRandomStores(userId = null) {
        const stores = await Store.findAll({
            order: sequelize.random(),
            limit: 21,
        });

        if (userId) {
            const followedStores = await Follow.findAll({
                where: { user_id: userId },
                attributes: ['store_id'],
            });

            const followedStoreIds = new Set(followedStores.map(follow => follow.store_id));

            const storesWithFollowStatus = stores.map(store => ({
                ...store.toJSON(),
                following: followedStoreIds.has(store.id),
            }));

            return storesWithFollowStatus;
        }

        const storesWithNoFollow = stores.map(store => ({
            ...store.toJSON(),
            following: false,
        }));

        return storesWithNoFollow;
    }

    // Update a store
    static async updateStore(storeId, updateData, updatedBy) {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new Error('Store not found');
        }

        const updatedStore = await store.update({
            ...updateData,
            updated_by: updatedBy,
        });

        return updatedStore;
    }

    // Delete a store
    static async deleteStore(storeId) {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new Error('Store not found');
        }

        await store.destroy();
        return { message: 'Store deleted successfully' };
    }

    // Upload an image to the store gallery
    static async uploadImage(storeId, imageUrl) {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new Error('Store not found');
        }

        const existingImages = await StoreGallery.count({
            where: { store_id: storeId },
        });

        if (existingImages >= 15) {
            throw new Error('Store can have a maximum of 15 gallery images');
        }

        const newImage = await StoreGallery.create({
            store_id: storeId,
            image_url: imageUrl,
        });

        return newImage;
    }

    // Get all images in the store gallery
    static async getGallery(storeId) {
        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new Error('Store not found');
        }

        const galleryImages = await StoreGallery.findAll({
            where: { store_id: storeId },
        });

        return galleryImages;
    }
}

module.exports = StoreService;