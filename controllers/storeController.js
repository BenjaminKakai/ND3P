const { Category, Merchant, Store, Follow, StoreGallery, sequelize } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ejs = require('ejs');
const fs = require('fs');
const { sendEmail } = require('../utils/emailUtil');
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET;

// Category Controllers
const createCategory = async (req, res) => {
    try {
        const { name, description, image_url } = req.body;
        const newCategory = await Category.create({ name, description, image_url });
        res.status(201).json({ message: 'Category created successfully!', category: newCategory });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating category' });
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching categories' });
    }
};

const getRandomCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({
            order: sequelize.fn('RAND'),
            limit: 7
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching random categories' });
    }
};

const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json(category);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching category' });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url } = req.body;

        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        category.name = name || category.name;
        category.description = description || category.description;
        category.image_url = image_url || category.image_url;
        await category.save();

        res.status(200).json({ message: 'Category updated successfully!', category });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating category' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        await category.destroy();
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting category' });
    }
};

// Merchant Controllers
const registerMerchant = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;

        const existingMerchant = await Merchant.findOne({ where: { email } });
        if (existingMerchant) {
            return res.status(400).json({ message: 'Merchant with this email already exists' });
        }

        const existingPhone = await Merchant.findOne({ where: { phoneNumber } });
        if (existingPhone) {
            return res.status(400).json({ message: 'Merchant with this phone number already exists' });
        }

        const newMerchant = await Merchant.create({ firstName, lastName, email, phoneNumber, password });

        const merchant = {
            id: newMerchant.id,
            first_name: newMerchant.firstName,
            last_name: newMerchant.lastName,
            email_address: newMerchant.email,
            phone_number: newMerchant.phoneNumber,
            joined: newMerchant.createdAt,
            updated: newMerchant.updatedAt,
        };

        const token = jwt.sign({ id: newMerchant.id, email: newMerchant.email }, JWT_SECRET, { expiresIn: '2378d' });

        const template = fs.readFileSync('./templates/welcomeMerchant.ejs', 'utf8');
        const emailContent = ejs.render(template, {
            merchantName: newMerchant.firstName,
            dashboardLink: `https://discoun3ree.com/dashboard/${newMerchant.id}`,
        });

        await sendEmail(
            newMerchant.email,
            `Welcome to Discoun3, ${newMerchant.firstName}!`,
            '',
            emailContent
        );

        return res.status(201).json({
            merchant,
            access_token: token,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error registering merchant' });
    }
};

const loginMerchant = async (req, res) => {
    try {
        const { email, password } = req.body;

        const merchant = await Merchant.findOne({ where: { email } });
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, merchant.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: merchant.id, email: merchant.email }, JWT_SECRET, { expiresIn: '1h' });

        return res.status(200).json({
            id: merchant.id,
            first_name: merchant.firstName,
            last_name: merchant.lastName,
            email_address: merchant.email,
            phone_number: merchant.phoneNumber,
            joined: merchant.createdAt,
            updated: merchant.updatedAt,
            access_token: token,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error logging in' });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        const merchant = await Merchant.findOne({ where: { email } });
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        merchant.passwordResetOtp = otp;
        merchant.passwordResetExpires = Date.now() + 3600000;
        await merchant.save();

        const template = fs.readFileSync('./templates/passwordResetOtp.ejs', 'utf8');
        const emailContent = ejs.render(template, {
            otp: otp,
            merchantName: merchant.firstName,
        });

        await sendEmail(
            merchant.email,
            'Password Reset OTP',
            '',
            emailContent
        );

        return res.status(200).json({ message: 'OTP sent to email' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error requesting password reset' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const merchant = await Merchant.findOne({ where: { email } });
        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        if (merchant.passwordResetOtp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (merchant.passwordResetExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        merchant.password = hashedPassword;
        merchant.passwordResetOtp = null;
        merchant.passwordResetExpires = null;
        await merchant.save();

        return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error resetting password' });
    }
};

const getMerchantProfile = async (req, res) => {
    try {
        const { merchantId } = req.params;

        const merchant = await Merchant.findOne({
            where: { id: merchantId },
        });

        if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
        }

        const store = await Store.findOne({
            where: { merchant_id: merchantId },
            attributes: ['id', 'name', 'location', 'primary_email'],
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const creator = store.created_by
            ? await Merchant.findOne({
                where: { id: store.created_by },
                attributes: ['id', 'firstName', 'lastName'],
            })
            : null;

        const updater = store.updated_by
            ? await Merchant.findOne({
                where: { id: store.updated_by },
                attributes: ['id', 'firstName', 'lastName'],
            })
            : null;

        const merchantProfile = {
            id: merchant.id,
            first_name: merchant.firstName,
            last_name: merchant.lastName,
            email_address: merchant.email,
            phone_number: merchant.phoneNumber,
            joined: merchant.createdAt,
            updated: merchant.updatedAt,
            store: store,
            creator: creator,
            updater: updater,
        };

        return res.status(200).json({ merchantProfile });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error retrieving merchant profile' });
    }
};

const createMerchant = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber } = req.body;

        const existingMerchant = await Merchant.findOne({ where: { email } });
        if (existingMerchant) {
            return res.status(400).json({ message: 'Merchant with this email already exists' });
        }

        const autoGeneratedPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(autoGeneratedPassword, 10);

        const newMerchant = await Merchant.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            password: hashedPassword,
        });

        const setPasswordLink = `https://discoun3ree.com/set-password?merchantId=${newMerchant.id}`;

        const template = fs.readFileSync('./templates/setupPassword.ejs', 'utf8');
        const emailContent = ejs.render(template, {
            merchantName: newMerchant.firstName,
            setPasswordLink,
            autoGeneratedPassword,
        });

        await sendEmail(
            newMerchant.email,
            'Set Up Your Password',
            '',
            emailContent
        );

        return res.status(201).json({
            message: 'Merchant created successfully. An email has been sent to set up their password.',
            merchant: {
                id: newMerchant.id,
                firstName: newMerchant.firstName,
                lastName: newMerchant.lastName,
                email: newMerchant.email,
                phoneNumber: newMerchant.phoneNumber,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error creating merchant' });
    }
};

const searchMerchants = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const merchants = await Merchant.findAll({
            where: {
                [Op.or]: [
                    { firstName: { [Op.like]: `%${query}%` } },
                    { lastName: { [Op.like]: `%${query}%` } },
                    { email: { [Op.like]: `%${query}%` } },
                ],
            },
        });

        return res.status(200).json({ merchants });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error searching merchants' });
    }
};

// Store Controllers

const createStore = async (req, res) => {
    try {
        // Extract userId from JWT token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No authorization token provided' });
        }

        let userId;
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
        } catch (error) {
            return res.status(401).json({ message: 'Invalid authorization token' });
        }

        const { 
            merchant_id,
            name, 
            location, 
            primary_email, 
            phone_number, 
            description, 
            website_url,
            logo_url,
            opening_time, 
            closing_time, 
            working_days, 
            status 
        } = req.body;

        // Validate required fields
        if (!merchant_id) {
            return res.status(400).json({ message: 'Merchant ID is required' });
        }

        if (!name || !location || !primary_email) {
            return res.status(400).json({ message: 'Name, location, and primary email are required' });
        }

        // Check for existing store with same email
        const existingStore = await Store.findOne({ where: { primary_email } });
        if (existingStore) {
            return res.status(400).json({ message: 'A store with this primary email already exists' });
        }

        // Create store with all available fields
        const newStore = await Store.create({
            merchant_id,
            name,
            location,
            primary_email,
            phone_number,
            description,
            website_url,
            logo_url,
            opening_time,
            closing_time,
            working_days,
            status,
            created_by: userId  // Now we're setting this from the decoded token
        });

        return res.status(201).json({ 
            message: 'Store created successfully',
            store: newStore 
        });

    } catch (error) {
        console.error('Error creating store:', error);
        return res.status(500).json({ 
            message: 'Error creating store', 
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};


const getStores = async (req, res) => {
    try {
        const stores = await Store.findAll();

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

            return res.status(200).json({ stores: storesWithFollowStatus });
        }

        const storesWithNoFollow = stores.map(store => ({
            ...store.toJSON(),
            following: false
        }));

        return res.status(200).json({ stores: storesWithNoFollow });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching stores' });
    }
};

const getStoreById = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await Store.findByPk(id);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        let userId = null;
        const token = req.headers['authorization']?.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded?.userId;
            } catch (err) {
                console.error('Error verifying token:', err);
                return res.status(401).json({ message: 'Unauthorized: Invalid token' });
            }
        }

        let following = false;

        if (userId) {
            const followedStore = await Follow.findOne({
                where: { user_id: userId, store_id: id },
            });

            if (followedStore) {
                following = true;
            }
        }

        return res.status(200).json({
            store: {
                ...store.toJSON(),
                following,
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching store' });
    }
};

const getRandomStores = async (req, res) => {
    try {
        const stores = await Store.findAll({
            order: sequelize.random(),
            limit: 21,
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

            return res.status(200).json({ stores: storesWithFollowStatus });
        }

        const storesWithNoFollow = stores.map(store => ({
            ...store.toJSON(),
            following: false,
        }));

        return res.status(200).json({ stores: storesWithNoFollow });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error fetching random stores' });
    }
};

const updateStore = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await Store.findByPk(id);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const updatedStore = await store.update({
            ...req.body,
            updated_by: req.user.id,
        });

        return res.status(200).json({ message: 'Store updated successfully', store: updatedStore });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error updating store' });
    }
};

const deleteStore = async (req, res) => {
    try {
        const { id } = req.params;
        const store = await Store.findByPk(id);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        await store.destroy();
        return res.status(200).json({ message: 'Store deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error deleting store' });
    }
};

// Store Gallery Controllers
const uploadImage = async (req, res) => {
    const { storeId } = req.params;
    const { imageUrl } = req.body;

    try {
        const store = await Store.findByPk(storeId);
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const existingImages = await StoreGallery.count({
            where: { store_id: storeId },
        });

        if (existingImages >= 15) {
            return res.status(400).json({ error: 'Store can have a maximum of 15 gallery images' });
        }

        const newImage = await StoreGallery.create({
            store_id: storeId,
            image_url: imageUrl,
        });

        res.status(201).json({ message: 'Image uploaded successfully', newImage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
};

const getGallery = async (req, res) => {
    const { storeId } = req.params;

    try {
        const store = await Store.findByPk(storeId);
        if (!store) {
            return res.status(404).json({ error: 'Store not found' });
        }

        const galleryImages = await StoreGallery.findAll({
            where: { store_id: storeId },
        });

        res.status(200).json(galleryImages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch gallery images' });
    }
};

module.exports = {
    createCategory,
    getCategories,
    getRandomCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    registerMerchant,
    loginMerchant,
    requestPasswordReset,
    resetPassword,
    getMerchantProfile,
    createMerchant,
    searchMerchants,
    createStore,
    getStores,
    getStoreById,
    getRandomStores,
    updateStore,
    deleteStore,
    uploadImage,
    getGallery,
};