const { Store, StoreGallery, Follow, Merchant, sequelize } = require('../models');
const { Op } = require('sequelize');

class StoreRepository {
    async createStore(storeData, merchantId, createdById) {
        const existingStore = await Store.findOne({ 
            where: { primary_email: storeData.primary_email } 
        });
        
        if (existingStore) {
            throw new Error('A store with this primary email already exists');
        }

        return await Store.create({
            ...storeData,
            merchant_id: merchantId,
            created_by: createdById
        });
    }

    async getAllStores(userId = null) {
        const stores = await Store.findAll({
            include: [{
                model: Merchant,
                as: 'storeMerchant',
                attributes: ['firstName', 'lastName', 'email']
            }]
        });

        if (!userId) {
            return stores.map(store => ({
                ...store.toJSON(),
                following: false
            }));
        }

        const followedStores = await Follow.findAll({
            where: { user_id: userId },
            attributes: ['store_id']
        });

        const followedStoreIds = new Set(followedStores.map(follow => follow.store_id));

        return stores.map(store => ({
            ...store.toJSON(),
            following: followedStoreIds.has(store.id)
        }));
    }

    async getStoreById(storeId, userId = null) {
        const store = await Store.findByPk(storeId, {
            include: [
                {
                    model: Merchant,
                    as: 'storeMerchant',
                    attributes: ['firstName', 'lastName', 'email']
                },
                {
                    model: Merchant,
                    as: 'creator',
                    attributes: ['firstName', 'lastName']
                },
                {
                    model: Merchant,
                    as: 'updater',
                    attributes: ['firstName', 'lastName']
                },
                {
                    model: StoreGallery
                }
            ]
        });

        if (!store) {
            throw new Error('Store not found');
        }

        if (!userId) {
            return {
                ...store.toJSON(),
                following: false
            };
        }

        const followedStore = await Follow.findOne({
            where: { user_id: userId, store_id: storeId }
        });

        return {
            ...store.toJSON(),
            following: !!followedStore
        };
    }

    async getRandomStores(limit = 21, userId = null) {
        const stores = await Store.findAll({
            order: sequelize.random(),
            limit,
            include: [{
                model: Merchant,
                as: 'storeMerchant',
                attributes: ['firstName', 'lastName', 'email']
            }]
        });

        if (!userId) {
            return stores.map(store => ({
                ...store.toJSON(),
                following: false
            }));
        }

        const followedStores = await Follow.findAll({
            where: { user_id: userId },
            attributes: ['store_id']
        });

        const followedStoreIds = new Set(followedStores.map(follow => follow.store_id));

        return stores.map(store => ({
            ...store.toJSON(),
            following: followedStoreIds.has(store.id)
        }));
    }

    async updateStore(storeId, updateData, updatedById) {
        const store = await Store.findByPk(storeId);
        
        if (!store) {
            throw new Error('Store not found');
        }

        if (updateData.primary_email) {
            const existingStore = await Store.findOne({
                where: {
                    primary_email: updateData.primary_email,
                    id: { [Op.ne]: storeId }
                }
            });

            if (existingStore) {
                throw new Error('A store with this primary email already exists');
            }
        }

        return await store.update({
            ...updateData,
            updated_by: updatedById
        });
    }

    async deleteStore(storeId) {
        const store = await Store.findByPk(storeId);
        
        if (!store) {
            throw new Error('Store not found');
        }

        await store.destroy();
        return true;
    }

    async getStoreGallery(storeId) {
        const store = await Store.findByPk(storeId);
        
        if (!store) {
            throw new Error('Store not found');
        }

        return await StoreGallery.findAll({
            where: { store_id: storeId }
        });
    }

    async addGalleryImage(storeId, imageUrl) {
        const store = await Store.findByPk(storeId);
        
        if (!store) {
            throw new Error('Store not found');
        }

        const existingImages = await StoreGallery.count({
            where: { store_id: storeId }
        });

        if (existingImages >= 15) {
            throw new Error('Store can have a maximum of 15 gallery images');
        }

        return await StoreGallery.create({
            store_id: storeId,
            image_url: imageUrl
        });
    }

    async searchStores(query, userId = null) {
        const stores = await Store.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${query}%` } },
                    { description: { [Op.like]: `%${query}%` } },
                    { location: { [Op.like]: `%${query}%` } }
                ]
            },
            include: [{
                model: Merchant,
                as: 'storeMerchant',
                attributes: ['firstName', 'lastName', 'email']
            }]
        });

        if (!userId) {
            return stores.map(store => ({
                ...store.toJSON(),
                following: false
            }));
        }

        const followedStores = await Follow.findAll({
            where: { user_id: userId },
            attributes: ['store_id']
        });

        const followedStoreIds = new Set(followedStores.map(follow => follow.store_id));

        return stores.map(store => ({
            ...store.toJSON(),
            following: followedStoreIds.has(store.id)
        }));
    }
}

module.exports = new StoreRepository();