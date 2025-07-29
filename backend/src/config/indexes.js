/**
 * Database Index Configuration
 * Implements Google-standard database performance optimization
 */

const mongoose = require('mongoose');

/**
 * Create database indexes for optimal query performance
 */
const createIndexes = async () => {
  console.log('Creating database indexes...');
  
  try {
    const db = mongoose.connection.db;
    
    // Helper function to safely create indexes
    const safeCreateIndex = async (collection, indexSpec) => {
      try {
        await db.collection(collection).createIndex(indexSpec.key, {
          ...indexSpec,
          key: undefined // Remove key from options
        });
      } catch (error) {
        if (error.code === 86) {
          // IndexKeySpecsConflict - index already exists with different options
          console.log(`⚠️  Index already exists on ${collection} for ${JSON.stringify(indexSpec.key)}, skipping...`);
        } else if (error.code === 85) {
          // IndexOptionsConflict - index exists with same keys but different options
          console.log(`⚠️  Index with different options exists on ${collection} for ${JSON.stringify(indexSpec.key)}, skipping...`);
        } else {
          throw error;
        }
      }
    };
    
    // Groups collection indexes
    const groupIndexes = [
      { key: { name: 1 }, unique: true },
      { key: { 'address.zipCode': 1 } },
      { key: { effectiveDate: 1 } },
      { key: { createdAt: -1 } },
      { key: { ideonGroupId: 1 }, sparse: true }
    ];
    
    for (const index of groupIndexes) {
      await safeCreateIndex('groups', index);
    }
    
    // Members collection indexes
    const memberIndexes = [
      { key: { groupId: 1, status: 1 } },
      { key: { classId: 1 } },
      { key: { lastName: 1, firstName: 1 } },
      { key: { 'personalInfo.zipCode': 1 } },
      { key: { ideonMemberId: 1 }, sparse: true },
      { key: { createdAt: -1 } }
    ];
    
    for (const index of memberIndexes) {
      await safeCreateIndex('members', index);
    }
    
    // ICHRA Classes collection indexes
    const ichraIndexes = [
      { key: { groupId: 1, isActive: 1 } },
      { key: { groupId: 1, name: 1 }, unique: true },
      { key: { parentClassId: 1 }, sparse: true },
      { key: { type: 1 } }
    ];
    
    for (const index of ichraIndexes) {
      await safeCreateIndex('ichraclasses', index);
    }
    
    // Plans collection indexes
    const planIndexes = [
      { key: { planId: 1 }, unique: true },
      { key: { 'planDetails.metalLevel': 1 } },
      { key: { 'planDetails.planType': 1 } },
      { key: { 'issuerInfo.name': 1 } },
      { key: { 'marketType': 1 } }
    ];
    
    for (const index of planIndexes) {
      await safeCreateIndex('plans', index);
    }
    
    // Pricing collection indexes
    const pricingIndexes = [
      { key: { planId: 1 } },
      { key: { planId: 1, ratingAreaId: 1 } }
    ];
    
    for (const index of pricingIndexes) {
      await safeCreateIndex('pricings', index);
    }
    
    // Counties collection indexes
    const countyIndexes = [
      { key: { csvId: 1 }, unique: true },
      { key: { state: 1, name: 1 } },
      { key: { fips: 1 }, unique: true, sparse: true }
    ];
    
    for (const index of countyIndexes) {
      await safeCreateIndex('counties', index);
    }
    
    // ZIP Counties collection indexes
    const zipCountyIndexes = [
      { key: { zipCode: 1 } },
      { key: { countyId: 1 } }
      // Temporarily disabled due to duplicate null values
      // { key: { zipCode: 1, countyId: 1 }, unique: true, sparse: true }
    ];
    
    for (const index of zipCountyIndexes) {
      await safeCreateIndex('zipcounties', index);
    }
    
    // Plan Counties collection indexes
    const planCountyIndexes = [
      { key: { planId: 1 } },
      { key: { countyId: 1 } }
      // Temporarily disabled due to potential duplicate values
      // { key: { planId: 1, countyId: 1 }, unique: true, sparse: true }
    ];
    
    for (const index of planCountyIndexes) {
      await safeCreateIndex('plancounties', index);
    }
    
    // Quote Results collection indexes
    const quoteIndexes = [
      { key: { groupId: 1, status: 1 } },
      { key: { generatedAt: -1 } },
      { key: { status: 1 } }
    ];
    
    for (const index of quoteIndexes) {
      await safeCreateIndex('quoteresults', index);
    }
    
    // Service Areas collection indexes
    const serviceAreaIndexes = [
      { key: { issuerID: 1, stateCode: 1 } },
      { key: { serviceAreaID: 1 }, unique: true, sparse: true }
    ];
    
    for (const index of serviceAreaIndexes) {
      await safeCreateIndex('serviceareas', index);
    }
    
    // Compound indexes for complex queries
    await safeCreateIndex('members', { key: { groupId: 1, classId: 1, status: 1 } });
    await safeCreateIndex('plans', { key: { 'planDetails.metalLevel': 1, 'issuerInfo.name': 1, marketType: 1 } });
    
    console.log('✅ Database indexes created successfully');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  }
};

/**
 * Drop all indexes (except _id)
 */
const dropIndexes = async () => {
  console.log('Dropping database indexes...');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      try {
        await db.collection(collection.name).dropIndexes();
        console.log(`Dropped indexes for ${collection.name}`);
      } catch (err) {
        if (err.code !== 26) { // 26 = NamespaceNotFound
          console.error(`Error dropping indexes for ${collection.name}:`, err);
        }
      }
    }
    
    console.log('✅ All indexes dropped');
    
  } catch (error) {
    console.error('❌ Error dropping indexes:', error);
    throw error;
  }
};

/**
 * Get index statistics
 */
const getIndexStats = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const stats = {};
    
    for (const collection of collections) {
      try {
        const indexes = await db.collection(collection.name).indexes();
        const indexStats = await db.collection(collection.name).aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        stats[collection.name] = {
          count: indexes.length,
          indexes: indexes.map(idx => ({
            name: idx.name,
            keys: idx.key,
            unique: idx.unique || false,
            sparse: idx.sparse || false
          })),
          usage: indexStats
        };
      } catch (err) {
        console.error(`Error getting index stats for ${collection.name}:`, err);
      }
    }
    
    return stats;
    
  } catch (error) {
    console.error('Error getting index statistics:', error);
    throw error;
  }
};

module.exports = {
  createIndexes,
  dropIndexes,
  getIndexStats
};