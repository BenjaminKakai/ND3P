const { User, Social } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ejs = require('ejs');
const fs = require('fs');
const { sendEmail } = require('../utils/emailUtil');

class UserRepository {
    // User Methods
    async createUser(userData) {
        try {
            const existingUser = await User.findOne({ 
                where: { email: userData.email }
            });

            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            const newUser = await User.create(userData);

            // Prepare user data for response
            const user = {
                id: newUser.id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                phoneNumber: newUser.phoneNumber,
                joined: newUser.createdAt,
                updated: newUser.updatedAt,
            };

            // Send welcome email
            const template = fs.readFileSync('./templates/welcomeUser.ejs', 'utf8');
            const emailContent = ejs.render(template, {
                userName: newUser.firstName,
                marketplaceLink: 'https://discoun3ree.com/marketplace',
            });

            await sendEmail(
                newUser.email,
                `Welcome to D3, ${newUser.firstName}!`,
                '',
                emailContent
            );

            return user;
        } catch (error) {
            throw error;
        }
    }

    async findUserByEmail(email) {
        try {
            return await User.findOne({ where: { email } });
        } catch (error) {
            throw error;
        }
    }

    async findUserById(id) {
        try {
            return await User.findByPk(id);
        } catch (error) {
            throw error;
        }
    }

    async validatePassword(user, password) {
        try {
            return await bcrypt.compare(password, user.password);
        } catch (error) {
            throw error;
        }
    }

    async generateToken(user) {
        try {
            return jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '3650000d' }
            );
        } catch (error) {
            throw error;
        }
    }

    async updateUser(id, userData) {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                throw new Error('User not found');
            }
            return await user.update(userData);
        } catch (error) {
            throw error;
        }
    }

    // Social Media Methods
    async createSocial(socialData) {
        try {
            return await Social.create(socialData);
        } catch (error) {
            throw error;
        }
    }

    async findSocialsByStoreId(storeId) {
        try {
            return await Social.findAll({
                where: { store_id: storeId }
            });
        } catch (error) {
            throw error;
        }
    }

    async findSocialById(id) {
        try {
            return await Social.findByPk(id);
        } catch (error) {
            throw error;
        }
    }

    async updateSocial(id, socialData, updatedBy) {
        try {
            const social = await Social.findByPk(id);
            if (!social) {
                throw new Error('Social media entry not found');
            }

            social.platform = socialData.platform || social.platform;
            social.link = socialData.link || social.link;
            social.updated_by = updatedBy;

            return await social.save();
        } catch (error) {
            throw error;
        }
    }

    async deleteSocial(id) {
        try {
            const social = await Social.findByPk(id);
            if (!social) {
                throw new Error('Social media entry not found');
            }
            await social.destroy();
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Helper methods
    formatUserResponse(user, token = null) {
        const response = {
            id: user.id,
            first_name: user.firstName,
            last_name: user.lastName,
            email_address: user.email,
            phone_number: user.phoneNumber,
            joined: user.createdAt,
            updated: user.updatedAt,
        };

        if (token) {
            response.access_token = token;
        }

        return response;
    }
}

module.exports = new UserRepository();