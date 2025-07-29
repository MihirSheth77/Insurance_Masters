#!/usr/bin/env node

// Test MongoDB Models Script
// Validates all Mongoose schemas and their functionality

const { databaseConnection } = require('../src/config/database');

// Import all models
const County = require('../src/models/County');
const Issuer = require('../src/models/Issuer');
const Plan = require('../src/models/Plan');
const Pricing = require('../src/models/Pricing');
const ZipCounty = require('../src/models/ZipCounty');
const PlanCounty = require('../src/models/PlanCounty');
const RatingArea = require('../src/models/RatingArea');
const ServiceArea = require('../src/models/ServiceArea');
const ServiceAreaZipCounty = require('../src/models/ServiceAreaZipCounty');
const Group = require('../src/models/Group');
const ICHRAClass = require('../src/models/ICHRAClass');
const Member = require('../src/models/Member');
const QuoteResult = require('../src/models/QuoteResult');

console.log('🧪 Testing MongoDB Models & Schemas');
console.log('=====================================');

async function testModels() {
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await databaseConnection.connect();

    // Test data for each model
    const testData = {
      county: {
        fipsCode: '48001',
        name: 'Anderson County',
        state: 'TX',
        stateId: 'TX',
        csvId: 1,
        serviceAreaCount: 5,
        ratingAreaCount: 3
      },
      
      issuer: {
        issuerId: '12345',
        name: 'Test Insurance Company',
        state: 'TX',
        csvId: 1
      },
      
      ratingArea: {
        id: 'TX01',
        stateId: 'TX'
      },
      
      serviceArea: {
        id: 'SA001-2024',
        issuerId: '12345',
        name: 'Test Service Area'
      },
      
      zipCounty: {
        zipCodeId: '123', // Changed to be within 1-572 range
        countyId: '48001',
        ratingAreaId: 'TX01',
        csvId: 1
      },
      
      plan: {
        planId: 'TEST123TX0000001',
        issuerId: '12345',
        name: 'Test Health Plan',
        displayName: 'Test Health Plan Display',
        carrierName: 'Test Insurance Company',
        marketType: 'individual',
        metalLevel: 'silver',
        level: 'silver',
        planType: 'PPO',
        hiossuerIdcId: 'HIOS123',
        serviceAreaId: 'SA001-2024',
        effectiveDate: new Date('2024-01-01'),
        expirationDate: new Date('2024-12-31'),
        deductibles: {
          individual: {
            inNetwork: 2000,
            outOfNetwork: 4000
          },
          family: {
            inNetwork: 4000,
            outOfNetwork: 8000
          }
        },
        copays: {
          primaryCare: "In-Network: $25 / Out-of-Network: $50",
          specialist: "In-Network: $50 / Out-of-Network: $100"
        }
      },
      
      pricing: {
        planId: 'TEST123TX0000001',
        ratingAreaId: 'TX01',
        effectiveDate: new Date('2024-01-01'),
        expirationDate: new Date('2024-12-31'),
        ageBasedPricing: new Map([
          ['21', { regular: 250.00, tobacco: 325.00 }], // Fixed: tobacco > regular
          ['30', { regular: 300.00, tobacco: 390.00 }], // Fixed: tobacco > regular
          ['40', { regular: 350.00, tobacco: 455.00 }]  // Fixed: tobacco > regular
        ]),
        familyStructurePricing: {
          individual: 300.00,
          couple: 600.00,
          family: 900.00,
          singleParent: 700.00
        }
      },
      
      planCounty: {
        planId: 'TEST123TX0000001',
        countyId: '48001'
      },
      
      serviceAreaZipCounty: {
        serviceAreaId: 'SA001-2024',
        zipCodeId: '123', // Changed to be within 1-572 range
        countyId: '48001'
      },
      
      group: {
        name: 'Test Company Inc', // Fixed: changed from groupName to name
        ideonGroupId: 'ideon_test_123',
        address: {
          street1: '123 Test Street', // Fixed: changed from street to street1
          city: 'Austin',
          state: 'TX',
          zipCode: '123', // Fixed: changed to be within 1-572 range
          county: 'Travis'
        },
        effectiveDate: new Date('2024-01-01')
      },
      
      ichraClass: {
        groupId: null, // Will be set after group creation
        className: 'Full-time Employees',
        description: 'All full-time employees',
        monthlyContribution: 400.00,
        ageBasedContributions: [
          { minAge: 18, maxAge: 29, contribution: 350.00 },
          { minAge: 30, maxAge: 39, contribution: 400.00 },
          { minAge: 40, maxAge: 64, contribution: 450.00 }
        ]
      },
      
      member: {
        groupId: null, // Will be set after group creation
        classId: null, // Will be set after class creation
        ideonMemberId: 'ideon_member_123',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-05-15'),
        zipCode: '123', // Fixed: changed to be within 1-572 range
        tobaccoUse: false,
        previousContributions: {
          employerContribution: 450.00,
          memberContribution: 125.00,
          planName: 'Previous Test Plan'
        },
        dependents: [
          {
            firstName: 'Jane',
            lastName: 'Doe',
            dateOfBirth: new Date('1992-08-20'),
            relationship: 'spouse'
          }
        ]
      }
    };

    // Test each model
    const results = {};

    console.log('\n📋 Testing Geographic Models...');
    
    // Test County
    try {
      const county = new County(testData.county);
      await county.validate();
      await county.save();
      results.county = '✅ County model works';
      console.log('✅ County model validated and saved');
    } catch (error) {
      results.county = `❌ County model failed: ${error.message}`;
      console.log('❌ County model failed:', error.message);
    }

    // Test Issuer
    try {
      const issuer = new Issuer(testData.issuer);
      await issuer.validate();
      await issuer.save();
      results.issuer = '✅ Issuer model works';
      console.log('✅ Issuer model validated and saved');
    } catch (error) {
      results.issuer = `❌ Issuer model failed: ${error.message}`;
      console.log('❌ Issuer model failed:', error.message);
    }

    // Test RatingArea
    try {
      const ratingArea = new RatingArea(testData.ratingArea);
      await ratingArea.validate();
      await ratingArea.save();
      results.ratingArea = '✅ RatingArea model works';
      console.log('✅ RatingArea model validated and saved');
    } catch (error) {
      results.ratingArea = `❌ RatingArea model failed: ${error.message}`;
      console.log('❌ RatingArea model failed:', error.message);
    }

    // Test ServiceArea
    try {
      const serviceArea = new ServiceArea(testData.serviceArea);
      await serviceArea.validate();
      await serviceArea.save();
      results.serviceArea = '✅ ServiceArea model works';
      console.log('✅ ServiceArea model validated and saved');
    } catch (error) {
      results.serviceArea = `❌ ServiceArea model failed: ${error.message}`;
      console.log('❌ ServiceArea model failed:', error.message);
    }

    // Test ZipCounty
    try {
      const zipCounty = new ZipCounty(testData.zipCounty);
      await zipCounty.validate();
      await zipCounty.save();
      results.zipCounty = '✅ ZipCounty model works';
      console.log('✅ ZipCounty model validated and saved');
    } catch (error) {
      results.zipCounty = `❌ ZipCounty model failed: ${error.message}`;
      console.log('❌ ZipCounty model failed:', error.message);
    }

    console.log('\n📋 Testing Plan & Pricing Models...');

    // Test Plan
    try {
      const plan = new Plan(testData.plan);
      await plan.validate();
      await plan.save();
      results.plan = '✅ Plan model works';
      console.log('✅ Plan model validated and saved');
    } catch (error) {
      results.plan = `❌ Plan model failed: ${error.message}`;
      console.log('❌ Plan model failed:', error.message);
    }

    // Test Pricing
    try {
      const pricing = new Pricing(testData.pricing);
      await pricing.validate();
      await pricing.save();
      results.pricing = '✅ Pricing model works';
      console.log('✅ Pricing model validated and saved');
    } catch (error) {
      results.pricing = `❌ Pricing model failed: ${error.message}`;
      console.log('❌ Pricing model failed:', error.message);
    }

    // Test PlanCounty
    try {
      const planCounty = new PlanCounty(testData.planCounty);
      await planCounty.validate();
      await planCounty.save();
      results.planCounty = '✅ PlanCounty model works';
      console.log('✅ PlanCounty model validated and saved');
    } catch (error) {
      results.planCounty = `❌ PlanCounty model failed: ${error.message}`;
      console.log('❌ PlanCounty model failed:', error.message);
    }

    // Test ServiceAreaZipCounty
    try {
      const serviceAreaZipCounty = new ServiceAreaZipCounty(testData.serviceAreaZipCounty);
      await serviceAreaZipCounty.validate();
      await serviceAreaZipCounty.save();
      results.serviceAreaZipCounty = '✅ ServiceAreaZipCounty model works';
      console.log('✅ ServiceAreaZipCounty model validated and saved');
    } catch (error) {
      results.serviceAreaZipCounty = `❌ ServiceAreaZipCounty model failed: ${error.message}`;
      console.log('❌ ServiceAreaZipCounty model failed:', error.message);
    }

    console.log('\n📋 Testing Application Models...');

    // Test Group
    try {
      const group = new Group(testData.group);
      await group.validate();
      await group.save();
      
      // Update test data with created group ID
      testData.ichraClass.groupId = group._id;
      testData.member.groupId = group._id;
      
      results.group = '✅ Group model works';
      console.log('✅ Group model validated and saved');
    } catch (error) {
      results.group = `❌ Group model failed: ${error.message}`;
      console.log('❌ Group model failed:', error.message);
    }

    // Test ICHRAClass
    try {
      if (testData.ichraClass.groupId) {
        const ichraClass = new ICHRAClass(testData.ichraClass);
        await ichraClass.validate();
        await ichraClass.save();
        
        // Update test data with created class ID
        testData.member.classId = ichraClass._id;
        
        results.ichraClass = '✅ ICHRAClass model works';
        console.log('✅ ICHRAClass model validated and saved');
      } else {
        results.ichraClass = '⚠️ ICHRAClass skipped (no group ID)';
        console.log('⚠️ ICHRAClass skipped (no group ID)');
      }
    } catch (error) {
      results.ichraClass = `❌ ICHRAClass model failed: ${error.message}`;
      console.log('❌ ICHRAClass model failed:', error.message);
    }

    // Test Member
    try {
      if (testData.member.groupId && testData.member.classId) {
        const member = new Member(testData.member);
        await member.validate();
        await member.save();
        results.member = '✅ Member model works';
        console.log('✅ Member model validated and saved');
      } else {
        results.member = '⚠️ Member skipped (missing group or class ID)';
        console.log('⚠️ Member skipped (missing group or class ID)');
      }
    } catch (error) {
      results.member = `❌ Member model failed: ${error.message}`;
      console.log('❌ Member model failed:', error.message);
    }

    // Test QuoteResult
    try {
      if (testData.member.groupId) {
        const quoteResultData = {
          groupId: testData.member.groupId,
          quoteParameters: {
            effectiveDate: new Date('2024-01-01'),
            metalLevels: ['silver', 'gold'],
            planTypes: ['PPO', 'HMO']
          },
          plans: [
            {
              planId: 'TEST123TX0000001',
              planName: 'Test Health Plan',
              metalLevel: 'silver',
              monthlyPremium: 350.00,
              deductible: 2000,
              maxOutOfPocket: 8000
            }
          ],
          summary: {
            totalPlans: 1,
            averagePremium: 350.00,
            lowestPremium: 350.00,
            highestPremium: 350.00
          }
        };

        const quoteResult = new QuoteResult(quoteResultData);
        await quoteResult.validate();
        await quoteResult.save();
        results.quoteResult = '✅ QuoteResult model works';
        console.log('✅ QuoteResult model validated and saved');
      } else {
        results.quoteResult = '⚠️ QuoteResult skipped (no group ID)';
        console.log('⚠️ QuoteResult skipped (no group ID)');
      }
    } catch (error) {
      results.quoteResult = `❌ QuoteResult model failed: ${error.message}`;
      console.log('❌ QuoteResult model failed:', error.message);
    }

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    let passCount = 0;
    let totalCount = 0;
    
    Object.entries(results).forEach(([model, result]) => {
      console.log(`${model}: ${result}`);
      totalCount++;
      if (result.startsWith('✅')) passCount++;
    });
    
    console.log(`\n🎯 Overall Results: ${passCount}/${totalCount} models passed`);
    
    if (passCount === totalCount) {
      console.log('🎉 All models are working correctly!');
    } else {
      console.log('⚠️ Some models need attention.');
    }

    // Test database health
    const health = await databaseConnection.healthCheck();
    console.log('\n🏥 Database Health:', health.healthy ? '✅ Healthy' : '❌ Unhealthy');
    console.log('📊 Collections Created:', Object.keys(health.details.collections).length);

    return { success: passCount === totalCount, results, health };

  } catch (error) {
    console.error('💥 Test script failed:', error.message);
    throw error;
  }
}

// Run tests
async function runTests() {
  try {
    const results = await testModels();
    
    if (results.success) {
      console.log('\n🚀 MongoDB implementation is ready!');
      process.exit(0);
    } else {
      console.log('\n⚠️ MongoDB implementation needs fixes.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 MongoDB test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup: disconnect from database
    try {
      await databaseConnection.disconnect();
    } catch (err) {
      console.error('Error disconnecting:', err.message);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted by user');
  try {
    await databaseConnection.disconnect();
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  }
  process.exit(1);
});

if (require.main === module) {
  runTests();
}

module.exports = {
  testModels,
  runTests
}; 