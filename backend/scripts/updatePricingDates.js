// Script to update pricing dates to 2025 for development/testing
const mongoose = require('mongoose');
const Pricing = require('../src/models/Pricing');

async function updatePricingDates() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance_masters';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Update all pricing records to have 2025 dates
    const result = await Pricing.updateMany(
      {}, // Update all records
      {
        $set: {
          effectiveDate: new Date('2025-01-01'),
          expirationDate: new Date('2025-12-31')
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} pricing records to 2025 dates`);

    // Verify the update
    const samplePricing = await Pricing.findOne();
    console.log('Sample pricing record:');
    console.log('  Effective Date:', samplePricing.effectiveDate);
    console.log('  Expiration Date:', samplePricing.expirationDate);

    await mongoose.disconnect();
    console.log('Update completed successfully');
  } catch (error) {
    console.error('Error updating pricing dates:', error);
    process.exit(1);
  }
}

// Run the update
updatePricingDates();