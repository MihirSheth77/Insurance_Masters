const mongoose = require('mongoose');
const Group = require('../src/models/Group');

async function listGroups() {
  try {
    await mongoose.connect('mongodb://localhost:27017/insurance_masters', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    console.log('Connected to MongoDB');
    
    const groups = await Group.find({}, 'name status createdAt ideonGroupId')
      .sort('-createdAt')
      .limit(10);
    
    console.log('\nExisting groups in database:');
    console.log('============================');
    
    if (groups.length === 0) {
      console.log('No groups found.');
    } else {
      groups.forEach((g, index) => {
        console.log(`${index + 1}. Name: "${g.name}"`);
        console.log(`   Status: ${g.status}`);
        console.log(`   Ideon ID: ${g.ideonGroupId}`);
        console.log(`   Created: ${g.createdAt}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listGroups();