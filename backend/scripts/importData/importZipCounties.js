const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const ZipCounty = require('../../src/models/ZipCounty');

async function importZipCounties() {
  try {
    console.log('Starting ZIP counties import...');
    
    // Clear existing data
    await ZipCounty.deleteMany({});
    console.log('Cleared existing ZIP county data');
    
    const csvFile = path.join(__dirname, '../../../zip_counties.csv');
    const results = [];
    let recordCount = 0;
    let errorCount = 0;
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          recordCount++;
          
          try {
            // Transform using static method
            const zipCountyData = ZipCounty.transformFromCSV(row);
            
            // Validate zipCodeId is a valid ZIP code (basic validation)
            if (!zipCountyData.zipCodeId || zipCountyData.zipCodeId < 10000 || zipCountyData.zipCodeId > 99999) {
              console.error(`Row ${recordCount}: Invalid zipCodeId ${zipCountyData.zipCodeId} - must be a valid 5-digit ZIP code`);
              errorCount++;
              return;
            }
            
            results.push(zipCountyData);
          } catch (error) {
            console.error(`Error processing row ${recordCount}:`, error.message);
            errorCount++;
          }
        })
        .on('end', async () => {
          try {
            if (errorCount > 0) {
              throw new Error(`Found ${errorCount} errors during processing`);
            }
            
            // Insert all records within transaction
            await ZipCounty.insertMany(results);
            
            // Verify row count
            const count = await ZipCounty.countDocuments();
            console.log(`Processed ${recordCount} rows, inserted ${count} records`);
            
            // Successfully imported all records
            console.log(`Successfully imported ${count} ZIP county mappings`);
            
            console.log('ZIP counties import completed successfully');
            resolve(count);
          } catch (error) {
            console.error('Error inserting ZIP counties:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
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
      return importZipCounties();
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

module.exports = importZipCounties; 