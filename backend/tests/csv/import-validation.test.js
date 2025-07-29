// CSV Import Validation Tests
// Verifies all row counts match, data transformations, and foreign key relationships

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const mongoose = require('mongoose');

// Import scripts
const importCounties = require('../../scripts/importData/importCounties');
const importIssuers = require('../../scripts/importData/importIssuers');
const importPlans = require('../../scripts/importData/importPlans');
const importPricings = require('../../scripts/importData/importPricings');
const importZipCounties = require('../../scripts/importData/importZipCounties');
const importPlanCounties = require('../../scripts/importData/importPlanCounties');
const importAll = require('../../scripts/importData/importAll');

// Import models
const County = require('../../src/models/County');
const Issuer = require('../../src/models/Issuer');
const Plan = require('../../src/models/Plan');
const Pricing = require('../../src/models/Pricing');
const ZipCounty = require('../../src/models/ZipCounty');
const PlanCounty = require('../../src/models/PlanCounty');

describe('CSV Import Validation', () => {
  const testDataPath = path.join(__dirname, '../../test-data');
  
  // Helper function to count CSV rows
  const countCSVRows = async (filePath) => {
    return new Promise((resolve, reject) => {
      let count = 0;
      const stream = require('fs').createReadStream(filePath)
        .pipe(csv())
        .on('data', () => count++)
        .on('end', () => resolve(count))
        .on('error', reject);
    });
  };
  
  // Helper function to create test CSV files
  const createTestCSV = async (filename, headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const filePath = path.join(testDataPath, filename);
    await fs.writeFile(filePath, csvContent);
    return filePath;
  };
  
  beforeAll(async () => {
    // Create test data directory
    try {
      await fs.mkdir(testDataPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });
  
  afterAll(async () => {
    // Clean up test data
    try {
      await fs.rmdir(testDataPath, { recursive: true });
    } catch (error) {
      // Directory might not exist
    }
  });
  
  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });
  
  describe('Counties Import Validation', () => {
    test('should import all county rows correctly', async () => {
      const testCounties = [
        ['COUNTY_001', 'Test County 1', 'TX', 'Texas'],
        ['COUNTY_002', 'Test County 2', 'CA', 'California'],
        ['COUNTY_003', 'Test County 3', 'NY', 'New York']
      ];
      
      const csvPath = await createTestCSV(
        'test_counties.csv',
        ['CountyID', 'CountyName', 'StateAbbreviation', 'StateName'],
        testCounties
      );
      
      // Run import
      await importCounties(csvPath);
      
      // Verify row count
      const importedCount = await County.countDocuments();
      expect(importedCount).toBe(testCounties.length);
      
      // Verify data transformation
      const counties = await County.find().sort({ countyId: 1 });
      
      expect(counties[0]).toMatchObject({
        countyId: 'COUNTY_001',
        countyName: 'Test County 1',
        stateAbbreviation: 'TX',
        stateName: 'Texas'
      });
      
      // Verify indexes were created
      const indexes = await County.collection.getIndexes();
      expect(indexes).toHaveProperty('countyId_1');
      expect(indexes).toHaveProperty('stateAbbreviation_1');
    });
    
    test('should validate state abbreviations', async () => {
      const invalidCounties = [
        ['COUNTY_001', 'Test County 1', 'INVALID', 'Invalid State'],
        ['COUNTY_002', 'Test County 2', 'XX', 'Unknown State']
      ];
      
      const csvPath = await createTestCSV(
        'invalid_counties.csv',
        ['CountyID', 'CountyName', 'StateAbbreviation', 'StateName'],
        invalidCounties
      );
      
      // Should reject invalid state abbreviations
      await expect(importCounties(csvPath)).rejects.toThrow('Invalid state abbreviation');
    });
  });
  
  describe('Plans Import Validation', () => {
    test('should transform nested plan data correctly', async () => {
      // First import dependencies
      await County.create([
        { countyId: 'COUNTY_001', countyName: 'Test County', stateAbbreviation: 'TX', stateName: 'Texas' }
      ]);
      
      await Issuer.create([
        { issuerId: 'ISSUER_001', issuerName: 'Test Insurance', stateAbbreviation: 'TX' }
      ]);
      
      const testPlans = [
        [
          'PLAN_001', 'Test Plan', 'ISSUER_001', 'Test Insurance', 'Silver', 'HMO',
          '2000', '4000', '1000', '2000', // Deductibles
          '25', '50', '500', // Copays
          'true', 'false', 'true', // Boolean flags
          'http://example.com/summary', // URL
          '350.00' // Premium
        ]
      ];
      
      const csvPath = await createTestCSV(
        'test_plans.csv',
        [
          'PlanID', 'PlanName', 'IssuerID', 'IssuerName', 'MetalLevel', 'PlanType',
          'IndividualDeductibleInNetwork', 'IndividualDeductibleOutNetwork',
          'FamilyDeductibleInNetwork', 'FamilyDeductibleOutNetwork',
          'PrimaryCopay', 'SpecialistCopay', 'EmergencyRoomCopay',
          'HasPrescriptionCoverage', 'HasDentalCoverage', 'HasVisionCoverage',
          'SummaryOfBenefitsURL', 'MonthlyPremium'
        ],
        testPlans
      );
      
      await importPlans(csvPath);
      
      const importedPlan = await Plan.findOne({ planId: 'PLAN_001' });
      
      // Verify nested object transformation
      expect(importedPlan.deductibles).toEqual({
        individual: { inNetwork: 2000, outNetwork: 4000 },
        family: { inNetwork: 1000, outNetwork: 2000 }
      });
      
      expect(importedPlan.copays).toEqual({
        primaryCare: 25,
        specialist: 50,
        emergencyRoom: 500
      });
      
      // Verify boolean conversion
      expect(importedPlan.hasPrescriptionCoverage).toBe(true);
      expect(importedPlan.hasDentalCoverage).toBe(false);
      expect(importedPlan.hasVisionCoverage).toBe(true);
      
      // Verify URL validation
      expect(importedPlan.summaryOfBenefitsURL).toBe('http://example.com/summary');
      
      // Verify text indexes
      const indexes = await Plan.collection.getIndexes();
      expect(indexes).toHaveProperty('planName_text_description_text');
    });
    
    test('should handle null and empty values correctly', async () => {
      await County.create([
        { countyId: 'COUNTY_001', countyName: 'Test County', stateAbbreviation: 'TX', stateName: 'Texas' }
      ]);
      
      await Issuer.create([
        { issuerId: 'ISSUER_001', issuerName: 'Test Insurance', stateAbbreviation: 'TX' }
      ]);
      
      const testPlans = [
        [
          'PLAN_001', 'Test Plan', 'ISSUER_001', 'Test Insurance', 'Silver', 'HMO',
          '', 'NULL', '0', '2000', // Mixed null/empty values
          '25', '', 'NULL', // Copays with nulls
          'false', '', 'NULL', // Boolean with nulls
          '', // Empty URL
          '350.00'
        ]
      ];
      
      const csvPath = await createTestCSV(
        'test_plans_nulls.csv',
        [
          'PlanID', 'PlanName', 'IssuerID', 'IssuerName', 'MetalLevel', 'PlanType',
          'IndividualDeductibleInNetwork', 'IndividualDeductibleOutNetwork',
          'FamilyDeductibleInNetwork', 'FamilyDeductibleOutNetwork',
          'PrimaryCopay', 'SpecialistCopay', 'EmergencyRoomCopay',
          'HasPrescriptionCoverage', 'HasDentalCoverage', 'HasVisionCoverage',
          'SummaryOfBenefitsURL', 'MonthlyPremium'
        ],
        testPlans
      );
      
      await importPlans(csvPath);
      
      const importedPlan = await Plan.findOne({ planId: 'PLAN_001' });
      
      // Verify null handling
      expect(importedPlan.deductibles.individual.inNetwork).toBe(0); // Empty string -> 0
      expect(importedPlan.deductibles.individual.outNetwork).toBe(0); // 'NULL' -> 0
      expect(importedPlan.copays.specialist).toBe(0); // Empty string -> 0
      expect(importedPlan.copays.emergencyRoom).toBe(0); // 'NULL' -> 0
      
      // Boolean nulls should default to false
      expect(importedPlan.hasDentalCoverage).toBe(false);
      expect(importedPlan.hasVisionCoverage).toBe(false);
      
      // Empty URL should be null
      expect(importedPlan.summaryOfBenefitsURL).toBeNull();
    });
  });
  
  describe('Pricing Import Validation', () => {
    test('should transform age-based pricing matrix correctly', async () => {
      // Setup dependencies
      await Plan.create([
        { planId: 'PLAN_001', planName: 'Test Plan', issuerId: 'ISSUER_001', metalLevel: 'Silver' }
      ]);
      
      const ageColumns = [];
      const ageData = [];
      
      // Create age columns (21-64) with regular and tobacco rates
      for (let age = 21; age <= 64; age++) {
        ageColumns.push(`Age${age}Rate`, `Age${age}TobaccoRate`);
        ageData.push((age * 10).toString(), (age * 11).toString()); // Regular and tobacco rates
      }
      
      const testPricings = [
        ['PLAN_001', 'COUNTY_001', '1.0', '2.0', '1.8', '2.85', '1.1', '2.1', '1.9', '3.0', ...ageData]
      ];
      
      const headers = [
        'PlanID', 'CountyID',
        'IndividualRegular', 'CoupleRegular', 'SingleParentRegular', 'FamilyRegular',
        'IndividualTobacco', 'CoupleTobacco', 'SingleParentTobacco', 'FamilyTobacco',
        ...ageColumns
      ];
      
      const csvPath = await createTestCSV('test_pricings.csv', headers, testPricings);
      
      await importPricings(csvPath);
      
      const importedPricing = await Pricing.findOne({ planId: 'PLAN_001' });
      
      // Verify age-based pricing Map transformation
      expect(importedPricing.ageBasedPricing).toBeInstanceOf(Map);
      expect(importedPricing.ageBasedPricing.size).toBe(44); // Ages 21-64
      
      // Verify specific age pricing
      const age30Pricing = importedPricing.ageBasedPricing.get(30);
      expect(age30Pricing).toEqual({
        regular: 300, // 30 * 10
        tobacco: 330  // 30 * 11
      });
      
      // Verify family structure pricing transformation
      expect(importedPricing.familyStructurePricing).toEqual({
        individual: { regular: 1.0, tobacco: 1.1 },
        couple: { regular: 2.0, tobacco: 2.1 },
        singleParent: { regular: 1.8, tobacco: 1.9 },
        family: { regular: 2.85, tobacco: 3.0 }
      });
    });
    
    test('should validate tobacco rates are higher than regular rates', async () => {
      await Plan.create([
        { planId: 'PLAN_001', planName: 'Test Plan', issuerId: 'ISSUER_001', metalLevel: 'Silver' }
      ]);
      
      // Create invalid pricing where tobacco is less than regular
      const ageData = [];
      for (let age = 21; age <= 64; age++) {
        ageData.push('100', '90'); // Tobacco rate (90) < Regular rate (100) - INVALID
      }
      
      const invalidPricings = [
        ['PLAN_001', 'COUNTY_001', '1.0', '2.0', '1.8', '2.85', '1.1', '2.1', '1.9', '3.0', ...ageData]
      ];
      
      const headers = [
        'PlanID', 'CountyID',
        'IndividualRegular', 'CoupleRegular', 'SingleParentRegular', 'FamilyRegular',
        'IndividualTobacco', 'CoupleTobacco', 'SingleParentTobacco', 'FamilyTobacco'
      ];
      
      // Add age columns
      for (let age = 21; age <= 64; age++) {
        headers.push(`Age${age}Rate`, `Age${age}TobaccoRate`);
      }
      
      const csvPath = await createTestCSV('invalid_pricings.csv', headers, invalidPricings);
      
      await expect(importPricings(csvPath)).rejects.toThrow('Tobacco rate must be greater than or equal to regular rate');
    });
  });
  
  describe('Foreign Key Relationship Validation', () => {
    test('should validate ZIP-County relationships', async () => {
      // Setup counties first
      await County.create([
        { countyId: 'COUNTY_001', countyName: 'Valid County', stateAbbreviation: 'TX', stateName: 'Texas' }
      ]);
      
      const validZipCounties = [
        ['78701', 'COUNTY_001', 'true'],
        ['78702', 'COUNTY_001', 'false']
      ];
      
      const csvPath = await createTestCSV(
        'test_zip_counties.csv',
        ['ZipCode', 'CountyID', 'IsPrimary'],
        validZipCounties
      );
      
      await importZipCounties(csvPath);
      
      const importedCount = await ZipCounty.countDocuments();
      expect(importedCount).toBe(2);
      
      // Verify foreign key references
      const zipCounty = await ZipCounty.findOne({ zipCodeId: '78701' });
      expect(zipCounty.countyId).toBe('COUNTY_001');
      expect(zipCounty.isPrimary).toBe(true);
    });
    
    test('should reject invalid foreign key references', async () => {
      // Don't create any counties
      
      const invalidZipCounties = [
        ['78701', 'NONEXISTENT_COUNTY', 'true']
      ];
      
      const csvPath = await createTestCSV(
        'invalid_zip_counties.csv',
        ['ZipCode', 'CountyID', 'IsPrimary'],
        invalidZipCounties
      );
      
      await expect(importZipCounties(csvPath)).rejects.toThrow('Referenced county does not exist');
    });
    
    test('should validate Plan-County relationships', async () => {
      // Setup dependencies
      await County.create([
        { countyId: 'COUNTY_001', countyName: 'Test County', stateAbbreviation: 'TX', stateName: 'Texas' }
      ]);
      
      await Plan.create([
        { planId: 'PLAN_001', planName: 'Test Plan', issuerId: 'ISSUER_001', metalLevel: 'Silver' }
      ]);
      
      const validPlanCounties = [
        ['PLAN_001', 'COUNTY_001']
      ];
      
      const csvPath = await createTestCSV(
        'test_plan_counties.csv',
        ['PlanID', 'CountyID'],
        validPlanCounties
      );
      
      await importPlanCounties(csvPath);
      
      const importedCount = await PlanCounty.countDocuments();
      expect(importedCount).toBe(1);
      
      const planCounty = await PlanCounty.findOne();
      expect(planCounty.planId).toBe('PLAN_001');
      expect(planCounty.countyId).toBe('COUNTY_001');
    });
  });
  
  describe('Transaction and Rollback Testing', () => {
    test('should rollback on validation failure', async () => {
      // Create a CSV with mixed valid and invalid data
      const mixedCounties = [
        ['COUNTY_001', 'Valid County', 'TX', 'Texas'],
        ['COUNTY_002', 'Invalid County', 'INVALID', 'Invalid State'], // This will fail
        ['COUNTY_003', 'Another Valid', 'CA', 'California']
      ];
      
      const csvPath = await createTestCSV(
        'mixed_counties.csv',
        ['CountyID', 'CountyName', 'StateAbbreviation', 'StateName'],
        mixedCounties
      );
      
      // Import should fail and rollback
      await expect(importCounties(csvPath)).rejects.toThrow();
      
      // Verify no counties were imported due to rollback
      const count = await County.countDocuments();
      expect(count).toBe(0);
    });
    
    test('should handle duplicate key errors gracefully', async () => {
      await County.create([
        { countyId: 'COUNTY_001', countyName: 'Existing County', stateAbbreviation: 'TX', stateName: 'Texas' }
      ]);
      
      const duplicateCounties = [
        ['COUNTY_001', 'Duplicate County', 'TX', 'Texas'] // Same ID as existing
      ];
      
      const csvPath = await createTestCSV(
        'duplicate_counties.csv',
        ['CountyID', 'CountyName', 'StateAbbreviation', 'StateName'],
        duplicateCounties
      );
      
      await expect(importCounties(csvPath)).rejects.toThrow('Duplicate key');
    });
  });
  
  describe('Complete Import Chain Validation', () => {
    test('should import all CSV files in correct dependency order', async () => {
      // Create comprehensive test data for all imports
      
      // Counties
      const countiesPath = await createTestCSV(
        'full_counties.csv',
        ['CountyID', 'CountyName', 'StateAbbreviation', 'StateName'],
        [
          ['COUNTY_001', 'Test County 1', 'TX', 'Texas'],
          ['COUNTY_002', 'Test County 2', 'TX', 'Texas']
        ]
      );
      
      // Issuers
      const issuersPath = await createTestCSV(
        'full_issuers.csv',
        ['IssuerID', 'IssuerName', 'StateAbbreviation'],
        [
          ['ISSUER_001', 'Test Insurance 1', 'TX'],
          ['ISSUER_002', 'Test Insurance 2', 'TX']
        ]
      );
      
      // Plans
      const plansPath = await createTestCSV(
        'full_plans.csv',
        ['PlanID', 'PlanName', 'IssuerID', 'IssuerName', 'MetalLevel', 'PlanType', 'MonthlyPremium'],
        [
          ['PLAN_001', 'Silver Plan 1', 'ISSUER_001', 'Test Insurance 1', 'Silver', 'HMO', '350.00'],
          ['PLAN_002', 'Gold Plan 1', 'ISSUER_002', 'Test Insurance 2', 'Gold', 'PPO', '450.00']
        ]
      );
      
      // Run full import chain
      await importCounties(countiesPath);
      await importIssuers(issuersPath);
      await importPlans(plansPath);
      
      // Verify all data was imported correctly
      expect(await County.countDocuments()).toBe(2);
      expect(await Issuer.countDocuments()).toBe(2);
      expect(await Plan.countDocuments()).toBe(2);
      
      // Verify relationships are maintained
      const plan = await Plan.findOne({ planId: 'PLAN_001' });
      expect(plan.issuerId).toBe('ISSUER_001');
      
      const issuer = await Issuer.findOne({ issuerId: 'ISSUER_001' });
      expect(issuer.issuerName).toBe('Test Insurance 1');
    });
    
    test('should report import statistics correctly', async () => {
      const countiesPath = await createTestCSV(
        'stats_counties.csv',
        ['CountyID', 'CountyName', 'StateAbbreviation', 'StateName'],
        [
          ['COUNTY_001', 'County 1', 'TX', 'Texas'],
          ['COUNTY_002', 'County 2', 'TX', 'Texas'],
          ['COUNTY_003', 'County 3', 'CA', 'California']
        ]
      );
      
      const importResult = await importCounties(countiesPath);
      
      expect(importResult).toMatchObject({
        success: true,
        imported: 3,
        skipped: 0,
        errors: 0,
        duration: expect.any(Number)
      });
    });
  });
  
  describe('Performance and Memory Testing', () => {
    test('should handle large CSV files efficiently', async () => {
      // Create a large CSV file (1000 rows)
      const largeData = [];
      for (let i = 1; i <= 1000; i++) {
        largeData.push([
          `COUNTY_${i.toString().padStart(3, '0')}`,
          `Test County ${i}`,
          'TX',
          'Texas'
        ]);
      }
      
      const largeCsvPath = await createTestCSV(
        'large_counties.csv',
        ['CountyID', 'CountyName', 'StateAbbreviation', 'StateName'],
        largeData
      );
      
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      await importCounties(largeCsvPath);
      
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (endMemory - startMemory) / 1024 / 1024; // MB
      
      // Verify all rows imported
      expect(await County.countDocuments()).toBe(1000);
      
      // Performance assertions
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(memoryIncrease).toBeLessThan(100); // Should not increase memory by more than 100MB
    });
  });
}); 