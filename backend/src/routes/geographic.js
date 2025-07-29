const express = require('express');
const router = express.Router();
const GeographicService = require('../services/GeographicService');
const County = require('../models/County');
const PlanCounty = require('../models/PlanCounty');

/**
 * POST /api/geographic/resolve-zip
 * Resolve ZIP code to county information
 */
router.post('/resolve-zip', async (req, res) => {
  try {
    const { zipCode } = req.body;

    // 400 Bad Request - Missing required field
    if (!zipCode) {
      return res.status(400).json({
        success: false,
        error: 'ZIP code is required',
        code: 'MISSING_ZIP_CODE'
      });
    }

    // 422 Unprocessable Entity - Invalid format
    if (typeof zipCode !== 'string' && typeof zipCode !== 'number') {
      return res.status(422).json({
        success: false,
        error: 'ZIP code must be a string or number',
        code: 'INVALID_ZIP_FORMAT'
      });
    }

    // Validation: 5-digit ZIP codes
    const zipNum = parseInt(zipCode);
    if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
      return res.status(422).json({
        success: false,
        error: 'Invalid ZIP code. Must be a valid 5-digit ZIP code.',
        code: 'ZIP_OUT_OF_RANGE'
      });
    }

    // Call GeographicService to resolve county
    const result = await GeographicService.resolveCountyFromZip(zipCode);

    // 200 OK - Success with data
    const response = {
      success: true,
      multipleCounties: !result.single,
      counties: result.single ? [result.county] : result.counties
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error resolving ZIP code:', error);
    
    // 404 Not Found - ZIP code exists but no county mapping
    if (error.message.includes('No county found')) {
      return res.status(404).json({
        success: false,
        error: `No county found for ZIP code ${req.body.zipCode}`,
        code: 'COUNTY_NOT_FOUND'
      });
    }

    // 503 Service Unavailable - External service issues
    if (error.message.includes('service') || error.message.includes('timeout')) {
      return res.status(503).json({
        success: false,
        error: 'Geographic service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while resolving ZIP code',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/geographic/counties
 * List all counties with plan availability counts
 */
router.get('/counties', async (req, res) => {
  try {
    const { state } = req.query;

    // 422 Unprocessable Entity - Invalid state format
    if (state && (typeof state !== 'string' || state.length !== 2)) {
      return res.status(422).json({
        success: false,
        error: 'State must be a 2-character state code',
        code: 'INVALID_STATE_FORMAT'
      });
    }

    // Build query for counties
    let query = {};
    
    // Support state filtering
    if (state) {
      query.stateId = state.toUpperCase();
    }

    // List all 36 counties
    const counties = await County.find(query).sort({ name: 1 });

    // 404 Not Found - No counties found for state filter
    if (state && counties.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No counties found for state: ${state}`,
        code: 'STATE_NOT_FOUND'
      });
    }

    // Include plan availability counts
    const countiesWithPlanCounts = await Promise.all(
      counties.map(async (county) => {
        const planCount = await PlanCounty.countDocuments({ countyId: county.csvId });
        
        return {
          csvId: county.csvId,
          name: county.name,
          stateId: county.stateId,
          availablePlans: planCount
        };
      })
    );

    // 200 OK - Success with data
    res.status(200).json({
      success: true,
      counties: countiesWithPlanCounts,
      total: countiesWithPlanCounts.length
    });
  } catch (error) {
    console.error('Error fetching counties:', error);
    
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
      error: 'Internal server error while fetching counties',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router; 