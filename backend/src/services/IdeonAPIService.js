const axios = require('axios');
const Bottleneck = require('bottleneck');
const { IDEON_CONFIG, IdeonAPI } = require('../config/ideonApi');

class IdeonAPIService {
  constructor() {
    // Rate Limiting Implementation - Updated with correct limits
    this.limiter = new Bottleneck({
      // Verified rate limits: 100 requests/minute production, 5/minute trial
      reservoir: IDEON_CONFIG.rateLimiting.reservoir,
      reservoirRefreshAmount: IDEON_CONFIG.rateLimiting.reservoirRefreshAmount,
      reservoirRefreshInterval: IDEON_CONFIG.rateLimiting.reservoirRefreshInterval,

      // Concurrent requests and timing
      maxConcurrent: IDEON_CONFIG.rateLimiting.maxConcurrent,
      minTime: IDEON_CONFIG.rateLimiting.minTime, // 600ms between requests

      // Exponential backoff on failures
      retryDelayGenerators: {
        429: (attemptNumber) => Math.pow(2, attemptNumber) * 1000, // Rate limit retry
        500: (attemptNumber) => Math.pow(2, attemptNumber) * 1000,
        502: (attemptNumber) => Math.pow(2, attemptNumber) * 1000,
        503: (attemptNumber) => Math.pow(2, attemptNumber) * 1000,
        504: (attemptNumber) => Math.pow(2, attemptNumber) * 1000
      }
    });

    // ICHRA Affordability special limiter (10 per eternity in trial)
    this.ichraLimiter = new Bottleneck({
      reservoir: IDEON_CONFIG.rateLimiting.ichraAffordabilityLimit,
      reservoirRefreshAmount: 0, // No refresh in trial - 10 total
      maxConcurrent: 1,
      minTime: 1000 // 1 second between ICHRA requests
    });

    // Queue monitoring
    this.limiter.on('idle', () => {
      if (IDEON_CONFIG.development.enableLogging) {
        console.log('Ideon API queue is idle');
      }
    });

    this.limiter.on('depleted', () => {
      console.warn('Ideon API rate limit depleted - waiting for refresh');
    });

    this.limiter.on('error', (error) => {
      console.error('Ideon API limiter error:', error);
    });

    // Setup axios instance with correct authentication
    this.apiClient = axios.create({
      baseURL: IDEON_CONFIG.baseURL,
      headers: IdeonAPI.getHeaders(),
      timeout: IDEON_CONFIG.timeout
    });

    // Setup enrollment API client for groups and members
    this.enrollmentClient = axios.create({
      baseURL: IDEON_CONFIG.enrollmentURL,
      headers: IdeonAPI.getHeaders(),
      timeout: IDEON_CONFIG.timeout
    });
  }

  /**
   * Step 1: Create a Group (representation of Employer and office locations)
   * This is the first step in the Group Rating Workflow
   */
  async createGroup(groupData) {
    return this.limiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        console.log('Creating group in Ideon:', groupData.name);
        
        // Look up FIPS code from ZIP code
        const ZipCounty = require('../models/ZipCounty');
        const zipCounty = await ZipCounty.findOne({ zipCodeId: parseInt(groupData.address.zipCode) });
        let fipsCode = '41051'; // Default to Multnomah County, OR
        
        if (zipCounty) {
          // Convert county ID to FIPS code format (state + county)
          // For Oregon (41), county IDs are in format 41XXX
          fipsCode = zipCounty.countyId.toString();
        }
        
        console.log(`Using FIPS code ${fipsCode} for ZIP ${groupData.address.zipCode}`);
        
        const requestData = {
          group: {
            chamber_association: false, // boolean required per docs
            company_name: groupData.name,
            external_id: `IM_${Date.now()}`,
            sic_code: '8748' // Business consulting services - required per docs
          },
          locations: [{
            external_id: `LOC_${Date.now()}`,
            fips_code: fipsCode,
            name: 'Headquarters',
            number_of_employees: groupData.metadata?.employeeCount || 10,
            primary: true, // boolean required per docs
            zip_code: groupData.address.zipCode
          }]
        };

        const response = await this.enrollmentClient.post(
          IDEON_CONFIG.endpoints.createGroup,
          requestData
        );

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('POST', '/groups', duration, response.status);

        console.log('Group created successfully:', response.data.group.id);
        return {
          id: response.data.group.id,
          company_name: response.data.group.company_name,
          external_id: response.data.group.external_id,
          contact_name: response.data.group.contact_name,
          locations: response.data.locations
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('POST', '/groups', duration, error.response?.status, parsedError);
        
        console.error('Error creating group:', parsedError.message);
        throw parsedError;
      }
    });
  }

  /**
   * Step 2: Add the Census - Create a member/employee with their dependents
   * These are the members that will be quoted
   */
  async createMember(groupId, memberData) {
    return this.limiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        console.log('Creating member in Ideon for group:', groupId);
        
        const requestData = {
          members: [{
            external_id: `MEM_${Date.now()}`, // Required field
            date_of_birth: memberData.dateOfBirth, // Must be YYYY-MM-DD format
            gender: memberData.gender === 'female' ? 'F' : 'M',
            last_used_tobacco: memberData.tobaccoUse ? '2020-01-01' : null,
            location_id: memberData.locationId, // From group creation response
            fips_code: memberData.fipsCode || '41051', // Multnomah County, OR
            zip_code: memberData.zipCode,
            cobra: false,
            retiree: false,
            dependents: memberData.dependents?.map(dep => ({
              date_of_birth: dep.dateOfBirth,
              gender: dep.gender === 'female' ? 'F' : 'M',
              last_used_tobacco: dep.tobaccoUse ? '2020-01-01' : null,
              relationship: dep.relationship,
              same_household: true
            })) || []
          }]
        };

        const endpoint = IDEON_CONFIG.endpoints.createMember(groupId);
        const response = await this.apiClient.post(endpoint, requestData);

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('POST', endpoint, duration, response.status);

        const member = response.data.members?.[0] || response.data;
        console.log('Member created successfully:', member.id || 'Success');
        return {
          id: member.id,
          external_id: member.external_id,
          first_name: member.first_name,
          last_name: member.last_name,
          date_of_birth: member.date_of_birth,
          gender: member.gender,
          location_id: member.location_id,
          full_response: response.data
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('POST', `/groups/${groupId}/members`, duration, error.response?.status, parsedError);
        
        console.error('Error creating member:', parsedError.message);
        if (error.response?.data) {
          console.error('Ideon API response:', JSON.stringify(error.response.data, null, 2));
        }
        throw parsedError;
      }
    });
  }

  /**
   * Step 3: Create a Quote - Let Ideon know what product line and effective date
   */
  async createQuote(groupId, quoteParameters) {
    return this.limiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        console.log('Creating quote for group:', groupId);
        
        const requestData = {
          group_id: groupId,
          effective_date: quoteParameters.effectiveDate,
          product_line: quoteParameters.productLine || 'individual',
          market_type: quoteParameters.marketType || 'individual',
          coverage_type: quoteParameters.coverageType || 'medical',
          
          // Filtering options
          filters: {
            metal_levels: quoteParameters.metalLevels || ['bronze', 'silver', 'gold', 'platinum'],
            plan_types: quoteParameters.planTypes || ['hmo', 'ppo', 'epo'],
            carriers: quoteParameters.carriers || []
          },
          
          metadata: {
            source: 'Insurance Masters',
            quote_type: 'ichra'
          }
        };

        const response = await this.apiClient.post(
          IDEON_CONFIG.endpoints.createQuote,
          requestData
        );

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('POST', '/quotes', duration, response.status);

        console.log('Quote created successfully:', response.data.id);
        return {
          id: response.data.id,
          group_id: response.data.group_id,
          effective_date: response.data.effective_date,
          status: response.data.status,
          plans_count: response.data.plans_count,
          members_count: response.data.members_count
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('POST', '/quotes', duration, error.response?.status, parsedError);
        
        console.error('Error creating quote:', parsedError.message);
        throw parsedError;
      }
    });
  }

  /**
   * Create Group ICHRA Affordability Calculation (Official Ideon API)
   * Uses the official Ideon API Group ICHRA Affordability endpoints
   * Complies with thingstodo.md requirement to use Ideon API endpoints
   */
  async createGroupICHRAAffordability(groupId, affordabilityData) {
    return this.ichraLimiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        console.log('Creating Group ICHRA affordability calculation for group:', groupId);
        
        const requestData = {
          ichra_affordability_calculation: {
            effective_date: affordabilityData.effectiveDate,
            plan_year: new Date(affordabilityData.effectiveDate).getFullYear(),
            rating_area_location: "work" // or "home" - using work location for employer calculations
          }
        };

        const response = await this.apiClient.post(
          IDEON_CONFIG.endpoints.createGroupICHRAAffordability(groupId),
          requestData
        );

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('POST', '/group_ichra_affordability', duration, response.status);

        const calculation = response.data.ichra_affordability_calculation;
        console.log('Group ICHRA affordability calculation created:', calculation.id);
        return {
          id: calculation.id,
          effective_date: calculation.effective_date,
          plan_year: calculation.plan_year,
          rating_area_location: calculation.rating_area_location,
          status: calculation.status,
          minimum_employer_contribution: calculation.minimum_employer_contribution,
          fpl_minimum_employer_contribution: calculation.fpl_minimum_employer_contribution
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('POST', '/group_ichra_affordability', duration, error.response?.status, parsedError);
        
        console.error('Error creating Group ICHRA affordability calculation:', parsedError.message);
        throw parsedError;
      }
    });
  }

  /**
   * Get Group ICHRA Affordability Calculation Results
   * Retrieves the results of a previously created ICHRA affordability calculation
   */
  async getGroupICHRAAffordability(calculationId) {
    return this.limiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        const endpoint = IDEON_CONFIG.endpoints.getGroupICHRAAffordability(calculationId);
        const response = await this.apiClient.get(endpoint);

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('GET', endpoint, duration, response.status);

        return {
          id: response.data.id,
          group_id: response.data.group_id,
          effective_date: response.data.effective_date,
          safe_harbor_type: response.data.safe_harbor_type,
          status: response.data.status,
          overall_affordability: response.data.overall_affordability,
          members: response.data.members,
          summary: response.data.summary,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('GET', `/group_ichra_affordability/${calculationId}`, duration, error.response?.status, parsedError);
        
        throw parsedError;
      }
    });
  }

  /**
   * Get Group ICHRA Affordability Members
   * Retrieves member-specific affordability results
   */
  async getGroupICHRAAffordabilityMembers(calculationId) {
    return this.limiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        const endpoint = IDEON_CONFIG.endpoints.getGroupICHRAAffordabilityMembers(calculationId);
        const response = await this.apiClient.get(endpoint);

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('GET', endpoint, duration, response.status);

        return {
          calculation_id: calculationId,
          members: response.data.members.map(member => ({
            member_id: member.member_id,
            is_affordable: member.is_affordable,
            benchmark_premium: member.benchmark_premium,
            minimum_contribution: member.minimum_contribution,
            maximum_employee_cost: member.maximum_employee_cost,
            actual_contribution: member.actual_contribution,
            affordability_threshold: member.affordability_threshold,
            compliance_status: member.compliance_status
          }))
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('GET', `/group_ichra_affordability/${calculationId}/members`, duration, error.response?.status, parsedError);
        
        throw parsedError;
      }
    });
  }

  /**
   * Get available plans for quoting
   */
  async getPlans(filters = {}) {
    return this.limiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        const params = new URLSearchParams();
        
        // Required parameters from API testing
        if (filters.market) params.append('market', filters.market);
        if (filters.fips_code) params.append('fips_code', filters.fips_code);
        if (filters.zip_code) params.append('zip_code', filters.zip_code);
        if (filters.effective_date) params.append('effective_date', filters.effective_date);
        
        // Optional parameters
        if (filters.county) params.append('county', filters.county);
        if (filters.state) params.append('state', filters.state);
        if (filters.metal_levels) params.append('metal_levels', filters.metal_levels.join(','));
        if (filters.plan_types) params.append('plan_types', filters.plan_types.join(','));
        if (filters.carriers) params.append('carriers', filters.carriers.join(','));

        const response = await this.apiClient.get(`${IDEON_CONFIG.endpoints.plans}?${params}`);

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('GET', '/plans', duration, response.status);

        return {
          plans: response.data.plans,
          total_count: response.data.total_count,
          page: response.data.page,
          per_page: response.data.per_page
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('GET', '/plans', duration, error.response?.status, parsedError);
        
        throw parsedError;
      }
    });
  }

  /**
   * Get quote results
   */
  async getQuote(quoteId) {
    return this.limiter.schedule(async () => {
      const startTime = Date.now();
      
      try {
        const endpoint = IDEON_CONFIG.endpoints.getQuote(quoteId);
        const response = await this.apiClient.get(endpoint);

        const duration = Date.now() - startTime;
        IdeonAPI.logInteraction('GET', endpoint, duration, response.status);

        return {
          id: response.data.id,
          group_id: response.data.group_id,
          status: response.data.status,
          plans: response.data.plans,
          members: response.data.members,
          summary: response.data.summary,
          created_at: response.data.created_at,
          updated_at: response.data.updated_at
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const parsedError = IdeonAPI.parseError(error);
        IdeonAPI.logInteraction('GET', `/quotes/${quoteId}`, duration, error.response?.status, parsedError);
        
        throw parsedError;
      }
    });
  }

  /**
   * Get current rate limiting status
   */
  getRateLimitStatus() {
    return {
      general: {
        counts: this.limiter.counts(),
        running: this.limiter.running(),
        queued: this.limiter.queued(),
        reservoir: this.limiter.reservoir
      },
      ichra: {
        counts: this.ichraLimiter.counts(),
        running: this.ichraLimiter.running(),
        queued: this.ichraLimiter.queued(),
        reservoir: this.ichraLimiter.reservoir
      }
    };
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      // Simple API call to check connectivity
      const response = await this.apiClient.get('/plans', {
        params: { per_page: 1 },
        timeout: 5000
      });
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        status: response.status,
        duration,
        message: 'Ideon API is accessible',
        rate_limit_status: this.getRateLimitStatus()
      };
    } catch (error) {
      // If we get a 405 (Method Not Allowed) or 422, the API is working, just wrong method/data
      if (error.response?.status === 405 || error.response?.status === 422 || error.response?.status === 400) {
        return {
          success: true,
          status: error.response.status,
          duration: Date.now() - startTime,
          message: 'Ideon API is accessible (responded to request)',
          rate_limit_status: this.getRateLimitStatus()
        };
      }
      
      const parsedError = IdeonAPI.parseError(error);
      
      return {
        success: false,
        error: parsedError,
        message: 'Ideon API health check failed',
        rate_limit_status: this.getRateLimitStatus()
      };
    }
  }
}

// Export singleton instance
module.exports = new IdeonAPIService(); 