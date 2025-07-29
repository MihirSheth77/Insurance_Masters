const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const ServiceArea = require('../../src/models/ServiceArea');

async function importServiceAreas() {
  try {
    console.log('Starting service areas import...');
    
    // Clear existing data
    await ServiceArea.deleteMany({});
    console.log('Cleared existing service area data');
    
    const csvFile = path.join(__dirname, '../../../service_areas.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          // Map fields from CSV to model
          const serviceAreaData = {
            id: row.id,
            issuerId: row.issuer_id,
            name: row.name
          };
          
          results.push(serviceAreaData);
        })
        .on('end', async () => {
          try {
            // Insert all service areas
            await ServiceArea.insertMany(results);
            
            const count = await ServiceArea.countDocuments();
            console.log(`Service areas import completed. Total records: ${count}`);
            resolve(count);
          } catch (error) {
            console.error('Error inserting service areas:', error);
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

module.exports = importServiceAreas; 