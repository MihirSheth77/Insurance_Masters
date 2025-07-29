const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const ServiceAreaZipCounty = require('../../src/models/ServiceAreaZipCounty');
const ServiceArea = require('../../src/models/ServiceArea');
const County = require('../../src/models/County');

async function importServiceAreaZip() {
  try {
    console.log('Starting service area ZIP counties import...');
    
    // Clear existing data
    await ServiceAreaZipCounty.deleteMany({});
    console.log('Cleared existing service area ZIP county data');
    
    // Get valid service area and county IDs for validation
    const validServiceAreaIds = await ServiceArea.distinct('id');
    const validCountyIds = await County.distinct('csvId');
    const serviceAreaIdSet = new Set(validServiceAreaIds);
    const countyIdSet = new Set(validCountyIds);
    
    console.log(`Found ${validServiceAreaIds.length} valid service areas and ${validCountyIds.length} valid counties`);
    
    const csvFile = path.join(__dirname, '../../../service_area_zip_counties.csv');
    const results = [];
    let recordCount = 0;
    let errorCount = 0;
    let invalidServiceAreaCount = 0;
    let invalidCountyCount = 0;
    let invalidZipCount = 0;
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          recordCount++;
          
          try {
            // Transform using static method
            const data = ServiceAreaZipCounty.transformFromCSV(row);
            
            // Validate foreign keys
            if (!serviceAreaIdSet.has(data.serviceAreaId)) {
              console.error(`Row ${recordCount}: Invalid serviceAreaId ${data.serviceAreaId}`);
              invalidServiceAreaCount++;
              errorCount++;
              return;
            }
            
            if (!countyIdSet.has(data.countyId)) {
              console.error(`Row ${recordCount}: Invalid countyId ${data.countyId}`);
              invalidCountyCount++;
              errorCount++;
              return;
            }
            
            // Validate zipCodeId is a valid ZIP code (basic validation)
            // Allow 5-digit ZIP codes (10000-99999)
            if (!data.zipCodeId || data.zipCodeId < 10000 || data.zipCodeId > 99999) {
              console.error(`Row ${recordCount}: Invalid zipCodeId ${data.zipCodeId} - must be a valid 5-digit ZIP code`);
              invalidZipCount++;
              errorCount++;
              return;
            }
            
            results.push(data);
          } catch (error) {
            console.error(`Error processing row ${recordCount}:`, error.message);
            errorCount++;
          }
        })
        .on('end', async () => {
          try {
            console.log(`\nValidation summary:`);
            console.log(`- Invalid service area references: ${invalidServiceAreaCount}`);
            console.log(`- Invalid county references: ${invalidCountyCount}`);
            console.log(`- Invalid ZIP code IDs: ${invalidZipCount}`);
            console.log(`- Total errors: ${errorCount}`);
            
            if (errorCount > 0) {
              throw new Error(`Found ${errorCount} errors during validation`);
            }
            
            // Insert all records within transaction
            await ServiceAreaZipCounty.insertMany(results);
            
            // Verify row count
            const count = await ServiceAreaZipCounty.countDocuments();
            console.log(`\nProcessed ${recordCount} rows, inserted ${count} records`);
            
            if (count !== 3764) {
              throw new Error(`Expected 3,764 records, but inserted ${count}`);
            }
            
            console.log('Service area ZIP counties import completed successfully');
            resolve(count);
          } catch (error) {
            console.error('Error inserting service area ZIP counties:', error);
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
      return importServiceAreaZip();
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

module.exports = importServiceAreaZip; 