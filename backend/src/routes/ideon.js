// Ideon API Integration Routes
// Provides endpoints for testing and managing Ideon API integration

const express = require('express');
const router = express.Router();
const IdeonAPIService = require('../services/IdeonAPIService');
const ICHRAService = require('../services/ICHRAService');
const { IdeonAPI } = require('../config/ideonApi');

/**
 * GET /api/ideon/health
 * Check Ideon API connectivity and rate limit status
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await IdeonAPIService.healthCheck();
    const configStatus = IdeonAPI.isConfigured();
    
    res.json({
      success: true,
      data: {
        api_connectivity: healthCheck,
        configuration: configStatus,
        rate_limits: IdeonAPIService.getRateLimitStatus(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Failed to perform Ideon API health check',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/ideon/groups
 * Test group creation in Ideon API
 */
router.post('/groups', async (req, res) => {
  try {
    const { groupName, address, effectiveDate, contactEmail, contactName, contactPhone } = req.body;
    
    // Validate required fields
    if (!groupName || !address || !effectiveDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: groupName, address, effectiveDate'
        }
      });
    }
    
    const groupData = {
      name: groupName, // Fix: IdeonAPIService expects 'name' not 'groupName'
      contactEmail,
      contactName,
      contactPhone,
      address: {
        street: address.street,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        county: address.county
      },
      effectiveDate
    };
    
    const result = await IdeonAPIService.createGroup(groupData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Group created successfully in Ideon API'
    });
    
  } catch (error) {
    console.error('Error creating group in Ideon:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'GROUP_CREATION_FAILED',
        message: error.message || 'Failed to create group in Ideon API',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/ideon/groups/:groupId/members
 * Test member creation in Ideon API
 */
router.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const memberData = req.body;
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'zipCode'];
    const missingFields = requiredFields.filter(field => !memberData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing required fields: ${missingFields.join(', ')}`
        }
      });
    }
    
    const result = await IdeonAPIService.createMember(groupId, memberData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Member created successfully in Ideon API'
    });
    
  } catch (error) {
    console.error('Error creating member in Ideon:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'MEMBER_CREATION_FAILED',
        message: error.message || 'Failed to create member in Ideon API',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/ideon/quotes
 * Test quote creation in Ideon API
 */
router.post('/quotes', async (req, res) => {
  try {
    const { groupId, effectiveDate, productLine, filters } = req.body;
    
    if (!groupId || !effectiveDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: groupId, effectiveDate'
        }
      });
    }
    
    const quoteParameters = {
      effectiveDate,
      productLine: productLine || 'individual',
      marketType: 'individual',
      coverageType: 'medical',
      metalLevels: filters?.metalLevels || ['bronze', 'silver', 'gold', 'platinum'],
      planTypes: filters?.planTypes || ['hmo', 'ppo', 'epo'],
      carriers: filters?.carriers || []
    };
    
    const result = await IdeonAPIService.createQuote(groupId, quoteParameters);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Quote created successfully in Ideon API'
    });
    
  } catch (error) {
    console.error('Error creating quote in Ideon:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'QUOTE_CREATION_FAILED',
        message: error.message || 'Failed to create quote in Ideon API',
        details: error.details
      }
    });
  }
});

/**
 * GET /api/ideon/quotes/:quoteId
 * Get quote results from Ideon API
 */
router.get('/quotes/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    
    const result = await IdeonAPIService.getQuote(quoteId);
    
    res.json({
      success: true,
      data: result,
      message: 'Quote retrieved successfully from Ideon API'
    });
    
  } catch (error) {
    console.error('Error retrieving quote from Ideon:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'QUOTE_RETRIEVAL_FAILED',
        message: error.message || 'Failed to retrieve quote from Ideon API',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/ideon/ichra/group-affordability
 * Calculate Group ICHRA Affordability using Official Ideon API
 * Uses /group_ichra_affordability endpoint as required by thingstodo.md
 */
router.post('/ichra/group-affordability', async (req, res) => {
  try {
    const { groupId, options } = req.body;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: groupId'
        }
      });
    }
    
    const result = await ICHRAService.calculateGroupAffordability(groupId, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Group ICHRA affordability calculation initiated successfully'
    });
    
  } catch (error) {
    console.error('Error calculating Group ICHRA affordability:', error);
    
    // Handle specific ICHRA API errors
    if (error.message.includes('ICHRA affordability calculation limit reached')) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'ICHRA_LIMIT_EXCEEDED',
          message: 'ICHRA affordability calculation limit exceeded (10 per trial period)',
          details: 'Upgrade to production account for unlimited calculations'
        }
      });
    }
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'GROUP_ICHRA_CALCULATION_FAILED',
        message: error.message || 'Failed to calculate Group ICHRA affordability',
        details: error.details
      }
    });
  }
});

/**
 * GET /api/ideon/ichra/results/{calculationId}
 * Get Group ICHRA Affordability calculation results
 */
router.get('/ichra/results/:calculationId', async (req, res) => {
  try {
    const { calculationId } = req.params;
    
    if (!calculationId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required parameter: calculationId'
        }
      });
    }
    
    // Try to retrieve and store latest results
    const result = await ICHRAService.retrieveAndStoreResults(calculationId);
    
    res.json({
      success: true,
      data: result,
      message: 'ICHRA affordability results retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error retrieving ICHRA affordability results:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'ICHRA_RESULTS_RETRIEVAL_FAILED',
        message: error.message || 'Failed to retrieve ICHRA affordability results',
        details: error.details
      }
    });
  }
});

/**
 * GET /api/ideon/ichra/group/{groupId}/results
 * Get all ICHRA affordability results for a group
 */
router.get('/ichra/group/:groupId/results', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { latest } = req.query;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required parameter: groupId'
        }
      });
    }
    
    let result;
    if (latest === 'true') {
      result = await ICHRAService.getLatestGroupAffordabilityResults(groupId);
    } else {
      result = await ICHRAService.getGroupAffordabilityResults(groupId);
    }
    
    res.json({
      success: true,
      data: result,
      message: 'Group ICHRA affordability results retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error getting group ICHRA affordability results:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'GROUP_ICHRA_RESULTS_FAILED',
        message: error.message || 'Failed to get group ICHRA affordability results',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/ideon/ichra/affordability (Legacy - Individual Member)
 * Calculate individual member ICHRA affordability (uses group calculation internally)
 */
router.post('/ichra/affordability', async (req, res) => {
  try {
    const { groupId, memberId, options } = req.body;
    
    if (!groupId || !memberId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: groupId, memberId'
        }
      });
    }
    
    const result = await ICHRAService.calculateAffordability(groupId, memberId, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Individual ICHRA affordability calculated successfully'
    });
    
  } catch (error) {
    console.error('Error calculating individual ICHRA affordability:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'INDIVIDUAL_ICHRA_CALCULATION_FAILED',
        message: error.message || 'Failed to calculate individual ICHRA affordability',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/ideon/ichra/minimum-contribution
 * Calculate minimum contribution required for ICHRA compliance
 */
router.post('/ichra/minimum-contribution', async (req, res) => {
  try {
    const { groupId, memberId, options } = req.body;
    
    if (!groupId || !memberId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: groupId, memberId'
        }
      });
    }
    
    const result = await ICHRAService.calculateMinimumContribution(groupId, memberId, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Minimum ICHRA contribution calculated successfully'
    });
    
  } catch (error) {
    console.error('Error calculating minimum ICHRA contribution:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'MINIMUM_CONTRIBUTION_FAILED',
        message: error.message || 'Failed to calculate minimum ICHRA contribution',
        details: error.details
      }
    });
  }
});

/**
 * POST /api/ideon/ichra/group-affordability
 * Calculate ICHRA affordability for entire group
 */
router.post('/ichra/group-affordability', async (req, res) => {
  try {
    const { groupId, options } = req.body;
    
    if (!groupId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: groupId'
        }
      });
    }
    
    const result = await ICHRAService.calculateGroupAffordability(groupId, options);
    
    res.json({
      success: true,
      data: result,
      message: 'Group ICHRA affordability calculated successfully'
    });
    
  } catch (error) {
    console.error('Error calculating group ICHRA affordability:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'GROUP_AFFORDABILITY_FAILED',
        message: error.message || 'Failed to calculate group ICHRA affordability',
        details: error.details
      }
    });
  }
});

/**
 * GET /api/ideon/plans
 * Get available plans from Ideon API
 */
router.get('/plans', async (req, res) => {
  try {
    const filters = {
      county: req.query.county,
      state: req.query.state,
      effective_date: req.query.effective_date,
      metal_levels: req.query.metal_levels ? req.query.metal_levels.split(',') : undefined,
      plan_types: req.query.plan_types ? req.query.plan_types.split(',') : undefined,
      carriers: req.query.carriers ? req.query.carriers.split(',') : undefined
    };
    
    // Remove undefined values
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );
    
    const result = await IdeonAPIService.getPlans(filters);
    
    res.json({
      success: true,
      data: result,
      message: 'Plans retrieved successfully from Ideon API'
    });
    
  } catch (error) {
    console.error('Error retrieving plans from Ideon:', error);
    
    const statusCode = error.status || 500;
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'PLANS_RETRIEVAL_FAILED',
        message: error.message || 'Failed to retrieve plans from Ideon API',
        details: error.details
      }
    });
  }
});

/**
 * GET /api/ideon/rate-limits
 * Get current rate limiting status
 */
router.get('/rate-limits', (req, res) => {
  try {
    const rateLimitStatus = IdeonAPIService.getRateLimitStatus();
    
    res.json({
      success: true,
      data: {
        ...rateLimitStatus,
        timestamp: new Date().toISOString(),
        limits: {
          general: {
            max_per_minute: 100,
            current_reservoir: rateLimitStatus.general.reservoir
          },
          ichra: {
            max_per_trial: 10,
            current_reservoir: rateLimitStatus.ichra.reservoir
          }
        }
      },
      message: 'Rate limit status retrieved successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_STATUS_FAILED',
        message: 'Failed to retrieve rate limit status',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/ideon/test-workflow
 * Test complete Ideon API workflow (Group -> Member -> Quote -> ICHRA)
 */
router.post('/test-workflow', async (req, res) => {
  try {
    const { groupData, memberData, quoteOptions, ichraOptions } = req.body;
    
    const results = {
      workflow_id: `test_${Date.now()}`,
      steps: [],
      success: true,
      errors: []
    };
    
    try {
      // Step 1: Create Group
      console.log('Testing Step 1: Create Group');
      const group = await IdeonAPIService.createGroup(groupData);
      results.steps.push({
        step: 1,
        name: 'Create Group',
        success: true,
        data: group,
        timestamp: new Date().toISOString()
      });
      
      // Step 2: Add Member
      console.log('Testing Step 2: Add Member');
      const member = await IdeonAPIService.createMember(group.id, memberData);
      results.steps.push({
        step: 2,
        name: 'Add Member',
        success: true,
        data: member,
        timestamp: new Date().toISOString()
      });
      
      // Step 3: Create Quote
      console.log('Testing Step 3: Create Quote');
      const quote = await IdeonAPIService.createQuote(group.id, quoteOptions);
      results.steps.push({
        step: 3,
        name: 'Create Quote',
        success: true,
        data: quote,
        timestamp: new Date().toISOString()
      });
      
      // Step 4: Calculate ICHRA Affordability (if requested)
      if (ichraOptions) {
        console.log('Testing Step 4: ICHRA Affordability');
        
        const ichraParams = {
          memberId: member.id,
          groupId: group.id,
          className: memberData.className || 'Full-time Employees',
          memberAge: ichraOptions.memberAge || 35,
          memberZipCode: memberData.zipCode,
          familySize: ichraOptions.familySize || 1,
          householdIncome: ichraOptions.householdIncome || 50000,
          effectiveDate: groupData.effectiveDate,
          contributionAmount: ichraOptions.contributionAmount || 400
        };
        
        const ichra = await IdeonAPIService.calculateICHRAAffordability(ichraParams);
        results.steps.push({
          step: 4,
          name: 'ICHRA Affordability',
          success: true,
          data: ichra,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (stepError) {
      results.success = false;
      results.errors.push({
        step: results.steps.length + 1,
        error: stepError.message,
        code: stepError.code,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(results.success ? 200 : 207).json({
      success: results.success,
      data: results,
      message: results.success ? 
        'Complete Ideon API workflow test successful' : 
        'Ideon API workflow test completed with errors'
    });
    
  } catch (error) {
    console.error('Error in Ideon workflow test:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'WORKFLOW_TEST_FAILED',
        message: 'Failed to execute Ideon API workflow test',
        details: error.message
      }
    });
  }
});

module.exports = router; 