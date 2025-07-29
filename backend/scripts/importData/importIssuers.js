const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const Issuer = require('../../src/models/Issuer');

async function importIssuers() {
  try {
    console.log('Starting issuers import...');
    
    // Clear existing data
    await Issuer.deleteMany({});
    console.log('Cleared existing issuer data');
    
    const csvFile = path.join(__dirname, '../../../issuers.csv');
    const results = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          // Map fields from CSV to model
          const issuerData = {
            csvId: parseInt(row.id),
            name: row.name,
            alternateName: row.alternate_name || null,
            logoPath: row.logo_path || null
          };
          
          results.push(issuerData);
        })
        .on('end', async () => {
          try {
            // Insert all issuers
            await Issuer.insertMany(results);
            
            const count = await Issuer.countDocuments();
            console.log(`Issuers import completed. Total records: ${count}`);
            resolve(count);
          } catch (error) {
            console.error('Error inserting issuers:', error);
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

module.exports = importIssuers; 