const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const RatingArea = require('../../src/models/RatingArea');

async function importRatingAreas() {
  try {
    console.log('Starting rating areas import...');
    
    // Clear existing data
    await RatingArea.deleteMany({});
    console.log('Cleared existing rating area data');
    
    const csvFile = path.join(__dirname, '../../../rating_areas.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          // Map fields from CSV to model
          const ratingAreaData = {
            id: row.id,
            stateId: row.state_id.toUpperCase()
          };
          
          results.push(ratingAreaData);
        })
        .on('end', async () => {
          try {
            // Insert all rating areas
            await RatingArea.insertMany(results);
            
            const count = await RatingArea.countDocuments();
            console.log(`Rating areas import completed. Total records: ${count}`);
            resolve(count);
          } catch (error) {
            console.error('Error inserting rating areas:', error);
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

module.exports = importRatingAreas; 