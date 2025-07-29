const Pricing = require('../models/Pricing');
const PlanService = require('./PlanService');

class PricingService {
  /**
   * Calculate individual premium for a plan
   */
  async calculateIndividualPremium(planId, age, tobacco, ratingAreaId) {
    try {
      // Fetch pricing record for plan + rating area
      const pricing = await Pricing.findOne({
        planId: planId,
        ratingAreaId: ratingAreaId,
        effectiveDate: { $lte: new Date() },
        expirationDate: { $gte: new Date() }
      });

      if (!pricing) {
        throw new Error(`No pricing found for plan ${planId} in rating area ${ratingAreaId}`);
      }

      // Extract premium from ageBasedPricing Map
      const premium = pricing.getPriceForAge(age, tobacco);

      if (!premium) {
        throw new Error(`No premium found for age ${age}`);
      }

      // Return premium amount with breakdown
      return {
        planId: planId,
        age: age,
        tobacco: tobacco,
        ratingAreaId: ratingAreaId,
        basePremium: pricing.getPriceForAge(age, false),
        tobaccoSurcharge: tobacco ? premium - pricing.getPriceForAge(age, false) : 0,
        totalPremium: premium
      };
    } catch (error) {
      console.error('Error calculating individual premium:', error);
      throw error;
    }
  }

  /**
   * Calculate on-market subsidy for a household
   * Complex Multi-Step Process
   */
  async calculateOnMarketSubsidy(household, memberAge, tobacco, countyId) {
    try {
      // Step 1: Get benchmark premium (2nd lowest Silver)
      const benchmarkResult = await PlanService.getBenchmarkSilverPlans(countyId, memberAge, tobacco);
      const benchmarkPremium = benchmarkResult.benchmarkPremium;

      // Step 2: Calculate household MAGI
      const householdMAGI = household.income;

      // Step 3: Determine FPL percentage
      // Federal Poverty Level amounts for 2025
      const fpl2025 = {
        1: 15060,
        2: 20440,
        3: 25820,
        4: 31200,
        5: 36580,
        6: 41960,
        7: 47340,
        8: 52720
      };

      // Handle all household sizes
      let fplAmount;
      if (household.size <= 8) {
        fplAmount = fpl2025[household.size];
      } else {
        // For households larger than 8, add $5,380 per additional person
        fplAmount = fpl2025[8] + ((household.size - 8) * 5380);
      }

      const fplPercentage = (householdMAGI / fplAmount) * 100;

      // Step 4: Find applicable percentage from IRS sliding scale
      let applicablePercentage;
      if (fplPercentage <= 150) {
        applicablePercentage = 0;
      } else if (fplPercentage <= 200) {
        applicablePercentage = 2.0;
      } else if (fplPercentage <= 250) {
        applicablePercentage = 4.0;
      } else if (fplPercentage <= 300) {
        applicablePercentage = 6.0;
      } else if (fplPercentage <= 400) {
        applicablePercentage = 8.5;
      } else {
        // No subsidy for > 400% FPL
        applicablePercentage = 100;
      }

      // Step 5: Calculate expected contribution
      const expectedContribution = (householdMAGI * (applicablePercentage / 100)) / 12; // Monthly

      // Step 6: Subsidy = Benchmark Premium - Expected Contribution
      const monthlySubsidy = Math.max(0, benchmarkPremium - expectedContribution);

      // Return detailed calculation breakdown
      return {
        householdSize: household.size,
        householdMAGI: householdMAGI,
        fplAmount: fplAmount,
        fplPercentage: fplPercentage,
        applicablePercentage: applicablePercentage,
        benchmarkPremium: benchmarkPremium,
        expectedContribution: expectedContribution,
        monthlySubsidy: monthlySubsidy,
        annualSubsidy: monthlySubsidy * 12,
        eligibleForSubsidy: fplPercentage <= 400
      };
    } catch (error) {
      console.error('Error calculating on-market subsidy:', error);
      throw error;
    }
  }

  /**
   * Calculate subsidized premiums for all on-market plans in a county
   * Implements the requirement: "For every available plan in the user's county, 
   * find its full, unsubsidized premium from pricings.csv. Apply the subsidy: 
   * Subsidized Premium = Full Plan Premium - Premium Subsidy. 
   * If the subsidy is greater than the full premium, the final premium is $0."
   */
  async calculateSubsidizedPlansForCounty(countyId, household, memberAge, tobacco, ratingAreaId) {
    try {
      console.log('Calculating subsidized premiums for all on-market plans in county:', countyId);

      // Step 1: Get all on-market plans available in the county
      const onMarketPlansResult = await PlanService.getPlansForCounty(countyId, { 
        onMarket: true 
      });

      if (!onMarketPlansResult.plans || onMarketPlansResult.plans.length === 0) {
        throw new Error('No on-market plans available in this county');
      }

      console.log(`Found ${onMarketPlansResult.plans.length} on-market plans`);

      // Step 2: Calculate household subsidy (once for all plans)
      const subsidyResult = await this.calculateOnMarketSubsidy(household, memberAge, tobacco, countyId);
      
      if (!subsidyResult.eligibleForSubsidy) {
        console.log('Household not eligible for subsidy (>400% FPL)');
        // Return plans with no subsidy applied
        const plansWithPremiums = await Promise.all(
          onMarketPlansResult.plans.map(async (plan) => {
            const premium = await this.calculateIndividualPremium(
              plan.planId, memberAge, tobacco, ratingAreaId
            );
            
            return {
              planId: plan.planId,
              planName: plan.planMarketingName || plan.name,
              carrier: plan.carrierName,
              metalLevel: plan.level,
              planType: plan.planType,
              fullPremium: premium.totalPremium,
              subsidizedPremium: premium.totalPremium, // No subsidy
              subsidy: 0,
              isSubsidized: false,
              deductible: plan.deductibles?.individual || null,
              outOfPocketMax: plan.maximumOutOfPocket?.individual || null,
              hsaEligible: plan.isHsaEligible || false
            };
          })
        );

        return {
          plans: plansWithPremiums.filter(p => p !== null),
          subsidyInfo: subsidyResult,
          totalPlans: plansWithPremiums.length,
          eligibleForSubsidy: false
        };
      }

      // Step 3: Apply subsidy to each on-market plan
      const subsidizedPlans = await Promise.all(
        onMarketPlansResult.plans.map(async (plan) => {
          try {
            // Get full unsubsidized premium from pricings.csv
            const premiumResult = await this.calculateIndividualPremium(
              plan.planId, 
              memberAge, 
              tobacco, 
              ratingAreaId
            );

            const fullPremium = premiumResult.totalPremium;
            
            // Apply subsidy: Subsidized Premium = Full Plan Premium - Premium Subsidy
            const subsidizedPremium = Math.max(0, fullPremium - subsidyResult.monthlySubsidy);
            
            return {
              planId: plan.planId,
              planName: plan.planMarketingName || plan.name,
              carrier: plan.carrierName,
              metalLevel: plan.level,
              planType: plan.planType,
              fullPremium: fullPremium,
              subsidizedPremium: subsidizedPremium,
              subsidy: subsidyResult.monthlySubsidy,
              actualSubsidy: fullPremium - subsidizedPremium, // Actual subsidy applied
              isSubsidized: true,
              savings: fullPremium - subsidizedPremium,
              savingsPercentage: fullPremium > 0 ? ((fullPremium - subsidizedPremium) / fullPremium) * 100 : 0,
              deductible: plan.deductibles?.individual || null,
              outOfPocketMax: plan.maximumOutOfPocket?.individual || null,
              hsaEligible: plan.isHsaEligible || false,
              networkType: plan.networkType,
              premiumDetails: {
                basePremium: premiumResult.basePremium,
                tobaccoSurcharge: premiumResult.tobaccoSurcharge,
                ratingAreaId: ratingAreaId
              }
            };
          } catch (error) {
            console.warn(`Failed to calculate subsidized premium for plan ${plan.planId}:`, error.message);
            return null;
          }
        })
      );

      // Filter out failed calculations
      const validSubsidizedPlans = subsidizedPlans.filter(p => p !== null);

      // Sort by subsidized premium (lowest first)
      validSubsidizedPlans.sort((a, b) => a.subsidizedPremium - b.subsidizedPremium);

      console.log(`Successfully calculated subsidized premiums for ${validSubsidizedPlans.length} plans`);

      return {
        plans: validSubsidizedPlans,
        subsidyInfo: subsidyResult,
        totalPlans: validSubsidizedPlans.length,
        eligibleForSubsidy: true,
        summary: {
          averageFullPremium: validSubsidizedPlans.reduce((sum, p) => sum + p.fullPremium, 0) / validSubsidizedPlans.length,
          averageSubsidizedPremium: validSubsidizedPlans.reduce((sum, p) => sum + p.subsidizedPremium, 0) / validSubsidizedPlans.length,
          averageSavings: validSubsidizedPlans.reduce((sum, p) => sum + p.savings, 0) / validSubsidizedPlans.length,
          plansWithZeroPremium: validSubsidizedPlans.filter(p => p.subsidizedPremium === 0).length
        }
      };

    } catch (error) {
      console.error('Error calculating subsidized plans for county:', error);
      throw error;
    }
  }

  /**
   * Calculate subsidized premiums for off-market plans (no subsidy)
   * For consistency with on-market plans
   */
  async calculateOffMarketPlansForCounty(countyId, memberAge, tobacco, ratingAreaId) {
    try {
      console.log('Getting off-market plans for county:', countyId);

      // Get all off-market plans available in the county
      const offMarketPlansResult = await PlanService.getPlansForCounty(countyId, { 
        offMarket: true 
      });

      if (!offMarketPlansResult.plans || offMarketPlansResult.plans.length === 0) {
        throw new Error('No off-market plans available in this county');
      }

      // Calculate premiums (no subsidy for off-market)
      const plansWithPremiums = await Promise.all(
        offMarketPlansResult.plans.map(async (plan) => {
          try {
            const premiumResult = await this.calculateIndividualPremium(
              plan.planId, 
              memberAge, 
              tobacco, 
              ratingAreaId
            );

            return {
              planId: plan.planId,
              planName: plan.planMarketingName || plan.name,
              carrier: plan.carrierName,
              metalLevel: plan.level,
              planType: plan.planType,
              fullPremium: premiumResult.totalPremium,
              subsidizedPremium: premiumResult.totalPremium, // No subsidy for off-market
              subsidy: 0,
              actualSubsidy: 0,
              isSubsidized: false,
              savings: 0,
              savingsPercentage: 0,
              deductible: plan.deductibles?.individual || null,
              outOfPocketMax: plan.maximumOutOfPocket?.individual || null,
              hsaEligible: plan.isHsaEligible || false,
              networkType: plan.networkType,
              premiumDetails: {
                basePremium: premiumResult.basePremium,
                tobaccoSurcharge: premiumResult.tobaccoSurcharge,
                ratingAreaId: ratingAreaId
              }
            };
          } catch (error) {
            console.warn(`Failed to calculate premium for off-market plan ${plan.planId}:`, error.message);
            return null;
          }
        })
      );

      const validPlans = plansWithPremiums.filter(p => p !== null);
      validPlans.sort((a, b) => a.fullPremium - b.fullPremium);

      return {
        plans: validPlans,
        subsidyInfo: null,
        totalPlans: validPlans.length,
        eligibleForSubsidy: false,
        summary: {
          averageFullPremium: validPlans.reduce((sum, p) => sum + p.fullPremium, 0) / validPlans.length,
          averageSubsidizedPremium: validPlans.reduce((sum, p) => sum + p.fullPremium, 0) / validPlans.length,
          averageSavings: 0,
          plansWithZeroPremium: 0
        }
      };

    } catch (error) {
      console.error('Error calculating off-market plans for county:', error);
      throw error;
    }
  }

  /**
   * Calculate both on-market and off-market plans for comprehensive comparison
   */
  async calculateAllPlansForCounty(countyId, household, memberAge, tobacco, ratingAreaId) {
    try {
      const [onMarketResult, offMarketResult] = await Promise.all([
        this.calculateSubsidizedPlansForCounty(countyId, household, memberAge, tobacco, ratingAreaId)
          .catch(error => ({ plans: [], error: error.message })),
        this.calculateOffMarketPlansForCounty(countyId, memberAge, tobacco, ratingAreaId)
          .catch(error => ({ plans: [], error: error.message }))
      ]);

      return {
        onMarket: onMarketResult,
        offMarket: offMarketResult,
        combined: {
          totalPlans: (onMarketResult.plans?.length || 0) + (offMarketResult.plans?.length || 0),
          onMarketPlans: onMarketResult.plans?.length || 0,
          offMarketPlans: offMarketResult.plans?.length || 0,
          eligibleForSubsidy: onMarketResult.eligibleForSubsidy || false,
          subsidyInfo: onMarketResult.subsidyInfo || null
        }
      };
    } catch (error) {
      console.error('Error calculating all plans for county:', error);
      throw error;
    }
  }

  /**
   * Calculate family premium
   */
  async calculateFamilyPremium(planId, familyStructure, ratingAreaId) {
    try {
      // Fetch pricing record
      const pricing = await Pricing.findOne({
        planId: planId,
        ratingAreaId: ratingAreaId,
        effectiveDate: { $lte: new Date() },
        expirationDate: { $gte: new Date() }
      });

      if (!pricing) {
        throw new Error(`No pricing found for plan ${planId} in rating area ${ratingAreaId}`);
      }

      // Use familyStructurePricing from Pricing model
      let premium = null;

      // Support: single, family, single+children, etc.
      switch (familyStructure.type) {
        case 'single':
          premium = pricing.familyStructurePricing.single;
          break;
        case 'family':
          premium = pricing.familyStructurePricing.family;
          break;
        case 'single+children':
          premium = pricing.familyStructurePricing.singleAndChildren;
          break;
        case 'single+spouse':
          premium = pricing.familyStructurePricing.singleAndSpouse;
          break;
        case 'child-only':
          premium = pricing.familyStructurePricing.childOnly;
          break;
      }

      // Combine with individual calculations for complex families
      if (!premium && familyStructure.members) {
        let totalPremium = 0;
        for (const member of familyStructure.members) {
          const individualPremium = await this.calculateIndividualPremium(
            planId,
            member.age,
            member.tobacco,
            ratingAreaId
          );
          totalPremium += individualPremium.totalPremium;
        }
        premium = totalPremium;
      }

      if (!premium) {
        throw new Error(`Unable to calculate premium for family structure: ${familyStructure.type}`);
      }

      return {
        planId: planId,
        familyStructure: familyStructure.type,
        ratingAreaId: ratingAreaId,
        premium: premium,
        memberCount: familyStructure.members ? familyStructure.members.length : null
      };
    } catch (error) {
      console.error('Error calculating family premium:', error);
      throw error;
    }
  }
}

module.exports = new PricingService(); 