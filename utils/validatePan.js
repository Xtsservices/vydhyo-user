const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const validatePan = async (pan) => {
  try {
    // Generate client reference number
    const client_ref_num = uuidv4();

    // Validate input
    if (!pan || !client_ref_num) {
      throw new Error('PAN and client reference number are required');
    }

    // API configuration
    const config = {
      method: 'post',
      url: 'https://svc.digitap.ai/validation/kyc/v1/pan_details',
      headers: {
        'Authorization': 'Basic MTk5MzQ4MDM6TE1pQmZEcjJsMkR5VVlSRTBZa1FYVmk3aHVzVU5PQlk=',
        'Content-Type': 'application/json'
      },
      data: {
        pan,
        client_ref_num
      }
    };

    // Make API call
    const response = await axios(config);

    // Return success response
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    // Handle errors
    throw {
      success: false,
      message: error.response?.data?.message || error.message || 'Internal server error'
    };
  }
};

module.exports = {
  validatePan
};
