const Plan = require('../models/Plan');
const PlanCounty = require('../models/PlanCounty');
const Issuer = require('../models/Issuer');
const Pricing = require('../models/Pricing');
const GeographicService = require('./GeographicService');

class PlanService {
  /**
   * Get plans available in a county with filters
   */
  async getPlansForCounty(countyId, filters = {}) {
    try {
      // Find all planIds from PlanCounty for given county
      const planCounties = await PlanCounty.find({ countyId: parseInt(countyId) });
      const planIds = planCounties.map(pc => pc.planId);

      if (planIds.length === 0) {
        return {
          plans: [],
          total: 0,
          page: filters.page || 1,
          pageSize: filters.pageSize || 20
        };
      }

      // Build query for plans
      const query = { planId: { $in: planIds } };

      // Apply filters
      // metalLevel: Bronze, Silver, Gold, Platinum
      if (filters.metalLevel && filters.metalLevel.length > 0) {
        query.metalLevel = { $in: filters.metalLevel };
      }

      // market: on-market, off-market, all
      if (filters.market && filters.market !== 'all') {
        if (filters.market === 'on-market') {
          query.onMarket = true;
        } else if (filters.market === 'off-market') {
          query.offMarket = true;
        }
      }
      
      // Direct boolean filters for onMarket/offMarket
      if (filters.onMarket !== undefined) {
        query.onMarket = filters.onMarket;
      }
      if (filters.offMarket !== undefined) {
        query.offMarket = filters.offMarket;
      }

      // carrier: filter by issuer via serviceAreaId
      if (filters.carrier) {
        const issuers = await Issuer.find({ name: { $regex: filters.carrier, $options: 'i' } });
        const issuerIds = issuers.map(i => i.issuerId);
        query.hiosIssuerId = { $in: issuerIds };
      }

      // hsaEligible: boolean filter
      if (filters.hsaEligible !== undefined) {
        query.isHsaEligible = filters.hsaEligible;
      }

      // Get total count before pagination
      const total = await Plan.countDocuments(query);

      // Pagination support
      const page = parseInt(filters.page) || 1;
      const pageSize = parseInt(filters.pageSize) || 20;
      const skip = (page - 1) * pageSize;

      // Sort results by premium or name
      let sortOptions = {};
      if (filters.sortBy === 'premium') {
        // Sort by premium would require joining with pricing data
        // For now, sort by plan name as a placeholder
        sortOptions = { planMarketingName: 1 };
      } else if (filters.sortBy === 'name') {
        sortOptions = { planMarketingName: 1 };
      } else {
        // Default sort by name
        sortOptions = { planMarketingName: 1 };
      }

      // Fetch full plan details
      const plans = await Plan.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize);

      return {
        plans: plans,
        total: total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      console.error('Error getting plans for county:', error);
      throw error;
    }
  }

  /**
   * Get benchmark Silver plans for subsidies calculation
   * CRITICAL for subsidies
   */
  async getBenchmarkSilverPlans(countyId, age, tobacco = false) {
    try {
      // Get rating area for the county
      const ratingAreaId = await GeographicService.getRatingAreaForCounty(countyId);

      // Find all planIds from PlanCounty for given county
      const planCounties = await PlanCounty.find({ countyId: parseInt(countyId) });
      const planIds = planCounties.map(pc => pc.planId);

      if (planIds.length === 0) {
        throw new Error('No plans available in this county');
      }

      // Find all Silver plans where onMarket = true
      const silverPlans = await Plan.find({
        planId: { $in: planIds },
        level: 'silver',
        onMarket: true
      });

      // Handle edge case: < 2 Silver plans available
      if (silverPlans.length === 0) {
        throw new Error('No Silver plans available in this county');
      }

      // Calculate premium for each using age and tobacco status
      const plansWithPremiums = await Promise.all(
        silverPlans.map(async (plan) => {
          const pricing = await Pricing.findOne({
            planId: plan.planId,
            ratingAreaId: ratingAreaId,
            effectiveDate: { $lte: new Date() },
            expirationDate: { $gte: new Date() }
          });

          if (!pricing) {
            return null;
          }

          const premium = pricing.getPriceForAge(age, tobacco);
          
          return {
            planId: plan.planId,
            planName: plan.planMarketingName,
            premium: premium
          };
        })
      );

      // Filter out plans without pricing
      const validPlans = plansWithPremiums.filter(p => p && p.premium);

      // Handle edge case: < 2 Silver plans available
      if (validPlans.length === 0) {
        throw new Error('No Silver plans with pricing available');
      }

      // Sort by premium ascending
      validPlans.sort((a, b) => a.premium - b.premium);

      // Return 2nd lowest premium as benchmark
      if (validPlans.length === 1) {
        // Only one plan available, return it as benchmark
        return {
          benchmarkPremium: validPlans[0].premium,
          benchmarkPlan: validPlans[0],
          totalSilverPlans: validPlans.length,
          warning: 'Only one Silver plan available - using it as benchmark'
        };
      }

      // Return 2nd lowest premium
      return {
        benchmarkPremium: validPlans[1].premium,
        benchmarkPlan: validPlans[1],
        lowestPremium: validPlans[0].premium,
        lowestPlan: validPlans[0],
        totalSilverPlans: validPlans.length
      };
    } catch (error) {
      console.error('Error getting benchmark Silver plans:', error);
      throw error;
    }
  }
}

module.exports = new PlanService(); 