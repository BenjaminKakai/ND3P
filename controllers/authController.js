const { User, Social } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ejs = require('ejs');
const fs = require('fs');
const { sendEmail } = require('../utils/emailUtil');

const JWT_SECRET = process.env.JWT_SECRET;

// User Authentication Controllers
exports.register = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber, password } = req.body;

        // Check for existing user first
        const existingUser = await User.findOne({ 
            where: { email },
            attributes: ['id']
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: 'User with this email already exists' 
            });
        }

        // Create new user
        const newUser = await User.create({
            firstName,
            lastName,
            email,
            phoneNumber,
            password,
        });

        const user = {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            phoneNumber: newUser.phoneNumber,
            joined: newUser.createdAt,
            updated: newUser.updatedAt,
        };

        try {
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
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
        }

        return res.status(201).json({ user });
    } catch (err) {
        console.error('Registration error:', err);
        
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                message: 'User with this email already exists' 
            });
        }
        
        if (err.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: 'Invalid input data',
                errors: err.errors.map(e => e.message)
            });
        }

        return res.status(500).json({ 
            message: 'Error registering user',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '3650000d' }
        );

        return res.status(200).json({
            id: user.id,
            first_name: user.firstName,
            last_name: user.lastName,
            email_address: user.email,
            phone_number: user.phoneNumber,
            joined: user.createdAt,
            updated: user.updatedAt,
            access_token: token,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error logging in' });
    }
};

exports.createSocial = async (req, res) => {
    try {
        const { store_id, platform, link } = req.body;

        const social = await Social.create({
            store_id,
            platform,
            link,
        });

        res.status(201).json(social);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error });
    }
};

exports.getSocialsByStore = async (req, res) => {
    try {
        const store_id = req.params.storeId;

        const socials = await Social.findAll({
            where: { store_id },
        });

        res.status(200).json(socials);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching social media entries', error });
    }
};

exports.updateSocial = async (req, res) => {
    try {
        const socialId = req.params.id;
        const { platform, link } = req.body;
        const updatedBy = req.user.id;

        const social = await Social.findByPk(socialId);
        if (!social) {
            return res.status(404).json({ message: 'Social media entry not found' });
        }

        social.platform = platform || social.platform;
        social.link = link || social.link;
        social.updated_by = updatedBy;

        await social.save();

        res.status(200).json(social);
    } catch (error) {
        res.status(500).json({ message: 'Error updating social media entry', error });
    }
};

exports.deleteSocial = async (req, res) => {
    try {
        const socialId = req.params.id;

        const social = await Social.findByPk(socialId);
        if (!social) {
            return res.status(404).json({ message: 'Social media entry not found' });
        }

        await social.destroy();

        res.status(200).json({ message: 'Social media entry deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting social media entry', error });
    }
};