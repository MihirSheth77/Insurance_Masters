const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const County = require('../../src/models/County');

async function importCounties() {
  try {
    console.log('Starting counties import...');
    
    // Clear existing data
    await County.deleteMany({});
    console.log('Cleared existing county data');
    
    const csvFile = path.join(__dirname, '../../../counties.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          // Map fields: id→csvId, state_id→stateId (uppercase)
          const countyData = {
            csvId: parseInt(row.id),
            name: row.name,
            stateId: row.state_id.toUpperCase(),
            ratingAreaCount: parseInt(row.rating_area_count) || 0,
            serviceAreaCount: parseInt(row.service_area_count) || 0
          };
          
          // Validate state abbreviations (2 letters)
          if (countyData.stateId.length !== 2) {
            console.error(`Invalid state abbreviation: ${countyData.stateId} for county ${countyData.name}`);
            return;
          }
          
          results.push(countyData);
        })
        .on('end', async () => {
          try {
            // Insert all counties
            await County.insertMany(results);
            
            const count = await County.countDocuments();
            console.log(`Counties import completed. Total records: ${count}`);
            resolve(count);
          } catch (error) {
            console.error('Error inserting counties:', error);
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
      return importCounties();
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

module.exports = importCounties; 