const express = require('express');
const router = express.Router();
const PlanService = require('../services/PlanService');
const PricingService = require('../services/PricingService');
const GeographicService = require('../services/GeographicService');
const County = require('../models/County');

/**
 * GET /api/plans/search
 * Search plans with complex filtering and pagination
 */
router.get('/search', async (req, res) => {
  try {
    const { 
      countyId, 
      metalLevel, 
      market, 
      carrier, 
      hsaEligible, 
      page, 
      limit 
    } = req.query;

    // 400 Bad Request - Missing required countyId
    if (!countyId) {
      return res.status(400).json({
        success: false,
        error: 'County ID is required for plan search',
        code: 'MISSING_COUNTY_ID'
      });
    }

    // 422 Unprocessable Entity - Invalid countyId format
    const countyIdNum = parseInt(countyId);
    if (isNaN(countyIdNum) || countyIdNum <= 0) {
      return res.status(422).json({
        success: false,
        error: 'County ID must be a positive number',
        code: 'INVALID_COUNTY_ID'
      });
    }

    // Verify county exists
    const county = await County.findOne({ csvId: countyIdNum });
    if (!county) {
      return res.status(404).json({
        success: false,
        error: `County with ID ${countyId} not found`,
        code: 'COUNTY_NOT_FOUND'
      });
    }

    // 422 Unprocessable Entity - Invalid metalLevel values
    if (metalLevel) {
      const validMetalLevels = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Catastrophic'];
      const metalLevels = Array.isArray(metalLevel) ? metalLevel : [metalLevel];
      
      for (const level of metalLevels) {
        if (!validMetalLevels.includes(level)) {
          return res.status(422).json({
            success: false,
            error: `Invalid metal level: ${level}. Valid options: ${validMetalLevels.join(', ')}`,
            code: 'INVALID_METAL_LEVEL'
          });
        }
      }
    }

    // 422 Unprocessable Entity - Invalid market value
    if (market && !['on-market', 'off-market', 'all'].includes(market)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid market value. Valid options: on-market, off-market, all',
        code: 'INVALID_MARKET'
      });
    }

    // 422 Unprocessable Entity - Invalid hsaEligible value
    if (hsaEligible && !['true', 'false'].includes(hsaEligible.toLowerCase())) {
      return res.status(422).json({
        success: false,
        error: 'HSA eligible must be true or false',
        code: 'INVALID_HSA_ELIGIBLE'
      });
    }

    // 422 Unprocessable Entity - Invalid pagination values
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(422).json({
        success: false,
        error: 'Page must be a positive number',
        code: 'INVALID_PAGE'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(422).json({
        success: false,
        error: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT'
      });
    }

    // Complex filtering logic
    const filters = {
      metalLevel: metalLevel ? (Array.isArray(metalLevel) ? metalLevel : [metalLevel]) : undefined,
      market: market || 'all',
      carrier: carrier,
      hsaEligible: hsaEligible ? hsaEligible.toLowerCase() === 'true' : undefined,
      page: pageNum,
      pageSize: limitNum
    };

    // Call PlanService with filters
    const result = await PlanService.getPlansForCounty(countyIdNum, filters);

    // 404 Not Found - No plans available for criteria
    if (result.total === 0) {
      return res.status(404).json({
        success: false,
        error: 'No plans found matching the specified criteria',
        code: 'NO_PLANS_FOUND'
      });
    }

    // 200 OK - Success with enhanced plan details
    res.status(200).json({
      success: true,
      data: {
        plans: result.plans,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
          hasNextPage: result.page < result.totalPages,
          hasPreviousPage: result.page > 1
        },
        filters: {
          countyId: countyIdNum,
          countyName: county.name,
          metalLevel: filters.metalLevel,
          market: filters.market,
          carrier: filters.carrier,
          hsaEligible: filters.hsaEligible
        }
      }
    });

  } catch (error) {
    console.error('Error searching plans:', error);

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 503 Service Unavailable - External service timeout
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      return res.status(503).json({
        success: false,
        error: 'Plan service temporarily unavailable',
        code: 'SERVICE_TIMEOUT'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while searching plans',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/plans/benchmark/:countyId
 * Return benchmark Silver plan premium for subsidy calculations
 */
router.get('/benchmark/:countyId', async (req, res) => {
  try {
    const { countyId } = req.params;
    const { age, tobacco } = req.query;

    // 400 Bad Request - Missing required params
    if (!age) {
      return res.status(400).json({
        success: false,
        error: 'Age parameter is required',
        code: 'MISSING_AGE'
      });
    }

    if (tobacco === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Tobacco parameter is required',
        code: 'MISSING_TOBACCO'
      });
    }

    // 422 Unprocessable Entity - Invalid countyId format
    const countyIdNum = parseInt(countyId);
    if (isNaN(countyIdNum) || countyIdNum <= 0) {
      return res.status(422).json({
        success: false,
        error: 'County ID must be a positive number',
        code: 'INVALID_COUNTY_ID'
      });
    }

    // 422 Unprocessable Entity - Invalid age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      return res.status(422).json({
        success: false,
        error: 'Age must be between 0 and 120',
        code: 'INVALID_AGE'
      });
    }

    // 422 Unprocessable Entity - Invalid tobacco status
    if (!['true', 'false'].includes(tobacco.toLowerCase())) {
      return res.status(422).json({
        success: false,
        error: 'Tobacco must be true or false',
        code: 'INVALID_TOBACCO'
      });
    }

    const tobaccoStatus = tobacco.toLowerCase() === 'true';

    // Verify county exists
    const county = await County.findOne({ csvId: countyIdNum });
    if (!county) {
      return res.status(404).json({
        success: false,
        error: `County with ID ${countyId} not found`,
        code: 'COUNTY_NOT_FOUND'
      });
    }

    // Get benchmark Silver plan premium
    const benchmarkResult = await PlanService.getBenchmarkSilverPlans(
      countyIdNum,
      ageNum,
      tobaccoStatus
    );

    // 404 Not Found - No Silver plans available
    if (!benchmarkResult.benchmarkPremium) {
      return res.status(404).json({
        success: false,
        error: 'No benchmark Silver plans found for this county',
        code: 'NO_BENCHMARK_PLANS'
      });
    }

    // 200 OK - Return benchmark premium
    res.status(200).json({
      success: true,
      data: {
        countyId: countyIdNum,
        countyName: county.name,
        age: ageNum,
        tobacco: tobaccoStatus,
        benchmarkPremium: benchmarkResult.benchmarkPremium,
        benchmarkPlan: {
          planId: benchmarkResult.benchmarkPlan.planId,
          planName: benchmarkResult.benchmarkPlan.planName
        },
        lowestPremium: benchmarkResult.lowestPremium,
        lowestPlan: benchmarkResult.lowestPlan ? {
          planId: benchmarkResult.lowestPlan.planId,
          planName: benchmarkResult.lowestPlan.planName
        } : null,
        totalSilverPlans: benchmarkResult.totalSilverPlans,
        warning: benchmarkResult.warning || null,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting benchmark premium:', error);

    // 404 Not Found - Specific benchmark errors
    if (error.message.includes('No Silver plans') || error.message.includes('No plans available')) {
      return res.status(404).json({
        success: false,
        error: error.message,
        code: 'NO_SILVER_PLANS'
      });
    }

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 503 Service Unavailable - Pricing service issues
    if (error.message.includes('pricing') || error.message.includes('rate limit')) {
      return res.status(503).json({
        success: false,
        error: 'Pricing service temporarily unavailable',
        code: 'PRICING_SERVICE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while calculating benchmark premium',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/plans/quote
 * Calculate premiums for specific members and plans
 */
router.post('/quote', async (req, res) => {
  try {
    const { members, planIds, includeSubsidies, household } = req.body;

    // 400 Bad Request - Missing required fields
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Members array is required and must not be empty',
        code: 'MISSING_MEMBERS'
      });
    }

    if (!planIds || !Array.isArray(planIds) || planIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Plan IDs array is required and must not be empty',
        code: 'MISSING_PLAN_IDS'
      });
    }

    // 422 Unprocessable Entity - Validate member data
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      
      if (!member.age || isNaN(member.age) || member.age < 0 || member.age > 120) {
        return res.status(422).json({
          success: false,
          error: `Invalid age for member ${i + 1}: must be between 0 and 120`,
          code: 'INVALID_MEMBER_AGE'
        });
      }

      if (!member.zipCode) {
        return res.status(422).json({
          success: false,
          error: `ZIP code is required for member ${i + 1}`,
          code: 'MISSING_MEMBER_ZIP'
        });
      }

      const zipNum = parseInt(member.zipCode);
      if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
        return res.status(422).json({
          success: false,
          error: `Invalid ZIP code for member ${i + 1}: must be a valid 5-digit ZIP code`,
          code: 'INVALID_MEMBER_ZIP'
        });
      }

      if (member.tobacco !== undefined && typeof member.tobacco !== 'boolean') {
        return res.status(422).json({
          success: false,
          error: `Invalid tobacco status for member ${i + 1}: must be boolean`,
          code: 'INVALID_TOBACCO_STATUS'
        });
      }
    }

    // 422 Unprocessable Entity - Validate subsidy requirements
    if (includeSubsidies && (!household || typeof household !== 'object')) {
      return res.status(422).json({
        success: false,
        error: 'Household information is required for subsidy calculations',
        code: 'MISSING_HOUSEHOLD_INFO'
      });
    }

    if (includeSubsidies) {
      if (!household.income || isNaN(household.income) || household.income < 0) {
        return res.status(422).json({
          success: false,
          error: 'Valid household income is required for subsidy calculations',
          code: 'INVALID_HOUSEHOLD_INCOME'
        });
      }

      if (!household.size || isNaN(household.size) || household.size < 1) {
        return res.status(422).json({
          success: false,
          error: 'Valid household size is required for subsidy calculations',
          code: 'INVALID_HOUSEHOLD_SIZE'
        });
      }
    }

    // 422 Unprocessable Entity - Validate bulk calculation limits
    if (members.length > 50) {
      return res.status(422).json({
        success: false,
        error: 'Maximum 50 members allowed per bulk calculation',
        code: 'TOO_MANY_MEMBERS'
      });
    }

    if (planIds.length > 20) {
      return res.status(422).json({
        success: false,
        error: 'Maximum 20 plans allowed per quote request',
        code: 'TOO_MANY_PLANS'
      });
    }

    // Support bulk calculations
    const quoteResults = await Promise.all(
      members.map(async (member, memberIndex) => {
        try {
          // Resolve county from ZIP
          const countyResult = await GeographicService.resolveCountyFromZip(member.zipCode);
          const county = countyResult.single ? countyResult.county : countyResult.counties[0];
          
          if (!county) {
            return {
              memberIndex: memberIndex,
              error: `No county found for ZIP code ${member.zipCode}`,
              code: 'COUNTY_NOT_FOUND'
            };
          }

          // Calculate premiums for each plan
          const planQuotes = await Promise.all(
            planIds.map(async (planId) => {
              try {
                const premium = await PricingService.calculateIndividualPremium(
                  planId,
                  member.age,
                  member.tobacco || false,
                  county.ratingAreaId
                );

                let subsidyInfo = null;
                
                // Include subsidy calculations for on-market
                if (includeSubsidies && household) {
                  try {
                    subsidyInfo = await PricingService.calculateOnMarketSubsidy(
                      household,
                      member.age,
                      member.tobacco || false,
                      county.csvId
                    );
                  } catch (subsidyError) {
                    console.warn(`Subsidy calculation failed for member ${memberIndex}, plan ${planId}:`, subsidyError.message);
                  }
                }

                return {
                  planId: planId,
                  premium: premium,
                  subsidy: subsidyInfo
                };
              } catch (error) {
                return {
                  planId: planId,
                  error: error.message,
                  code: 'PREMIUM_CALCULATION_FAILED'
                };
              }
            })
          );

          return {
            memberIndex: memberIndex,
            member: {
              age: member.age,
              zipCode: member.zipCode,
              tobacco: member.tobacco || false
            },
            county: {
              csvId: county.csvId,
              name: county.name,
              ratingAreaId: county.ratingAreaId
            },
            planQuotes: planQuotes
          };
        } catch (error) {
          return {
            memberIndex: memberIndex,
            error: error.message,
            code: 'MEMBER_PROCESSING_FAILED'
          };
        }
      })
    );

    // Check for any failed member calculations
    const failedMembers = quoteResults.filter(result => result.error);
    if (failedMembers.length > 0) {
      return res.status(207).json({
        success: false,
        error: 'Some member calculations failed',
        code: 'PARTIAL_FAILURE',
        results: quoteResults,
        failedMembers: failedMembers
      });
    }

    // 200 OK - Real-time response for filtering
    res.status(200).json({
      success: true,
      data: {
        quoteResults: quoteResults,
        summary: {
          totalMembers: members.length,
          totalPlans: planIds.length,
          includedSubsidies: includeSubsidies || false,
          calculatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error calculating plan quotes:', error);

    // 503 Service Unavailable - Pricing service issues
    if (error.message.includes('pricing') || error.message.includes('rate limit')) {
      return res.status(503).json({
        success: false,
        error: 'Pricing service temporarily unavailable',
        code: 'PRICING_SERVICE_UNAVAILABLE'
      });
    }

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while calculating quotes',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/plans/subsidized/:countyId
 * Calculate subsidized premiums for all on-market plans in a county
 * Implements the requirement: "For every available plan in the user's county, 
 * find its full, unsubsidized premium from pricings.csv. Apply the subsidy: 
 * Subsidized Premium = Full Plan Premium - Premium Subsidy. 
 * If the subsidy is greater than the full premium, the final premium is $0."
 */
router.post('/subsidized/:countyId', async (req, res) => {
  try {
    const { countyId } = req.params;
    const { household, memberAge, tobacco, ratingAreaId } = req.body;

    // Validate required parameters
    if (!household || !household.income || !household.size || !memberAge || ratingAreaId === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: household (income, size), memberAge, ratingAreaId',
          required: ['household.income', 'household.size', 'memberAge', 'ratingAreaId']
        }
      });
    }

    console.log(`Calculating subsidized premiums for county ${countyId}`);

    const result = await PricingService.calculateSubsidizedPlansForCounty(
      countyId,
      household,
      memberAge,
      tobacco || false,
      ratingAreaId
    );

    res.json({
      success: true,
      data: result,
      message: `Calculated subsidized premiums for ${result.totalPlans} on-market plans`
    });

  } catch (error) {
    console.error('Error calculating subsidized premiums:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'SUBSIDIZED_PREMIUM_CALCULATION_FAILED',
        message: error.message || 'Failed to calculate subsidized premiums',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/plans/all-markets/:countyId
 * Calculate both on-market (subsidized) and off-market plans for a county
 */
router.post('/all-markets/:countyId', async (req, res) => {
  try {
    const { countyId } = req.params;
    const { household, memberAge, tobacco, ratingAreaId } = req.body;

    // Validate required parameters
    if (!household || !household.income || !household.size || !memberAge || ratingAreaId === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: household (income, size), memberAge, ratingAreaId'
        }
      });
    }

    console.log(`Calculating all market plans for county ${countyId}`);

    const result = await PricingService.calculateAllPlansForCounty(
      countyId,
      household,
      memberAge,
      tobacco || false,
      ratingAreaId
    );

    res.json({
      success: true,
      data: result,
      message: `Calculated plans for county ${countyId}: ${result.combined.onMarketPlans} on-market, ${result.combined.offMarketPlans} off-market`
    });

  } catch (error) {
    console.error('Error calculating all market plans:', error);
    
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'ALL_MARKET_CALCULATION_FAILED',
        message: error.message || 'Failed to calculate plans for all markets',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/plans/subsidy-estimate
 * Calculate subsidy amount without full plan calculation (for quick estimates)
 */
router.post('/subsidy-estimate', async (req, res) => {
  try {
    const { household, memberAge, tobacco, countyId } = req.body;

    // Validate required parameters
    if (!household || !household.income || !household.size || !memberAge || !countyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: household (income, size), memberAge, countyId'
        }
      });
    }

    console.log(`Calculating subsidy estimate for county ${countyId}`);

    const subsidyResult = await PricingService.calculateOnMarketSubsidy(
      household,
      memberAge,
      tobacco || false,
      countyId
    );

    res.json({
      success: true,
      data: subsidyResult,
      message: subsidyResult.eligibleForSubsidy ? 
        `Household eligible for $${subsidyResult.monthlySubsidy.toFixed(2)}/month subsidy` :
        'Household not eligible for subsidy (income > 400% FPL)'
    });

  } catch (error) {
    console.error('Error calculating subsidy estimate:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: error.code || 'SUBSIDY_ESTIMATE_FAILED',
        message: error.message || 'Failed to calculate subsidy estimate',
        details: error.details
      }
    });
  }
});

module.exports = router; 