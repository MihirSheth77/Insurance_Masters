const mongoose = require('mongoose');
const Group = require('./src/models/Group');
require('dotenv').config();

async function updateGroup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance_masters');
    
    // Find the group
    const group = await Group.findById('68878d0d9c87b9b1cbf4b7d6');
    if (\!group) {
      console.log('Group not found');
      return;
    }
    
    // Update metadata with a dummy location_id (since we can't retrieve the original one)
    group.metadata = {
      ...group.metadata,
      ideonLocationId: 'LOC_DEFAULT_1',
      note: 'Location ID manually added for testing'
    };
    
    await group.save();
    console.log('Group updated successfully:', group.metadata);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateGroup();
