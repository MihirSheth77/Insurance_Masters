// Unit Tests for PricingService
// Tests premium calculations accuracy and subsidy calculations with known values

const { describe, test, expect, beforeEach } = require('@jest/globals');
const PricingService = require('../../../src/services/PricingService');
const Pricing = require('../../../src/models/Pricing');

describe('PricingService', () => {
  let mockPricingData;
  
  beforeEach(() => {
    // Mock pricing data with known values for testing
    mockPricingData = {
      planId: 'PLAN001',
      ageBasedPricing: new Map([
        [21, { regular: 250.00, tobacco: 275.00 }],
        [25, { regular: 280.00, tobacco: 308.00 }],
        [30, { regular: 320.00, tobacco: 352.00 }],
        [35, { regular: 360.00, tobacco: 396.00 }],
        [40, { regular: 420.00, tobacco: 462.00 }],
        [45, { regular: 480.00, tobacco: 528.00 }],
        [50, { regular: 580.00, tobacco: 638.00 }],
        [55, { regular: 680.00, tobacco: 748.00 }],
        [60, { regular: 800.00, tobacco: 880.00 }],
        [64, { regular: 950.00, tobacco: 1045.00 }]
      ]),
      familyStructurePricing: {
        individual: { regular: 1.0, tobacco: 1.1 },
        couple: { regular: 2.0, tobacco: 2.1 },
        singleParent: { regular: 1.8, tobacco: 1.9 },
        family: { regular: 2.85, tobacco: 3.0 }
      }
    };
    
    // Mock Pricing model methods
    jest.spyOn(Pricing, 'findOne').mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue(mockPricingData)
    }));
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('calculateIndividualPremium', () => {
    test('should calculate correct premium for non-tobacco user', async () => {
      const result = await PricingService.calculateIndividualPremium('PLAN001', 30, false);
      
      expect(result).toEqual({
        monthlyPremium: 320.00,
        annualPremium: 3840.00,
        age: 30,
        tobaccoUse: false,
        planId: 'PLAN001'
      });
    });
    
    test('should calculate correct premium for tobacco user', async () => {
      const result = await PricingService.calculateIndividualPremium('PLAN001', 30, true);
      
      expect(result).toEqual({
        monthlyPremium: 352.00,
        annualPremium: 4224.00,
        age: 30,
        tobaccoUse: true,
        planId: 'PLAN001'
      });
    });
    
    test('should handle age boundaries correctly', async () => {
      // Test minimum age
      const resultMin = await PricingService.calculateIndividualPremium('PLAN001', 21, false);
      expect(resultMin.monthlyPremium).toBe(250.00);
      
      // Test maximum age
      const resultMax = await PricingService.calculateIndividualPremium('PLAN001', 64, false);
      expect(resultMax.monthlyPremium).toBe(950.00);
    });
    
    test('should interpolate for ages not in pricing table', async () => {
      // Age 32 should be interpolated between 30 and 35
      const result = await PricingService.calculateIndividualPremium('PLAN001', 32, false);
      
      // Expected interpolation: 320 + (360-320) * (32-30)/(35-30) = 320 + 40 * 0.4 = 336
      expect(result.monthlyPremium).toBe(336.00);
    });
    
    test('should throw error for invalid age', async () => {
      await expect(PricingService.calculateIndividualPremium('PLAN001', 17, false))
        .rejects.toThrow('Age must be between 18 and 64');
        
      await expect(PricingService.calculateIndividualPremium('PLAN001', 70, false))
        .rejects.toThrow('Age must be between 18 and 64');
    });
    
    test('should throw error for invalid plan', async () => {
      Pricing.findOne.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await expect(PricingService.calculateIndividualPremium('INVALID', 30, false))
        .rejects.toThrow('Pricing data not found for plan');
    });
  });
  
  describe('calculateFamilyPremium', () => {
    const familyMembers = [
      { age: 30, tobaccoUse: false },
      { age: 28, tobaccoUse: false },
      { age: 8, tobaccoUse: false },
      { age: 6, tobaccoUse: false }
    ];
    
    test('should calculate family premium correctly', async () => {
      const result = await PricingService.calculateFamilyPremium('PLAN001', familyMembers);
      
      expect(result).toMatchObject({
        familyType: 'family',
        totalMonthlyPremium: expect.any(Number),
        totalAnnualPremium: expect.any(Number),
        memberBreakdown: expect.arrayContaining([
          expect.objectContaining({
            age: 30,
            monthlyPremium: expect.any(Number)
          })
        ])
      });
      
      expect(result.totalAnnualPremium).toBe(result.totalMonthlyPremium * 12);
    });
    
    test('should identify family type correctly', async () => {
      // Individual
      const individual = await PricingService.calculateFamilyPremium('PLAN001', [
        { age: 30, tobaccoUse: false }
      ]);
      expect(individual.familyType).toBe('individual');
      
      // Couple
      const couple = await PricingService.calculateFamilyPremium('PLAN001', [
        { age: 30, tobaccoUse: false },
        { age: 28, tobaccoUse: false }
      ]);
      expect(couple.familyType).toBe('couple');
      
      // Single parent
      const singleParent = await PricingService.calculateFamilyPremium('PLAN001', [
        { age: 30, tobaccoUse: false },
        { age: 8, tobaccoUse: false }
      ]);
      expect(singleParent.familyType).toBe('singleParent');
      
      // Family
      const family = await PricingService.calculateFamilyPremium('PLAN001', familyMembers);
      expect(family.familyType).toBe('family');
    });
    
    test('should handle tobacco users in family', async () => {
      const mixedFamily = [
        { age: 30, tobaccoUse: true },  // tobacco user
        { age: 28, tobaccoUse: false }, // non-tobacco
        { age: 8, tobaccoUse: false }
      ];
      
      const result = await PricingService.calculateFamilyPremium('PLAN001', mixedFamily);
      
      // First member should have tobacco premium
      expect(result.memberBreakdown[0].monthlyPremium).toBeGreaterThan(
        result.memberBreakdown[1].monthlyPremium
      );
    });
  });
  
  describe('calculateOnMarketSubsidy', () => {
    const benchmarkPremium = 400.00;
    
    test('should calculate subsidy for income at 150% FPL', async () => {
      const income = 21870; // 150% of FPL for individual ($14,580)
      const householdSize = 1;
      
      const result = await PricingService.calculateOnMarketSubsidy(
        benchmarkPremium, income, householdSize, 30
      );
      
      expect(result).toMatchObject({
        isEligible: true,
        fplPercentage: 150,
        expectedContribution: expect.any(Number),
        maxSubsidy: expect.any(Number),
        monthlySubsidy: expect.any(Number)
      });
      
      // At 150% FPL, expected contribution should be ~4.12% of income
      const expectedMonthlyContribution = (income * 0.0412) / 12;
      expect(result.expectedContribution).toBeCloseTo(expectedMonthlyContribution, 2);
    });
    
    test('should calculate subsidy for income at 250% FPL', async () => {
      const income = 36450; // 250% of FPL for individual
      const householdSize = 1;
      
      const result = await PricingService.calculateOnMarketSubsidy(
        benchmarkPremium, income, householdSize, 30
      );
      
      expect(result.isEligible).toBe(true);
      expect(result.fplPercentage).toBe(250);
      
      // At 250% FPL, expected contribution should be ~8.29% of income
      const expectedMonthlyContribution = (income * 0.0829) / 12;
      expect(result.expectedContribution).toBeCloseTo(expectedMonthlyContribution, 2);
    });
    
    test('should calculate subsidy for family at 200% FPL', async () => {
      const income = 60000; // 200% of FPL for family of 4 ($30,000)
      const householdSize = 4;
      
      const result = await PricingService.calculateOnMarketSubsidy(
        benchmarkPremium, income, householdSize, 30
      );
      
      expect(result.isEligible).toBe(true);
      expect(result.fplPercentage).toBe(200);
      expect(result.householdSize).toBe(4);
    });
    
    test('should return no subsidy for income above 400% FPL', async () => {
      const income = 70000; // Above 400% FPL for individual
      const householdSize = 1;
      
      const result = await PricingService.calculateOnMarketSubsidy(
        benchmarkPremium, income, householdSize, 30
      );
      
      expect(result.isEligible).toBe(false);
      expect(result.fplPercentage).toBeGreaterThan(400);
      expect(result.monthlySubsidy).toBe(0);
    });
    
    test('should return no subsidy for income below 100% FPL', async () => {
      const income = 12000; // Below 100% FPL
      const householdSize = 1;
      
      const result = await PricingService.calculateOnMarketSubsidy(
        benchmarkPremium, income, householdSize, 30
      );
      
      expect(result.isEligible).toBe(false);
      expect(result.fplPercentage).toBeLessThan(100);
      expect(result.monthlySubsidy).toBe(0);
    });
    
    test('should handle benchmark premium lower than expected contribution', async () => {
      const lowBenchmark = 100.00; // Very low benchmark
      const income = 30000; // 200% FPL
      const householdSize = 1;
      
      const result = await PricingService.calculateOnMarketSubsidy(
        lowBenchmark, income, householdSize, 30
      );
      
      // Should get no subsidy if benchmark is already affordable
      expect(result.monthlySubsidy).toBe(0);
      expect(result.maxSubsidy).toBeLessThanOrEqual(0);
    });
    
    test('should validate input parameters', async () => {
      await expect(PricingService.calculateOnMarketSubsidy(-100, 30000, 1, 30))
        .rejects.toThrow('Benchmark premium must be positive');
        
      await expect(PricingService.calculateOnMarketSubsidy(400, -30000, 1, 30))
        .rejects.toThrow('Income must be positive');
        
      await expect(PricingService.calculateOnMarketSubsidy(400, 30000, 0, 30))
        .rejects.toThrow('Household size must be at least 1');
    });
  });
  
  describe('Age-based pricing extraction', () => {
    test('should extract pricing for all standard ages', () => {
      const standardAges = [21, 25, 30, 35, 40, 45, 50, 55, 60, 64];
      
      standardAges.forEach(age => {
        const pricing = mockPricingData.ageBasedPricing.get(age);
        expect(pricing).toBeDefined();
        expect(pricing.regular).toBeValidPremium();
        expect(pricing.tobacco).toBeValidPremium();
        expect(pricing.tobacco).toBeGreaterThan(pricing.regular);
      });
    });
    
    test('should validate tobacco premium is higher than regular', () => {
      mockPricingData.ageBasedPricing.forEach((pricing, age) => {
        expect(pricing.tobacco).toBeGreaterThan(pricing.regular);
        
        // Tobacco premium should be 10-50% higher than regular
        const multiplier = pricing.tobacco / pricing.regular;
        expect(multiplier).toBeGreaterThanOrEqual(1.1);
        expect(multiplier).toBeLessThanOrEqual(1.5);
      });
    });
  });
  
  describe('Performance and edge cases', () => {
    test('should handle concurrent calculations efficiently', async () => {
      const promises = [];
      
      // Create 50 concurrent calculations
      for (let i = 0; i < 50; i++) {
        const age = 21 + (i % 43); // Ages 21-64
        const tobacco = i % 3 === 0; // Every 3rd is tobacco user
        
        promises.push(
          PricingService.calculateIndividualPremium('PLAN001', age, tobacco)
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      
      // All results should be valid
      results.forEach(result => {
        expect(result.monthlyPremium).toBeValidPremium();
        expect(result.annualPremium).toBe(result.monthlyPremium * 12);
      });
    });
    
    test('should cache pricing data to avoid repeated database calls', async () => {
      // First call
      await PricingService.calculateIndividualPremium('PLAN001', 30, false);
      
      // Second call with same plan
      await PricingService.calculateIndividualPremium('PLAN001', 35, true);
      
      // Should only call database once due to caching
      expect(Pricing.findOne).toHaveBeenCalledTimes(1);
    });
  });
}); 