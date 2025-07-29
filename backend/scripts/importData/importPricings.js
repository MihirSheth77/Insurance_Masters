// Import script for pricing data 
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const path = require('path');
const Pricing = require('../../src/models/Pricing');

async function importPricings() {
  try {
    console.log('Starting pricing data import...');
    
    // Clear existing data
    await Pricing.deleteMany({});
    console.log('Cleared existing pricing data');
    
    const csvFile = path.join(__dirname, '../../../pricings.csv');
    const results = [];
    let recordCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on('data', (row) => {
          recordCount++;
          
          try {
            // Transform age columns
            const ageBasedPricing = new Map();
            let hasInvalidPremium = false;
            
            // Loop through ages 0-65
            for (let age = 0; age <= 65; age++) {
              const regular = parseFloat(row[`age_${age}`]) || 0;
              const tobacco = parseFloat(row[`age_${age}_tobacco`]) || 0;
              
              // Validate all premiums are positive
              if (regular < 0 || tobacco < 0) {
                console.error(`Row ${recordCount}: Negative premium found for age ${age} in plan ${row.plan_id}`);
                hasInvalidPremium = true;
                errorCount++;
              }
              
              // Ensure tobacco > regular for each age
              if (tobacco > 0 && tobacco < regular) {
                console.warn(`Row ${recordCount}: Tobacco price (${tobacco}) < Regular price (${regular}) for age ${age} in plan ${row.plan_id}`);
                warningCount++;
              }
              
              // Store in Map
              ageBasedPricing.set(age.toString(), {
                regular: regular,
                tobacco: tobacco
              });
            }
            
            if (hasInvalidPremium) {
              return; // Skip this record
            }
            
            // Transform family structure columns into nested object
            // For development: Use current year dates to avoid expiration issues
            const currentYear = new Date().getFullYear();
            const effectiveDate = new Date(row.effective_date);
            const expirationDate = new Date(row.expiration_date);
            
            // Update year to current year if dates are in the past
            if (expirationDate < new Date()) {
              effectiveDate.setFullYear(currentYear);
              expirationDate.setFullYear(currentYear);
            }
            
            const pricingData = {
              planId: row.plan_id,
              ratingAreaId: row.rating_area_id,
              effectiveDate: effectiveDate,
              expirationDate: expirationDate,
              ageBasedPricing: ageBasedPricing,
              familyStructurePricing: {
                childOnly: parseFloat(row.child_only) || null,
                family: parseFloat(row.family) || null,
                fixedPrice: parseFloat(row.fixed_price) || null,
                single: parseFloat(row.single) || null,
                singleAndChildren: parseFloat(row.single_and_children) || null,
                singleAndSpouse: parseFloat(row.single_and_spouse) || null,
                singleTobacco: parseFloat(row.single_tobacco) || null
              },
              source: row.source || 'cms',
              updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
            };
            
            results.push(pricingData);
            
            if (recordCount % 100 === 0) {
              console.log(`Processed ${recordCount} pricing records...`);
            }
          } catch (error) {
            console.error(`Error processing row ${recordCount}:`, error.message);
            console.error('Row data:', row);
            errorCount++;
          }
        })
        .on('end', async () => {
          console.log(`\nProcessed ${recordCount} records total`);
          console.log(`Found ${warningCount} tobacco pricing warnings`);
          console.log(`Found ${errorCount} errors`);
          
          try {
            if (errorCount > 0) {
              throw new Error(`Found ${errorCount} errors during processing`);
            }
            
            // Batch insert within transaction
            const batchSize = 100;
            for (let i = 0; i < results.length; i += batchSize) {
              const batch = results.slice(i, i + batchSize);
              await Pricing.insertMany(batch);
              
              if ((i + batchSize) % 500 === 0 || i + batchSize >= results.length) {
                console.log(`Inserted ${Math.min(i + batchSize, results.length)} pricing records...`);
              }
            }
            
            // Verify row count
            const count = await Pricing.countDocuments();
            console.log(`\nPricing import completed. Total records in database: ${count}`);
            
            if (count !== 929) {
              throw new Error(`Expected 929 records, but inserted ${count}`);
            }
            
            console.log('Pricing import committed successfully');
            resolve(count);
          } catch (error) {
            console.error('Error inserting pricing data:', error);
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
      return importPricings();
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

module.exports = importPricings; 