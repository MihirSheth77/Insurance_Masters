const express = require('express');
const router = express.Router();
const QuoteService = require('../services/QuoteService');
const Group = require('../models/Group');
const Member = require('../models/Member');
const QuoteResult = require('../models/QuoteResult');

/**
 * POST /api/quotes/generate
 * Generate quotes for an entire group
 */
router.post('/generate', async (req, res) => {
  try {
    const { groupId, options } = req.body;

    // Validate required fields
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required',
        code: 'MISSING_GROUP_ID'
      });
    }

    // Validate groupId format
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Check if group has members
    const memberCount = await Member.countDocuments({ 
      groupId: groupId, 
      status: 'active' 
    });

    if (memberCount === 0) {
      return res.status(422).json({
        success: false,
        error: 'Group has no active members to quote',
        code: 'NO_ACTIVE_MEMBERS'
      });
    }

    // Check if group has classes defined
    const classCount = await require('../models/ICHRAClass').countDocuments({ 
      groupId: groupId, 
      isActive: true 
    });

    if (classCount === 0) {
      return res.status(422).json({
        success: false,
        error: 'Group has no ICHRA classes defined',
        code: 'NO_ICHRA_CLASSES'
      });
    }

    console.log(`Generating quotes for group ${group.name} with ${memberCount} members`);

    // Generate quotes using QuoteService
    const quoteResult = await QuoteService.generateGroupQuote(groupId, options);

    // Return quote result
    res.status(201).json({
      success: true,
      data: {
        quoteId: quoteResult._id,
        groupId: quoteResult.groupId,
        groupName: group.name,
        summary: {
          totalMembers: quoteResult.employerSummary.totalMembers,
          generatedAt: quoteResult.generatedAt
        },
        employerSummary: quoteResult.employerSummary,
        memberQuotesCount: quoteResult.memberQuotes.length,
        selectedPlansCount: quoteResult.selectedPlans?.length || 0,
        message: 'Quotes generated successfully'
      }
    });

  } catch (error) {
    console.error('Error generating quotes:', error);

    // Handle specific errors
    if (error.message?.includes('county not found')) {
      return res.status(422).json({
        success: false,
        error: 'Invalid location data for one or more members',
        code: 'INVALID_LOCATION_DATA'
      });
    }

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while generating quotes',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/quotes/:quoteId
 * Get quote results by quote ID
 */
router.get('/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { includeDetails, page = 1, limit = 50 } = req.query;

    // Validate quoteId format
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    // Find quote result
    const quoteResult = await QuoteResult.findById(quoteId)
      .populate('groupId', 'name address effectiveDate')
      .lean();

    if (!quoteResult) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    // Build response based on requested details
    const response = {
      quoteId: quoteResult._id,
      groupId: quoteResult.groupId._id,
      groupName: quoteResult.groupId.name,
      status: quoteResult.status,
      summary: quoteResult.summary,
      employerSummary: quoteResult.employerSummary,
      filters: quoteResult.filters,
      statistics: quoteResult.statistics,
      generatedAt: quoteResult.generatedAt,
      updatedAt: quoteResult.updatedAt
    };

    // Include member details if requested
    if (includeDetails === 'true') {
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);

      response.memberQuotes = quoteResult.memberQuotes
        .slice(startIndex, endIndex)
        .map(memberQuote => ({
          memberId: memberQuote.memberId,
          memberName: memberQuote.memberName,
          classId: memberQuote.classId,
          className: memberQuote.className,
          contributions: memberQuote.contributions,
          quoteSummary: memberQuote.quoteSummary,
          selectedPlan: memberQuote.selectedPlan,
          errors: memberQuote.errors
        }));

      response.pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        totalMembers: quoteResult.memberQuotes.length,
        totalPages: Math.ceil(quoteResult.memberQuotes.length / parseInt(limit))
      };
    }

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching quote:', error);

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching quote',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/quotes/:quoteId/filters
 * Apply real-time filters to quote results with updated comparison calculations
 * Supports interactive filtering by Carrier, Metal Level, and Market
 */
router.put('/:quoteId/filters', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { filters } = req.body;

    // Validate quoteId format
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    // Validate filters
    if (!filters || typeof filters !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Filters object is required',
        code: 'MISSING_FILTERS'
      });
    }

    // Validate filter values
    if (filters.metalLevel && (!Array.isArray(filters.metalLevel) || filters.metalLevel.some(level => !['Bronze', 'Silver', 'Gold', 'Platinum', 'Catastrophic'].includes(level)))) {
      return res.status(422).json({
        success: false,
        error: 'Invalid metal level values. Valid options: Bronze, Silver, Gold, Platinum, Catastrophic',
        code: 'INVALID_METAL_LEVEL'
      });
    }

    if (filters.market && !['on-market', 'off-market', 'all'].includes(filters.market)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid market value. Valid options: on-market, off-market, all',
        code: 'INVALID_MARKET'
      });
    }

    console.log(`Applying real-time filters to quote ${quoteId}:`, filters);

    // Apply filters and get updated comparison data
    const filteredResult = await QuoteService.applyFiltersToQuote(quoteId, filters);

    res.status(200).json({
      success: true,
      data: {
        quoteId: filteredResult.quoteId,
        groupId: filteredResult.groupId,
        appliedFilters: filteredResult.appliedFilters,
        comparisonSummary: filteredResult.comparisonSummary,
        memberCount: filteredResult.memberQuotes.length,
        filteredAt: filteredResult.filteredAt,
        message: 'Filters applied successfully - employer and employee comparison data updated in real-time'
      }
    });

  } catch (error) {
    console.error('Error applying quote filters:', error);

    if (error.message.includes('Quote not found')) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while applying filters',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/quotes/:quoteId/filtered
 * Get filtered quote results with detailed member data
 */
router.get('/:quoteId/filtered', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { 
      carrier, 
      metalLevel, 
      market = 'all',
      includeMembers = 'false',
      page = 1,
      limit = 50
    } = req.query;

    // Validate quoteId format
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    // Build filters from query parameters
    const filters = {};
    if (carrier) {
      filters.carrier = Array.isArray(carrier) ? carrier : [carrier];
    }
    if (metalLevel) {
      filters.metalLevel = Array.isArray(metalLevel) ? metalLevel : [metalLevel];
    }
    if (market && market !== 'all') {
      filters.market = market;
    }

    console.log(`Getting filtered quote results for ${quoteId}:`, filters);

    // Apply filters and get results
    const filteredResult = await QuoteService.applyFiltersToQuote(quoteId, filters);

    const response = {
      quoteId: filteredResult.quoteId,
      groupId: filteredResult.groupId,
      appliedFilters: filteredResult.appliedFilters,
      comparisonSummary: filteredResult.comparisonSummary,
      memberCount: filteredResult.memberQuotes.length,
      filteredAt: filteredResult.filteredAt
    };

    // Include member details if requested
    if (includeMembers === 'true') {
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      
      response.memberQuotes = filteredResult.memberQuotes
        .slice(startIndex, endIndex)
        .map(memberQuote => ({
          memberId: memberQuote.memberId,
          memberName: memberQuote.memberName,
          classId: memberQuote.classId,
          zipCode: memberQuote.zipCode,
          county: memberQuote.county,
          previousPlan: memberQuote.previousPlan,
          memberSummary: memberQuote.memberSummary,
          bestPlan: memberQuote.bestPlan,
          subsidyEligibility: memberQuote.subsidyEligibility,
          planOptionsCount: {
            onMarket: memberQuote.planOptions.onMarket.totalPlans,
            offMarket: memberQuote.planOptions.offMarket.totalPlans,
            total: memberQuote.planOptions.onMarket.totalPlans + memberQuote.planOptions.offMarket.totalPlans
          }
        }));
      
      response.pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        totalMembers: filteredResult.memberQuotes.length,
        totalPages: Math.ceil(filteredResult.memberQuotes.length / parseInt(limit))
      };
    }

    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error getting filtered quote results:', error);

    if (error.message.includes('Quote not found')) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while getting filtered results',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/quotes/:quoteId/employee/:memberId
 * Get detailed comparison for a specific employee with filtering
 */
router.get('/:quoteId/employee/:memberId', async (req, res) => {
  try {
    const { quoteId, memberId } = req.params;
    const { carrier, metalLevel, market = 'all' } = req.query;

    // Validate IDs
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    if (!memberId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid member ID format',
        code: 'INVALID_MEMBER_ID'
      });
    }

    // Build filters
    const filters = {};
    if (carrier) {
      filters.carrier = Array.isArray(carrier) ? carrier : [carrier];
    }
    if (metalLevel) {
      filters.metalLevel = Array.isArray(metalLevel) ? metalLevel : [metalLevel];
    }
    if (market && market !== 'all') {
      filters.market = market;
    }

    console.log(`Getting employee comparison for member ${memberId} in quote ${quoteId}`);

    // Get employee comparison with filters
    const employeeComparison = await QuoteService.getEmployeeComparison(quoteId, memberId, filters);

    res.status(200).json({
      success: true,
      data: employeeComparison,
      message: `Employee comparison generated with ${employeeComparison.comparison.totalPlanOptions} filtered plan options`
    });

  } catch (error) {
    console.error('Error getting employee comparison:', error);

    if (error.message.includes('Quote not found')) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    if (error.message.includes('Member not found')) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in quote',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while getting employee comparison',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/quotes/:quoteId/summary
 * Get comprehensive quote summary with employer and employee comparisons
 * This is the centerpiece endpoint for the detailed summary page
 */
router.get('/:quoteId/summary', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { 
      carrier, 
      metalLevel, 
      market = 'all',
      includeEmployeeDetails = 'true'
    } = req.query;

    // Validate quoteId format
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    // Build filters from query parameters
    const filters = {};
    if (carrier) {
      filters.carrier = Array.isArray(carrier) ? carrier : [carrier];
    }
    if (metalLevel) {
      filters.metalLevel = Array.isArray(metalLevel) ? metalLevel : [metalLevel];
    }
    if (market && market !== 'all') {
      filters.market = market;
    }

    console.log(`Generating comprehensive quote summary for ${quoteId}`);
    console.log('Filters:', filters);
    
    // First get the original quote
    const originalQuote = await QuoteResult.findById(quoteId);
    if (!originalQuote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    // Get filtered results with comprehensive comparison data
    const filteredResult = await QuoteService.applyFiltersToQuote(quoteId, filters);
    console.log('Filtered result received:', !!filteredResult);
    
    console.log('📈 Filtered result structure:', {
      hasComparisonSummary: !!filteredResult.comparisonSummary,
      hasEmployerData: !!filteredResult.comparisonSummary?.employer,
      hasEmployeeData: !!filteredResult.comparisonSummary?.employees,
      memberQuotesCount: filteredResult.memberQuotes?.length
    });
    
    // Add detailed debugging for the comparison summary
    if (filteredResult.comparisonSummary) {
      console.log('💰 Comparison Summary Details:', {
        employer: {
          oldMonthlyCost: filteredResult.comparisonSummary.employer?.oldMonthlyCost || 0,
          newMonthlyCost: filteredResult.comparisonSummary.employer?.newMonthlyCost || 0,
          monthlySavings: filteredResult.comparisonSummary.employer?.monthlySavings || 0,
          savingsPercentage: filteredResult.comparisonSummary.employer?.savingsPercentage || 0
        },
        employees: {
          oldMonthlyCost: filteredResult.comparisonSummary.employees?.oldMonthlyCost || 0,
          newMonthlyCost: filteredResult.comparisonSummary.employees?.newMonthlyCost || 0,
          monthlySavings: filteredResult.comparisonSummary.employees?.monthlySavings || 0
        }
      });
      
      // Check sample member data
      if (filteredResult.memberQuotes?.length > 0) {
        const sampleMember = filteredResult.memberQuotes[0];
        console.log('👤 Sample Member Data:', {
          memberName: sampleMember.memberName,
          previousPlan: sampleMember.previousPlan,
          memberSummary: sampleMember.memberSummary,
          hasICHRAContribution: !!(sampleMember.memberSummary?.ichraContribution)
        });
      }
    }

    // Build comprehensive summary response
    let summaryResponse;
    try {
      // Add defensive checks for nested properties
      const comparisonSummary = filteredResult.comparisonSummary || {};
      const employer = comparisonSummary.employer || {};
      const employees = comparisonSummary.employees || {};
      const overall = comparisonSummary.overall || {};
      const subsidyAnalysis = comparisonSummary.subsidyAnalysis || {};
      const planAnalysis = comparisonSummary.planAnalysis || {};
      
      summaryResponse = {
      quoteId: filteredResult.quoteId,
      groupId: filteredResult.groupId,
      appliedFilters: filteredResult.appliedFilters,
      
      // Employer Comparison (as required) - use original quote data if comparison is empty
      employerComparison: {
        oldPlan: {
          totalMonthlyCost: employer.oldMonthlyCost || originalQuote.employerSummary?.oldTotalCost || 0,
          totalAnnualCost: (employer.oldMonthlyCost || originalQuote.employerSummary?.oldTotalCost || 0) * 12,
          description: 'Total cost for employer under old plan (sum of all old employer contributions)'
        },
        newICHRAPlan: {
          totalMonthlyCost: employer.newMonthlyCost || originalQuote.employerSummary?.newTotalCost || 0,
          totalAnnualCost: (employer.newMonthlyCost || originalQuote.employerSummary?.newTotalCost || 0) * 12,
          description: 'Total cost for employer with new ICHRA plan (sum of all class-based contributions)'
        },
        savings: {
          monthlySavings: employer.monthlySavings || originalQuote.employerSummary?.monthlySavings || 0,
          annualSavings: employer.annualSavings || originalQuote.employerSummary?.annualSavings || 0,
          savingsPercentage: employer.savingsPercentage || originalQuote.employerSummary?.savingsPercentage || 0,
          isPositiveSavings: (employer.monthlySavings || originalQuote.employerSummary?.monthlySavings || 0) > 0
        },
        totalEmployees: employer.totalEmployees || originalQuote.employerSummary?.totalMembers || 0
      },

      // Employee Summary (as required)
      employeeSummary: {
        oldPlan: {
          totalMonthlyCost: employees.oldMonthlyCost || 0,
          totalAnnualCost: (employees.oldMonthlyCost || 0) * 12,
          averageMonthlyCostPerEmployee: (employer.totalEmployees || 1) > 0 ? (employees.oldMonthlyCost || 0) / (employer.totalEmployees || 1) : 0
        },
        newICHRAPlans: {
          totalMonthlyCost: employees.newMonthlyCost || 0,
          totalAnnualCost: (employees.newMonthlyCost || 0) * 12,
          averageMonthlyCostPerEmployee: (employer.totalEmployees || 1) > 0 ? (employees.newMonthlyCost || 0) / (employer.totalEmployees || 1) : 0
        },
        savings: {
          totalMonthlySavings: employees.monthlySavings || 0,
          totalAnnualSavings: employees.annualSavings || 0,
          averageSavingsPerEmployee: employees.averageSavingsPerEmployee || 0,
          savingsPercentage: employees.savingsPercentage || 0
        }
      },

      // Overall Analysis - Use stored data if not in filtered result
      overallAnalysis: overall.complianceRate !== undefined ? overall : (originalQuote.comparisonSummary?.overall || {}),
      subsidyAnalysis: subsidyAnalysis.subsidyEligibleCount !== undefined ? subsidyAnalysis : (originalQuote.comparisonSummary?.subsidyAnalysis || {}),
      planAnalysis: {
        ...(planAnalysis.averagePremium !== undefined ? planAnalysis : (originalQuote.comparisonSummary?.planAnalysis || {})),
        // Add premium range calculations
        premiumRange: (() => {
          const allPremiums = [];
          filteredResult.memberQuotes?.forEach(mq => {
            [...(mq.planOptions?.onMarket?.plans || []), ...(mq.planOptions?.offMarket?.plans || [])].forEach(plan => {
              if (plan.premium > 0) allPremiums.push(plan.premium);
            });
          });
          
          if (allPremiums.length === 0) {
            return { lowest: 0, average: 0, highest: 0 };
          }
          
          allPremiums.sort((a, b) => a - b);
          return {
            lowest: allPremiums[0] || 0,
            average: allPremiums.reduce((a, b) => a + b, 0) / allPremiums.length,
            highest: allPremiums[allPremiums.length - 1] || 0
          };
        })()
      },

      // Available filter options for the UI
      availableFilters: {
        carriers: [...new Set((filteredResult.memberQuotes || []).flatMap(mq => {
          if (!mq || !mq.planOptions) return [];
          const onMarketPlans = mq.planOptions.onMarket?.plans || [];
          const offMarketPlans = mq.planOptions.offMarket?.plans || [];
          return [...onMarketPlans, ...offMarketPlans]
            .filter(p => p && p.carrier)
            .map(p => p.carrier);
        }))].filter(Boolean),
        metalLevels: [...new Set((filteredResult.memberQuotes || []).flatMap(mq => {
          if (!mq || !mq.planOptions) return [];
          const onMarketPlans = mq.planOptions.onMarket?.plans || [];
          const offMarketPlans = mq.planOptions.offMarket?.plans || [];
          return [...onMarketPlans, ...offMarketPlans]
            .filter(p => p && p.metalLevel)
            .map(p => p.metalLevel);
        }))].filter(Boolean),
        markets: ['on-market', 'off-market', 'all']
      },

      generatedAt: filteredResult.generatedAt,
      filteredAt: filteredResult.filteredAt
    };

    // Include individual employee details if requested
    if (includeEmployeeDetails === 'true') {
      summaryResponse.employeeDetails = (filteredResult.memberQuotes || []).map(memberQuote => {
        if (!memberQuote) return null;
        
        const previousPlan = memberQuote.previousPlan || {};
        const memberSummary = memberQuote.memberSummary || {};
        const subsidyEligibility = memberQuote.subsidyEligibility || {};
        
        const oldCost = previousPlan.memberContribution || 0;
        const newCost = memberSummary.bestPlanCost || 0;
        const monthlySavings = oldCost - newCost;
        
        return {
          memberId: memberQuote.memberId,
          memberName: memberQuote.memberName || 'Unknown',
          oldOutOfPocketCost: oldCost,
          newOutOfPocketCost: newCost,
          monthlySavings: monthlySavings,
          annualSavings: monthlySavings * 12,
          savingsPercentage: oldCost > 0 ? (monthlySavings / oldCost) * 100 : 0,
          bestPlan: memberQuote.bestPlan || null,
          planOptionsCount: memberSummary.planOptionsCount || { onMarket: 0, offMarket: 0, total: 0 },
          subsidyEligible: subsidyEligibility.isEligible || false,
          ichraContribution: memberSummary.ichraContribution || 0
        };
      }).filter(Boolean);
    }

    } catch (summaryError) {
      console.error('Error building summary response:', summaryError);
      console.error('Error stack:', summaryError.stack);
      
      // Return a minimal response if summary building fails
      summaryResponse = {
        quoteId: filteredResult.quoteId,
        groupId: filteredResult.groupId,
        appliedFilters: filteredResult.appliedFilters,
        error: 'Some data could not be processed',
        employerComparison: {
          oldPlan: { totalMonthlyCost: 0, totalAnnualCost: 0 },
          newICHRAPlan: { totalMonthlyCost: 0, totalAnnualCost: 0 },
          savings: { monthlySavings: 0, annualSavings: 0, savingsPercentage: 0, isPositiveSavings: false },
          totalEmployees: 0
        },
        employeeSummary: {
          oldPlan: { totalMonthlyCost: 0, totalAnnualCost: 0, averageMonthlyCostPerEmployee: 0 },
          newICHRAPlans: { totalMonthlyCost: 0, totalAnnualCost: 0, averageMonthlyCostPerEmployee: 0 },
          savings: { totalMonthlySavings: 0, totalAnnualSavings: 0, averageSavingsPerEmployee: 0, savingsPercentage: 0 }
        },
        overallAnalysis: {},
        subsidyAnalysis: {},
        planAnalysis: {},
        availableFilters: { carriers: [], metalLevels: [], markets: ['all'] },
        generatedAt: filteredResult.generatedAt || new Date(),
        filteredAt: filteredResult.filteredAt || new Date()
      };
    }

    res.status(200).json({
      success: true,
      data: summaryResponse,
      message: 'Comprehensive quote summary generated successfully'
    });

  } catch (error) {
    console.error('Error generating quote summary:', error);
    console.error('Error stack:', error.stack);
    
    // If the error is from summary building, return minimal response
    if (summaryResponse === undefined) {
      summaryResponse = {
        quoteId: currentQuote?.id || 'unknown',
        groupId: groupId || 'unknown',
        error: 'Failed to build complete summary',
        employerComparison: {
          oldPlan: { totalMonthlyCost: 0, totalAnnualCost: 0 },
          newICHRAPlan: { totalMonthlyCost: 0, totalAnnualCost: 0 },
          savings: { monthlySavings: 0, annualSavings: 0, savingsPercentage: 0, isPositiveSavings: false },
          totalEmployees: 0
        },
        employeeSummary: {
          oldPlan: { totalMonthlyCost: 0, totalAnnualCost: 0, averageMonthlyCostPerEmployee: 0 },
          newICHRAPlans: { totalMonthlyCost: 0, totalAnnualCost: 0, averageMonthlyCostPerEmployee: 0 },
          savings: { totalMonthlySavings: 0, totalAnnualSavings: 0, averageSavingsPerEmployee: 0, savingsPercentage: 0 }
        },
        overallAnalysis: {},
        subsidyAnalysis: {},
        planAnalysis: {},
        availableFilters: { carriers: [], metalLevels: [], markets: ['all'] }
      };
    }

    if (error.message.includes('Quote not found')) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while generating quote summary',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/quotes/:quoteId/export
 * Export quote results in various formats
 */
router.post('/:quoteId/export', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { format = 'csv', includeDetails = true } = req.body;

    // Validate quoteId format
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    // Validate export format
    const validFormats = ['csv', 'excel', 'pdf', 'json'];
    if (!validFormats.includes(format)) {
      return res.status(422).json({
        success: false,
        error: `Invalid export format. Valid options: ${validFormats.join(', ')}`,
        code: 'INVALID_EXPORT_FORMAT'
      });
    }

    // Find quote result
    const quoteResult = await QuoteService.getQuoteResult(quoteId);
    if (!quoteResult) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    console.log(`Exporting quote ${quoteId} in ${format} format`);

    // Export quote data
    const exportResult = await QuoteService.exportQuote(quoteId, {
      format,
      includeDetails
    });

    if (!exportResult.success) {
      return res.status(400).json({
        success: false,
        error: exportResult.error || 'Failed to export quote',
        code: 'EXPORT_FAILED'
      });
    }

    // Set appropriate headers based on format
    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="quote_${quoteId}.csv"`);
        break;
      case 'excel':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="quote_${quoteId}.xlsx"`);
        break;
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="quote_${quoteId}.pdf"`);
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="quote_${quoteId}.json"`);
        break;
    }

    // Send the exported data
    if (format === 'json') {
      res.json(exportResult.data);
    } else {
      res.send(exportResult.data);
    }

  } catch (error) {
    console.error('Error exporting quote:', error);

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while exporting quote',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/quotes/group/:groupId
 * Get all quotes for a specific group
 */
router.get('/group/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 10, sortBy = 'generatedAt', order = 'desc' } = req.query;

    // Validate groupId format
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Build query
    const query = { groupId: groupId };
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    // Get quotes with pagination
    const quotes = await QuoteResult.find(query)
      .select('_id status summary employerSummary generatedAt updatedAt')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count
    const totalQuotes = await QuoteResult.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        groupId: groupId,
        groupName: group.name,
        quotes: quotes.map(quote => ({
          quoteId: quote._id,
          status: quote.status,
          summary: {
            totalMembers: quote.summary.totalMembers,
            successfulQuotes: quote.summary.successfulQuotes,
            totalPlanCount: quote.summary.totalPlanCount
          },
          employerSummary: {
            totalMonthlyContribution: quote.employerSummary.totalMonthlyContribution,
            totalAnnualContribution: quote.employerSummary.totalAnnualContribution,
            averageSavingsPerEmployee: quote.employerSummary.averageSavingsPerEmployee
          },
          generatedAt: quote.generatedAt,
          updatedAt: quote.updatedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalQuotes,
          totalPages: Math.ceil(totalQuotes / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error fetching group quotes:', error);

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching quotes',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * DELETE /api/quotes/:quoteId
 * Delete a quote (soft delete)
 */
router.delete('/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;

    // Validate quoteId format
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    // Find and update quote
    const quote = await QuoteResult.findById(quoteId);
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    // Soft delete by updating status
    quote.status = 'archived';
    await quote.save();

    res.status(200).json({
      success: true,
      data: {
        quoteId: quote._id,
        status: 'archived',
        archivedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error deleting quote:', error);

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting quote',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/quotes/:quoteId/filters/available
 * Get all available filter options for a quote (carriers, metal levels, etc.)
 */
router.get('/:quoteId/filters/available', async (req, res) => {
  try {
    const { quoteId } = req.params;

    // Validate quoteId format
    if (!quoteId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      });
    }

    // Find quote result
    const quoteResult = await QuoteResult.findById(quoteId);
    if (!quoteResult) {
      return res.status(404).json({
        success: false,
        error: 'Quote not found',
        code: 'QUOTE_NOT_FOUND'
      });
    }

    // Extract all unique filter values from member quotes
    const carriers = new Set();
    const metalLevels = new Set();
    const planTypes = new Set();
    let hasOnMarketPlans = false;
    let hasOffMarketPlans = false;

    quoteResult.memberQuotes.forEach(memberQuote => {
      // Check on-market plans
      if (memberQuote.planOptions.onMarket.plans) {
        hasOnMarketPlans = true;
        memberQuote.planOptions.onMarket.plans.forEach(plan => {
          if (plan.carrier) carriers.add(plan.carrier);
          if (plan.metalLevel) metalLevels.add(plan.metalLevel);
          if (plan.planType) planTypes.add(plan.planType);
        });
      }

      // Check off-market plans
      if (memberQuote.planOptions.offMarket.plans) {
        hasOffMarketPlans = true;
        memberQuote.planOptions.offMarket.plans.forEach(plan => {
          if (plan.carrier) carriers.add(plan.carrier);
          if (plan.metalLevel) metalLevels.add(plan.metalLevel);
          if (plan.planType) planTypes.add(plan.planType);
        });
      }
    });

    // Build market options based on available plans
    const marketOptions = ['all'];
    if (hasOnMarketPlans) marketOptions.push('on-market');
    if (hasOffMarketPlans) marketOptions.push('off-market');

    res.status(200).json({
      success: true,
      data: {
        quoteId: quoteId,
        availableFilters: {
          carriers: Array.from(carriers).sort(),
          metalLevels: Array.from(metalLevels).sort(),
          planTypes: Array.from(planTypes).sort(),
          markets: marketOptions
        },
        statistics: {
          totalCarriers: carriers.size,
          totalMetalLevels: metalLevels.size,
          totalPlanTypes: planTypes.size,
          hasOnMarketPlans,
          hasOffMarketPlans,
          totalMembers: quoteResult.memberQuotes.length
        }
      }
    });

  } catch (error) {
    console.error('Error getting available filters:', error);

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while getting available filters',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;