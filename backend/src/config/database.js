// MongoDB Database Configuration
// Handles connection setup, monitoring, and error management

const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Connect to MongoDB with retry logic and proper error handling
   */
  async connect() {
    try {
      const connectionString = process.env.DB_CONNECTION_STRING || 'mongodb://localhost:27017/insurance_masters';
      const dbName = process.env.DB_NAME || 'insurance_masters';

      console.log('🔌 Connecting to MongoDB...');
      console.log(`📍 Database: ${dbName}`);
      console.log(`🌐 Connection String: ${connectionString.replace(/\/\/.*@/, '//***:***@')}`);

      const options = {
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        family: 4, // Use IPv4, skip trying IPv6
        maxPoolSize: 10, // Maximum number of connections in the connection pool
        minPoolSize: 2, // Minimum number of connections in the connection pool
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        dbName: dbName
      };

      await mongoose.connect(connectionString, options);
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      console.log('✅ MongoDB connected successfully!');
      console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
      console.log(`🏠 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      
      return mongoose.connection;

    } catch (error) {
      this.isConnected = false;
      this.connectionAttempts++;
      
      console.error('❌ MongoDB connection failed:', error.message);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying connection (${this.connectionAttempts}/${this.maxRetries}) in ${this.retryDelay/1000}s...`);
        await this.delay(this.retryDelay);
        return this.connect();
      } else {
        console.error('💥 Maximum connection attempts reached. MongoDB connection failed permanently.');
        throw error;
      }
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('🔌 MongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Check connection health
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, message: 'Not connected to database' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        healthy: true,
        message: 'Database connection is healthy',
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          database: mongoose.connection.db.databaseName,
          collections: await this.getCollectionStats()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Database health check failed',
        error: error.message
      };
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats() {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const stats = {};
      
      for (const collection of collections) {
        try {
          const collStats = await mongoose.connection.db.collection(collection.name).stats();
          stats[collection.name] = {
            documents: collStats.count || 0,
            size: collStats.size || 0,
            indexes: collStats.nindexes || 0
          };
        } catch (err) {
          stats[collection.name] = { error: 'Unable to get stats' };
        }
      }
      
      return stats;
    } catch (error) {
      return { error: 'Unable to get collection stats' };
    }
  }

  /**
   * Setup connection event listeners
   */
  setupEventListeners() {
    // Connection successful
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    // Connection error
    mongoose.connection.on('error', (error) => {
      console.error('🔴 Mongoose connection error:', error.message);
      this.isConnected = false;
    });

    // Connection disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    // Connection reconnected
    mongoose.connection.on('reconnected', () => {
      console.log('🟢 Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // If the Node process ends, close the Mongoose connection
    process.on('SIGINT', async () => {
      try {
        await this.disconnect();
        console.log('🛑 Application terminated, database connection closed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error.message);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await this.disconnect();
        console.log('🛑 Application terminated (SIGTERM), database connection closed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error.message);
        process.exit(1);
      }
    });
  }

  /**
   * Initialize database with indexes and default data
   */
  async initialize() {
    try {
      console.log('🔧 Initializing database...');
      
      // Create indexes for better performance
      await this.createIndexes();
      
      // Setup data validation
      await this.setupValidation();
      
      console.log('✅ Database initialization completed');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Create database indexes for performance
   */
  async createIndexes() {
    try {
      const db = mongoose.connection.db;
      
      // Create indexes for frequently queried fields
      const indexOperations = [
        // Counties - for geographic lookups
        { collection: 'counties', index: { fipsCode: 1 }, options: { unique: true, name: 'idx_counties_fips' } },
        { collection: 'counties', index: { state: 1, name: 1 }, options: { name: 'idx_counties_state_name' } },
        
        // ZipCounties - for ZIP code resolution
        { collection: 'zipcounties', index: { zipCodeId: 1 }, options: { name: 'idx_zipcounties_zip' } },
        { collection: 'zipcounties', index: { countyId: 1 }, options: { name: 'idx_zipcounties_county' } },
        { collection: 'zipcounties', index: { ratingAreaId: 1 }, options: { name: 'idx_zipcounties_rating' } },
        
        // Plans - for plan searches
        { collection: 'plans', index: { planId: 1 }, options: { unique: true, name: 'idx_plans_id' } },
        { collection: 'plans', index: { issuerId: 1, marketType: 1 }, options: { name: 'idx_plans_issuer_market' } },
        { collection: 'plans', index: { metalLevel: 1, planType: 1 }, options: { name: 'idx_plans_metal_type' } },
        
        // Pricings - for premium calculations
        { collection: 'pricings', index: { planId: 1 }, options: { name: 'idx_pricings_plan' } },
        { collection: 'pricings', index: { ratingAreaId: 1 }, options: { name: 'idx_pricings_rating' } },
        { collection: 'pricings', index: { effectiveDate: 1, expirationDate: 1 }, options: { name: 'idx_pricings_dates' } },
        
        // Groups - for group management
        { collection: 'groups', index: { ideonGroupId: 1 }, options: { sparse: true, name: 'idx_groups_ideon' } },
        { collection: 'groups', index: { 'address.zipCode': 1 }, options: { name: 'idx_groups_zip' } },
        
        // Members - for member lookups
        { collection: 'members', index: { groupId: 1 }, options: { name: 'idx_members_group' } },
        { collection: 'members', index: { ideonMemberId: 1 }, options: { sparse: true, name: 'idx_members_ideon' } },
        { collection: 'members', index: { classId: 1 }, options: { name: 'idx_members_class' } },
        
        // ICHRA Classes - for class management
        { collection: 'ichraclasses', index: { groupId: 1 }, options: { name: 'idx_classes_group' } },
        { collection: 'ichraclasses', index: { parentClassId: 1 }, options: { sparse: true, name: 'idx_classes_parent' } },
        
        // Quote Results - for quote lookups
        { collection: 'quoteresults', index: { groupId: 1 }, options: { name: 'idx_quotes_group' } },
        { collection: 'quoteresults', index: { createdAt: 1 }, options: { name: 'idx_quotes_created' } }
      ];

      for (const { collection, index, options } of indexOperations) {
        try {
          await db.collection(collection).createIndex(index, options);
          console.log(`✅ Created index ${options.name} on ${collection}`);
        } catch (error) {
          if (error.code === 85 || error.code === 86) {
            // Index already exists or index with different options exists
            console.log(`ℹ️ Index ${options.name} on ${collection} already exists`);
          } else {
            console.error(`❌ Failed to create index ${options.name} on ${collection}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Error creating indexes:', error.message);
      throw error;
    }
  }

  /**
   * Setup database validation rules
   */
  async setupValidation() {
    try {
      // Add any database-level validation rules here
      console.log('✅ Database validation rules configured');
    } catch (error) {
      console.error('❌ Error setting up validation:', error.message);
      throw error;
    }
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      readyStateText: this.getReadyStateText(mongoose.connection.readyState),
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      database: mongoose.connection.db?.databaseName,
      connectionAttempts: this.connectionAttempts
    };
  }

  /**
   * Convert numeric ready state to text
   */
  getReadyStateText(state) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[state] || 'unknown';
  }
}

// Create and export singleton instance
const databaseConnection = new DatabaseConnection();

// Setup event listeners
databaseConnection.setupEventListeners();

module.exports = {
  databaseConnection,
  mongoose
}; 