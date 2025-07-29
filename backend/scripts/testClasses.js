const axios = require('axios');
const mongoose = require('mongoose');
const Group = require('../src/models/Group');

async function testClassesEndpoint() {
  try {
    // Connect to MongoDB to get a valid group ID
    await mongoose.connect('mongodb://localhost:27017/insurance_masters', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    console.log('Connected to MongoDB');
    
    // Get the first group
    const group = await Group.findOne().sort('-createdAt');
    
    if (!group) {
      console.log('No groups found in the database');
      process.exit(0);
    }
    
    const groupId = group._id.toString();
    console.log(`\nTesting with group ID: ${groupId}`);
    
    // Test the classes endpoint
    console.log(`\nFetching classes for group...`);
    const classesResponse = await axios.get(`http://localhost:3001/api/groups/${groupId}/classes`);
    
    console.log('\nResponse status:', classesResponse.status);
    console.log('Response data:', JSON.stringify(classesResponse.data, null, 2));
    
  } catch (error) {
    console.error('\nError testing classes endpoint:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    console.error('URL:', error.config?.url);
  } finally {
    await mongoose.disconnect();
  }
}

testClassesEndpoint();