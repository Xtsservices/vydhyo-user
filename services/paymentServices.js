
const axios = require('axios');

// Set base URL from env (or hardcode for dev)
const FINANCE_SERVICE_BASE_URL = process.env.FINANCE_SERVICE_URL;

async function createPayment(authHeader, bodyParams) {
  try {
    const response = await axios.post(
      `${FINANCE_SERVICE_BASE_URL}/finance/createPayment`,
      bodyParams,
      {
        headers: {
          Authorization: authHeader
        }
      }
    );
    return response.data;
  } catch (error) {
    console.log('Error calling Payment Service:', error.message);
    throw new Error('Unable to create payment');
  }
}



module.exports = {
  createPayment,
 
};