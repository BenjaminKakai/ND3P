require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Storage Configuration
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'images',
    resource_type: 'image',
  },
});

const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'documents',
    resource_type: 'raw',
  },
});

const uploadImage = multer({ storage: imageStorage });
const uploadDocument = multer({ storage: documentStorage });

// JWT Configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
};

// Daraja (M-Pesa) API Configuration
const darajaConfig = {
  apiKey: 'sfFCdbTrzPb300j2QbQVATjtKXpxX4fbI1LT0oufw4Gb44d1',  // Consumer Key
  apiSecret: 'Zpp5LbEN3UOAHFgsGeGyY1NJQV7UBJsRNaFg45v93Sbd0zQDzXOGqFwEQhuhAOkN',  // Consumer Secret
  passkey: process.env.DARAJA_PASSKEY,         // You can add passkey if available
  shortcode: process.env.DARAJA_SHORTCODE,     // Make sure you add shortcode if available
  environment: 'sandbox',                      // Set environment to 'sandbox' for testing
  endpoints: {
    oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate',
    stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkQuery: 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'
  }
};

// Password Hashing Configuration
const hashingConfig = {
  saltRounds: 10,
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  },
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
};

// JWT Token Management
const tokenManager = {
  generateAccessToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role 
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  },

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );
  },

  verifyToken(token, isRefreshToken = false) {
    try {
      return jwt.verify(
        token,
        isRefreshToken ? jwtConfig.refreshSecret : jwtConfig.secret
      );
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
};

// Daraja API Functions
const darajaApi = {
  async getAccessToken() {
    const auth = Buffer.from(
      `${darajaConfig.apiKey}:${darajaConfig.apiSecret}`
    ).toString('base64');

    try {
      const response = await axios({
        method: 'get',
        url: `${darajaConfig.endpoints.oauth}?grant_type=client_credentials`,
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting Daraja access token:', error);
      throw new Error('Failed to obtain Daraja access token');
    }
  },

  async initiateSTKPush(phoneNumber, amount, accountReference) {
    const accessToken = await this.getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(
      `${darajaConfig.shortcode}${darajaConfig.passkey}${timestamp}`
    ).toString('base64');

    try {
      const response = await axios({
        method: 'post',
        url: darajaConfig.endpoints.stkPush,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          BusinessShortCode: darajaConfig.shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: darajaConfig.shortcode,
          PhoneNumber: phoneNumber,
          CallBackURL: `${process.env.APP_URL}/api/mpesa/callback`,
          AccountReference: accountReference,
          TransactionDesc: `Payment for ${accountReference}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('STK Push failed:', error);
      throw new Error('Failed to initiate STK Push');
    }
  }
};

// File Upload Configuration
const fileUploadConfig = {
  cloudinary,
  uploadImage,
  uploadDocument
};

module.exports = {
  jwtConfig,
  darajaConfig,
  hashingConfig,
  tokenManager,
  darajaApi,
  fileUploadConfig
};
