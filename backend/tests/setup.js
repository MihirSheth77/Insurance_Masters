// Jest Test Setup
// Configures test environment, mocks, and utilities

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const nock = require('nock');

// Global test variables
let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.IDEON_API_KEY = '02fad0e034b3334be1900bd3128a105c';
  process.env.IDEON_BASE_URL = 'https://api.ideon.com/v2';
  
  // Disable console.log during tests (except for errors)
  if (!process.env.JEST_VERBOSE) {
    global.console = {
      ...console,
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: console.error // Keep error logging
    };
  }
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
  
  // Clear all HTTP mocks
  nock.cleanAll();
  
  // Clear all Jest mocks
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB server
  await mongoServer.stop();
  
  // Restore nock
  nock.restore();
});

// Test utilities
global.testUtils = {
  // Create test data factories
  createTestCounty: (overrides = {}) => ({
    countyId: 'TEST001',
    countyName: 'Test County',
    stateAbbreviation: 'TX',
    stateName: 'Texas',
    ratingAreaId: 'RA001',
    ...overrides
  }),
  
  createTestPlan: (overrides = {}) => ({
    planId: 'PLAN001',
    planName: 'Test Health Plan',
    issuerId: 'ISS001',
    issuerName: 'Test Insurance',
    metalLevel: 'Silver',
    planType: 'HMO',
    monthlyPremium: 350.00,
    deductibles: {
      individual: { inNetwork: 2000, outNetwork: 4000 },
      family: { inNetwork: 4000, outNetwork: 8000 }
    },
    copays: {
      primaryCare: 25,
      specialist: 50,
      emergencyRoom: 500
    },
    ...overrides
  }),
  
  createTestMember: (overrides = {}) => ({
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    zipCode: '12345',
    tobaccoUse: false,
    previousContributions: {
      employerContribution: 400,
      memberContribution: 150,
      planName: 'Previous Plan'
    },
    ...overrides
  }),
  
  createTestGroup: (overrides = {}) => ({
    groupName: 'Test Company',
    address: {
      street: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zipCode: '78701',
      county: 'Travis'
    },
    effectiveDate: new Date('2024-01-01'),
    ...overrides
  }),
  
  // HTTP Mock helpers
  mockIdeonAPI: {
    createGroup: (groupData, response = { groupId: 'IDEON_GROUP_001' }) => {
      return nock('https://api.ideon.com')
        .post('/v2/groups')
        .reply(200, response);
    },
    
    createMember: (groupId, memberData, response = { memberId: 'IDEON_MEMBER_001' }) => {
      return nock('https://api.ideon.com')
        .post(`/v2/groups/${groupId}/members`)
        .reply(200, response);
    },
    
    calculateAffordability: (request, response = { isAffordable: true, affordabilityAmount: 350.00 }) => {
      return nock('https://api.ideon.com')
        .post('/v2/ichra/affordability')
        .reply(200, response);
    },
    
    networkError: (endpoint) => {
      return nock('https://api.ideon.com')
        .post(endpoint)
        .replyWithError('Network error');
    },
    
    timeout: (endpoint) => {
      return nock('https://api.ideon.com')
        .post(endpoint)
        .delay(31000) // Longer than 30s timeout
        .reply(200, {});
    }
  },
  
  // Database helpers
  seedDatabase: async (collections = {}) => {
    const mongoose = require('mongoose');
    
    for (const [collectionName, data] of Object.entries(collections)) {
      const collection = mongoose.connection.collection(collectionName);
      if (Array.isArray(data)) {
        await collection.insertMany(data);
      } else {
        await collection.insertOne(data);
      }
    }
  },
  
  // File helpers for CSV testing
  createCSVFile: (headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    return Buffer.from(csvContent);
  },
  
  // Calculation helpers
  calculateAge: (birthDate, asOfDate = new Date()) => {
    const birth = new Date(birthDate);
    const today = new Date(asOfDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  },
  
  // Wait helper for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Assert helpers
  expectValidationError: (error, field) => {
    expect(error.name).toBe('ValidationError');
    expect(error.errors[field]).toBeDefined();
  },
  
  expectApiError: (error, status, code) => {
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
  }
};

// Global test constants
global.TEST_CONSTANTS = {
  VALID_ZIP_CODES: ['78701', '90210', '10001'],
  INVALID_ZIP_CODES: ['00000', '99999', 'ABCDE'],
  METAL_LEVELS: ['Bronze', 'Silver', 'Gold', 'Platinum'],
  PLAN_TYPES: ['HMO', 'PPO', 'EPO', 'POS'],
  STATES: ['TX', 'CA', 'NY', 'FL'],
  
  FPL_2024: {
    individual: 14580,
    family2: 19720,
    family3: 24860,
    family4: 30000
  },
  
  BENCHMARK_AGES: [21, 30, 40, 50, 60, 64],
  
  SAMPLE_PREMIUM_MATRIX: {
    21: { regular: 250.00, tobacco: 275.00 },
    30: { regular: 300.00, tobacco: 330.00 },
    40: { regular: 400.00, tobacco: 440.00 },
    50: { regular: 600.00, tobacco: 660.00 },
    60: { regular: 800.00, tobacco: 880.00 },
    64: { regular: 1000.00, tobacco: 1100.00 }
  }
};

// Make Jest matchers available
expect.extend({
  toBeValidZipCode(received) {
    const zipRegex = /^\d{5}$/;
    const pass = zipRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ZIP code`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ZIP code`,
        pass: false
      };
    }
  },
  
  toBeValidPremium(received) {
    const pass = typeof received === 'number' && received > 0 && received < 10000;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid premium amount`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid premium amount (positive number < $10,000)`,
        pass: false
      };
    }
  }
});

console.log('🧪 Test environment initialized'); 