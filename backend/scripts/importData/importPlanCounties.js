const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const PlanCounty = require('../../src/models/PlanCounty');
const Plan = require('../../src/models/Plan');
const County = require('../../src/models/County');

async function importPlanCounties() {
  try {
    console.log('Starting plan counties import...');
    
    // Clear existing data
    await PlanCounty.deleteMany({});
    console.log('Cleared existing plan county data');
    
    // Get valid plan and county IDs for validation
    const validPlanIds = await Plan.distinct('planId');
    const validCountyIds = await County.distinct('csvId');
    const planIdSet = new Set(validPlanIds);
    const countyIdSet = new Set(validCountyIds);
    
    console.log(`Found ${validPlanIds.length} valid plans and ${validCountyIds.length} valid counties`);
    
    const csvFile = path.join(__dirname, '../../../plan_counties.csv');
    const results = [];
    let recordCount = 0;
    let errorCount = 0;
    let invalidPlanCount = 0;
    let invalidCountyCount = 0;
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          recordCount++;
          
          try {
            // Transform using static method
            const planCountyData = PlanCounty.transformFromCSV(row);
            
            // Validate foreign keys
            if (!planIdSet.has(planCountyData.planId)) {
              console.error(`Row ${recordCount}: Invalid planId ${planCountyData.planId}`);
              invalidPlanCount++;
              errorCount++;
              return;
            }
            
            if (!countyIdSet.has(planCountyData.countyId)) {
              console.error(`Row ${recordCount}: Invalid countyId ${planCountyData.countyId}`);
              invalidCountyCount++;
              errorCount++;
              return;
            }
            
            results.push(planCountyData);
          } catch (error) {
            console.error(`Error processing row ${recordCount}:`, error.message);
            errorCount++;
          }
        })
        .on('end', async () => {
          try {
            console.log(`\nValidation summary:`);
            console.log(`- Invalid plan references: ${invalidPlanCount}`);
            console.log(`- Invalid county references: ${invalidCountyCount}`);
            console.log(`- Total errors: ${errorCount}`);
            
            if (errorCount > 0) {
              throw new Error(`Found ${errorCount} errors during validation`);
            }
            
            // Insert all records within transaction
            await PlanCounty.insertMany(results);
            
            // Verify row count
            const count = await PlanCounty.countDocuments();
            console.log(`\nProcessed ${recordCount} rows, inserted ${count} records`);
            
            if (count !== 3612) {
              throw new Error(`Expected 3,612 records, but inserted ${count}`);
            }
            
            console.log('Plan counties import completed successfully');
            resolve(count);
          } catch (error) {
            console.error('Error inserting plan counties:', error);
            reject(error);
          }
        })
        .on('error', async (error) => {
          console.error('Error reading CSV file:', error);
          reject(error);
        });
    });
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/insurance_masters';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return importPlanCounties();
    })
    .then(() => {
      console.log('Import completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

module.exports = importPlanCounties; 