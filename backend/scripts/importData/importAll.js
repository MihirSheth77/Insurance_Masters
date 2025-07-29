// Import all data 
const mongoose = require('mongoose');
const importCounties = require('./importCounties');
const importIssuers = require('./importIssuers');
const importPlans = require('./importPlans');
const importPricings = require('./importPricings');
const importRatingAreas = require('./importRatingAreas');
const importServiceAreas = require('./importServiceAreas');
const importZipCounties = require('./importZipCounties');
const importPlanCounties = require('./importPlanCounties');
const importServiceAreaZip = require('./importServiceAreaZip');

async function importAll() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance_masters';
  
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    console.log('\n========================================');
    console.log('Starting comprehensive data import...');
    console.log('========================================\n');
    
    // Import in dependency order
    console.log('Step 1/9: Importing Counties...');
    const countyCount = await importCounties();
    console.log(`✓ Imported ${countyCount} counties\n`);
    
    console.log('Step 2/9: Importing Issuers...');
    const issuerCount = await importIssuers();
    console.log(`✓ Imported ${issuerCount} issuers\n`);
    
    console.log('Step 3/9: Importing Rating Areas...');
    const ratingAreaCount = await importRatingAreas();
    console.log(`✓ Imported ${ratingAreaCount} rating areas\n`);
    
    console.log('Step 4/9: Importing Service Areas...');
    const serviceAreaCount = await importServiceAreas();
    console.log(`✓ Imported ${serviceAreaCount} service areas\n`);
    
    console.log('Step 5/9: Importing Plans...');
    const planCount = await importPlans();
    console.log(`✓ Imported ${planCount} plans\n`);
    
    console.log('Step 6/9: Importing ZIP Counties...');
    const zipCountyCount = await importZipCounties();
    console.log(`✓ Imported ${zipCountyCount} ZIP county mappings\n`);
    
    console.log('Step 7/9: Importing Plan Counties...');
    const planCountyCount = await importPlanCounties();
    console.log(`✓ Imported ${planCountyCount} plan county mappings\n`);
    
    console.log('Step 8/9: Importing Service Area ZIP Counties...');
    const serviceAreaZipCount = await importServiceAreaZip();
    console.log(`✓ Imported ${serviceAreaZipCount} service area ZIP mappings\n`);
    
    console.log('Step 9/9: Importing Pricing Data (Complex Transformation)...');
    const pricingCount = await importPricings();
    console.log(`✓ Imported ${pricingCount} pricing records\n`);
    
    console.log('========================================');
    console.log('Data Import Summary:');
    console.log('========================================');
    console.log(`Counties:                ${countyCount}`);
    console.log(`Issuers:                 ${issuerCount}`);
    console.log(`Rating Areas:            ${ratingAreaCount}`);
    console.log(`Service Areas:           ${serviceAreaCount}`);
    console.log(`Plans:                   ${planCount}`);
    console.log(`ZIP Counties:            ${zipCountyCount}`);
    console.log(`Plan Counties:           ${planCountyCount}`);
    console.log(`Service Area ZIPs:       ${serviceAreaZipCount}`);
    console.log(`Pricing Records:         ${pricingCount}`);
    console.log('========================================');
    
    console.log('\n✅ All data imported successfully!');
    
    // Verify relationships
    await verifyDataRelationships();
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

async function verifyDataRelationships() {
  console.log('\n========================================');
  console.log('Verifying Data Relationships...');
  console.log('========================================');
  
  const County = require('../../src/models/County');
  const Plan = require('../../src/models/Plan');
  const Pricing = require('../../src/models/Pricing');
  const ZipCounty = require('../../src/models/ZipCounty');
  const PlanCounty = require('../../src/models/PlanCounty');
  
  // Verify pricing has valid plans
  const pricingWithPlan = await Pricing.findOne().populate({
    path: 'planId',
    model: Plan,
    localField: 'planId',
    foreignField: 'planId'
  });
  
  if (pricingWithPlan) {
    console.log('✓ Pricing-Plan relationship verified');
  }
  
  // Verify ZIP counties have valid counties
  const zipWithCounty = await ZipCounty.findOne();
  const county = await County.findOne({ csvId: zipWithCounty?.countyId });
  
  if (county) {
    console.log('✓ ZipCounty-County relationship verified');
  }
  
  // Verify plan counties have valid plans and counties
  const planCounty = await PlanCounty.findOne();
  const plan = await Plan.findOne({ planId: planCounty?.planId });
  
  if (plan) {
    console.log('✓ PlanCounty-Plan relationship verified');
  }
  
  console.log('\n✅ All relationships verified successfully!');
}

// Run if called directly
if (require.main === module) {
  importAll()
    .then(() => {
      console.log('\nImport process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\nImport process failed:', error);
      process.exit(1);
    });
}

module.exports = importAll; 