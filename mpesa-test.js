const axios = require('axios');

const consumerKey = 'sfFCdbTrzPb300j2QbQVATjtKXpxX4fbI1LT0oufw4Gb44d1';
const consumerSecret = 'Zpp5LbEN3UOAHFgsGeGyY1NJQV7UBJsRNaFg45v93Sbd0zQDzXOGqFwEQhuhAOkN';

async function getMpesaToken() {
  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const response = await axios({
      method: 'get',
      url: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    console.log('Access Token:', response.data.access_token);
    return response.data.access_token;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getMpesaToken();
