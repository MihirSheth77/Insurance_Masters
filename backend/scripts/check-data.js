// Script to check if plan and pricing data is loaded
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import models
const Plan = require('../src/models/Plan');
const Pricing = require('../src/models/Pricing');
const County = require('../src/models/County');
const Member = require('../src/models/Member');
const Group = require('../src/models/Group');

async function checkData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance-masters');
    console.log('✅ Connected to MongoDB');

    // Check plans
    const planCount = await Plan.countDocuments();
    console.log(`\n📋 Plans in database: ${planCount}`);
    if (planCount > 0) {
      const samplePlan = await Plan.findOne();
      console.log('Sample plan:', {
        planId: samplePlan.planId,
        name: samplePlan.planMarketingName,
        carrier: samplePlan.carrierName,
        metalLevel: samplePlan.level
      });
    }

    // Check pricing
    const pricingCount = await Pricing.countDocuments();
    console.log(`\n💰 Pricing records in database: ${pricingCount}`);
    if (pricingCount > 0) {
      const samplePricing = await Pricing.findOne();
      console.log('Sample pricing:', {
        planId: samplePricing.planId,
        ratingAreaId: samplePricing.ratingAreaId,
        hasAgeBasedPricing: !!samplePricing.ageBasedPricing
      });
    }

    // Check counties
    const countyCount = await County.countDocuments();
    console.log(`\n🗺️  Counties in database: ${countyCount}`);

    // Check groups and members
    const groupCount = await Group.countDocuments();
    const memberCount = await Member.countDocuments();
    console.log(`\n👥 Groups in database: ${groupCount}`);
    console.log(`👤 Members in database: ${memberCount}`);

    if (memberCount > 0) {
      const sampleMember = await Member.findOne();
      console.log('\nSample member previousContributions:', {
        employerContribution: sampleMember.previousContributions?.employerContribution,
        memberContribution: sampleMember.previousContributions?.memberContribution,
        planName: sampleMember.previousContributions?.planName
      });
    }

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Data check complete');
  } catch (error) {
    console.error('❌ Error checking data:', error);
    process.exit(1);
  }
}

checkData();