// Script to update plan dates to 2025 for development/testing
const mongoose = require('mongoose');
const Plan = require('../src/models/Plan');

async function updatePlanDates() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance_masters';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Update all plan records to have 2025 dates
    const result = await Plan.updateMany(
      {}, // Update all records
      {
        $set: {
          effectiveDate: new Date('2025-01-01'),
          expirationDate: new Date('2025-12-31')
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} plan records to 2025 dates`);

    // Verify the update
    const samplePlan = await Plan.findOne();
    console.log('Sample plan record:');
    console.log('  Plan ID:', samplePlan.planId);
    console.log('  Effective Date:', samplePlan.effectiveDate);
    console.log('  Expiration Date:', samplePlan.expirationDate);

    await mongoose.disconnect();
    console.log('Update completed successfully');
  } catch (error) {
    console.error('Error updating plan dates:', error);
    process.exit(1);
  }
}

// Run the update
updatePlanDates();