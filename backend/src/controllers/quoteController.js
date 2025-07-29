const QuoteService = require('../services/QuoteService');
const Group = require('../models/Group');
const Member = require('../models/Member');
const ICHRAClass = require('../models/ICHRAClass');
const QuoteResult = require('../models/QuoteResult');

/**
 * Quote Controller
 * Handles business logic for quote generation and management
 */
class QuoteController {
  /**
   * Generate quotes for an entire group
   */
  async generateQuote(req, res) {
    try {
      const { groupId, options } = req.body;

      // Validate request
      const validation = await this.validateQuoteGeneration(groupId);
      if (!validation.valid) {
        return res.status(validation.status).json({
          success: false,
          error: validation.error,
          code: validation.code
        });
      }

      const { group, memberCount, classCount } = validation;

      console.log(`Generating quotes for group ${group.name} with ${memberCount} members`);

      // Generate quotes using QuoteService
      const quoteResult = await QuoteService.generateGroupQuote(groupId, options);

      if (!quoteResult) {
        return res.status(400).json({
          success: false,
          error: 'Failed to generate quotes',
          code: 'QUOTE_GENERATION_FAILED'
        });
      }

      // Return formatted response
      res.status(201).json({
        success: true,
        data: this.formatQuoteGenerationResponse(quoteResult, group)
      });

    } catch (error) {
      console.error('Detailed quote generation error:', error);
      console.error('Error stack:', error.stack);
      this.handleError(error, res, 'generating quotes');
    }
  }

  /**
   * Get quote results by ID
   */
  async getQuote(req, res) {
    try {
      const { quoteId } = req.params;
      const { includeDetails, page = 1, limit = 50 } = req.query;

      // Validate quote ID
      if (!this.isValidObjectId(quoteId)) {
        return res.status(422).json({
          success: false,
          error: 'Invalid quote ID format',
          code: 'INVALID_QUOTE_ID'
        });
      }

      // Find quote with population
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

      // Build response
      const response = this.buildQuoteResponse(
        quoteResult, 
        includeDetails === 'true',
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: response
      });

    } catch (error) {
      this.handleError(error, res, 'fetching quote');
    }
  }

  /**
   * Update quote filters and recalculate
   */
  async updateQuoteFilters(req, res) {
    try {
      const { quoteId } = req.params;
      const { filters } = req.body;

      // Validate inputs
      const validation = this.validateFilterUpdate(quoteId, filters);
      if (!validation.valid) {
        return res.status(validation.status).json({
          success: false,
          error: validation.error,
          code: validation.code
        });
      }

      // Check quote exists
      const quoteExists = await QuoteService.getQuoteResult(quoteId);
      if (!quoteExists) {
        return res.status(404).json({
          success: false,
          error: 'Quote not found',
          code: 'QUOTE_NOT_FOUND'
        });
      }

      console.log(`Updating filters for quote ${quoteId}`);

      // Update filters
      const updatedQuote = await QuoteService.applyFiltersToQuote(quoteId, filters);

      if (!updatedQuote) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update quote filters',
          code: 'FILTER_UPDATE_FAILED'
        });
      }

      res.status(200).json({
        success: true,
        data: this.formatFilterUpdateResponse(updatedQuote)
      });

    } catch (error) {
      this.handleError(error, res, 'updating quote filters');
    }
  }

  /**
   * Export quote in various formats
   */
  async exportQuote(req, res) {
    try {
      const { quoteId } = req.params;
      const { format = 'csv', includeDetails = true } = req.body;

      // Validate inputs
      const validation = this.validateExportRequest(quoteId, format);
      if (!validation.valid) {
        return res.status(validation.status).json({
          success: false,
          error: validation.error,
          code: validation.code
        });
      }

      // Check quote exists
      const quoteExists = await QuoteService.getQuoteResult(quoteId);
      if (!quoteExists) {
        return res.status(404).json({
          success: false,
          error: 'Quote not found',
          code: 'QUOTE_NOT_FOUND'
        });
      }

      console.log(`Exporting quote ${quoteId} in ${format} format`);

      // Export quote
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

      // Set headers and send response
      this.setExportHeaders(res, format, quoteId);
      
      if (format === 'json') {
        res.json(exportResult.data);
      } else {
        res.send(exportResult.data);
      }

    } catch (error) {
      this.handleError(error, res, 'exporting quote');
    }
  }

  /**
   * Get all quotes for a group
   */
  async getGroupQuotes(req, res) {
    try {
      const { groupId } = req.params;
      const queryParams = this.parseQueryParams(req.query);

      // Validate group ID
      if (!this.isValidObjectId(groupId)) {
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

      // Get quotes with pagination
      const result = await this.fetchGroupQuotes(groupId, queryParams);

      res.status(200).json({
        success: true,
        data: {
          groupId: groupId,
          groupName: group.name,
          quotes: result.quotes,
          pagination: result.pagination
        }
      });

    } catch (error) {
      this.handleError(error, res, 'fetching group quotes');
    }
  }

  /**
   * Delete (archive) a quote
   */
  async deleteQuote(req, res) {
    try {
      const { quoteId } = req.params;

      // Validate quote ID
      if (!this.isValidObjectId(quoteId)) {
        return res.status(422).json({
          success: false,
          error: 'Invalid quote ID format',
          code: 'INVALID_QUOTE_ID'
        });
      }

      // Find and archive quote
      const quote = await QuoteResult.findById(quoteId);
      if (!quote) {
        return res.status(404).json({
          success: false,
          error: 'Quote not found',
          code: 'QUOTE_NOT_FOUND'
        });
      }

      // Archive the quote
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
      this.handleError(error, res, 'deleting quote');
    }
  }

  // Helper Methods

  async validateQuoteGeneration(groupId) {
    // Validate group ID format
    if (!groupId) {
      return {
        valid: false,
        status: 400,
        error: 'Group ID is required',
        code: 'MISSING_GROUP_ID'
      };
    }

    if (!this.isValidObjectId(groupId)) {
      return {
        valid: false,
        status: 422,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      };
    }

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return {
        valid: false,
        status: 404,
        error: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      };
    }

    // Check for active members
    const memberCount = await Member.countDocuments({ 
      groupId: groupId, 
      status: 'active' 
    });

    if (memberCount === 0) {
      return {
        valid: false,
        status: 422,
        error: 'Group has no active members to quote',
        code: 'NO_ACTIVE_MEMBERS'
      };
    }

    // Check for ICHRA classes
    const classCount = await ICHRAClass.countDocuments({ 
      groupId: groupId, 
      isActive: true 
    });

    if (classCount === 0) {
      return {
        valid: false,
        status: 422,
        error: 'Group has no ICHRA classes defined',
        code: 'NO_ICHRA_CLASSES'
      };
    }

    return {
      valid: true,
      group,
      memberCount,
      classCount
    };
  }

  validateFilterUpdate(quoteId, filters) {
    if (!this.isValidObjectId(quoteId)) {
      return {
        valid: false,
        status: 422,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      };
    }

    if (!filters || typeof filters !== 'object') {
      return {
        valid: false,
        status: 400,
        error: 'Filters object is required',
        code: 'MISSING_FILTERS'
      };
    }

    return { valid: true };
  }

  validateExportRequest(quoteId, format) {
    if (!this.isValidObjectId(quoteId)) {
      return {
        valid: false,
        status: 422,
        error: 'Invalid quote ID format',
        code: 'INVALID_QUOTE_ID'
      };
    }

    const validFormats = ['csv', 'excel', 'pdf', 'json'];
    if (!validFormats.includes(format)) {
      return {
        valid: false,
        status: 422,
        error: `Invalid export format. Valid options: ${validFormats.join(', ')}`,
        code: 'INVALID_EXPORT_FORMAT'
      };
    }

    return { valid: true };
  }

  parseQueryParams(query) {
    return {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      sortBy: query.sortBy || 'generatedAt',
      order: query.order || 'desc'
    };
  }

  async fetchGroupQuotes(groupId, params) {
    const query = { groupId: groupId };
    const sortOptions = {};
    sortOptions[params.sortBy] = params.order === 'asc' ? 1 : -1;

    const quotes = await QuoteResult.find(query)
      .select('_id status summary employerSummary generatedAt updatedAt')
      .sort(sortOptions)
      .limit(params.limit)
      .skip((params.page - 1) * params.limit)
      .lean();

    const totalQuotes = await QuoteResult.countDocuments(query);

    return {
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
        page: params.page,
        limit: params.limit,
        totalQuotes,
        totalPages: Math.ceil(totalQuotes / params.limit)
      }
    };
  }

  formatQuoteGenerationResponse(quoteResult, group) {
    const totalMembers = quoteResult.memberQuotes?.length || 0;
    const successfulQuotes = quoteResult.memberQuotes?.filter(mq => mq.bestPlan).length || 0;
    
    return {
      quoteId: quoteResult._id,
      groupId: quoteResult.groupId,
      groupName: group.name,
      summary: {
        totalMembers: totalMembers,
        successfulQuotes: successfulQuotes,
        failedQuotes: totalMembers - successfulQuotes,
        totalPlanCount: quoteResult.memberQuotes?.reduce((sum, mq) => sum + (mq.memberSummary?.planOptionsCount?.total || 0), 0) || 0,
        generatedAt: quoteResult.generatedAt
      },
      employerSummary: quoteResult.employerSummary,
      message: 'Quotes generated successfully'
    };
  }

  buildQuoteResponse(quoteResult, includeDetails, page, limit) {
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

    if (includeDetails) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

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
        page,
        limit,
        totalMembers: quoteResult.memberQuotes.length,
        totalPages: Math.ceil(quoteResult.memberQuotes.length / limit)
      };
    }

    return response;
  }

  formatFilterUpdateResponse(updatedQuote) {
    return {
      quoteId: updatedQuote.quoteId,
      groupId: updatedQuote.groupId,
      appliedFilters: updatedQuote.appliedFilters,
      comparisonSummary: updatedQuote.comparisonSummary,
      memberCount: updatedQuote.memberQuotes?.length || 0,
      filteredAt: updatedQuote.filteredAt
    };
  }

  setExportHeaders(res, format, quoteId) {
    const contentTypes = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      json: 'application/json'
    };

    const extensions = {
      csv: 'csv',
      excel: 'xlsx',
      pdf: 'pdf',
      json: 'json'
    };

    res.setHeader('Content-Type', contentTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="quote_${quoteId}.${extensions[format]}"`);
  }

  isValidObjectId(id) {
    return id && id.match(/^[0-9a-fA-F]{24}$/);
  }

  handleError(error, res, context) {
    console.error(`Error ${context}:`, error);

    // Handle specific error types
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
      error: `Internal server error while ${context}`,
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = new QuoteController();