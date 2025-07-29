// Ideon API Configuration - Updated with official documentation findings
require('dotenv').config();

const IDEON_CONFIG = {
  // API Authentication - Confirmed from official docs
  apiKey: process.env.IDEON_API_KEY || '02fad0e034b3334be1900bd3128a105c',
  
  // Base URLs - Confirmed from research (HTTPS required)
  baseURL: process.env.IDEON_BASE_URL || 'https://api.ideonapi.com',
  quotingURL: process.env.IDEON_QUOTING_URL || 'https://api.ideonapi.com',
  enrollmentURL: process.env.IDEON_ENROLLMENT_URL || 'https://api.ideonapi.com',
  // Alternative base URL for legacy compatibility
  legacyBaseURL: 'https://api.vericred.com',
  
  // Request configuration
  timeout: parseInt(process.env.IDEON_TIMEOUT) || 30000,
  
  // Rate Limiting - Confirmed from official trial limits
  rateLimiting: {
    // Official Trial Limits (from developers.ideonapi.com)
    maxConcurrent: parseInt(process.env.IDEON_MAX_CONCURRENT) || 3, // Conservative for trial
    minTime: parseInt(process.env.IDEON_MIN_TIME) || 600, // Production: 100/min = 600ms between
    maxRetries: parseInt(process.env.IDEON_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.IDEON_RETRY_DELAY) || 2000,
    
    // Official confirmed limits
    reservoir: process.env.NODE_ENV === 'production' ? 100 : 5, // 5 hits per minute (trial)
    reservoirRefreshAmount: process.env.NODE_ENV === 'production' ? 100 : 5,
    reservoirRefreshInterval: 60 * 1000, // 1 minute
    
    // Total trial limits
    totalTrialLimit: 100, // 100 hits per eternity (trial)
    ichraAffordabilityLimit: 10 // 10 ICHRA calculations per eternity (trial)
  },
  
  // Official Ideon Products & Endpoints
  products: {
    // IdeonQuote: "Use industry-leading APIs to provide fast and accurate quotes"
    quote: {
      baseURL: 'https://api.ideonapi.com',
      endpoints: {
        plans: '/plans',
        quotes: '/quotes',
        rates: '/rates'
      }
    },
    
    // IdeonEnroll: "Connect with more partners and exchange better data"
    enroll: {
      baseURL: 'https://api.ideonapi.com',
      endpoints: {
        groups: '/groups',
        members: '/members',
        eligibility: '/eligibility'
      }
    },
    
    // IdeonSelect: "Access accurate provider data"
    select: {
      baseURL: 'https://api.ideonapi.com',
      endpoints: {
        providers: '/providers',
        networks: '/networks'
      }
    }
  },
  
  // API Endpoints - Based on official product structure
  endpoints: {
    // Core APIs from developers site
    health: '/health',
    
    // IdeonQuote APIs
    plans: '/plans',
    quotes: '/quotes',
    rates: '/rates',
    
    // IdeonEnroll APIs  
    groups: '/groups',
    createGroup: '/groups',
    updateGroup: (groupId) => `/groups/${groupId}`,
    getGroup: (groupId) => `/groups/${groupId}`,
    
    members: (groupId) => `/groups/${groupId}/members`,
    createMember: (groupId) => `/groups/${groupId}/members`,
    updateMember: (groupId, memberId) => `/groups/${groupId}/members/${memberId}`,
    
    // ICHRA Affordability - CORRECT endpoints from official documentation
    createGroupICHRAAffordability: (groupId) => `/groups/${groupId}/ichra_affordability_calculations`,
    getGroupICHRAAffordability: (id) => `/ichra_affordability_calculations/${id}`,
    getGroupICHRAAffordabilityMembers: (id) => `/ichra_affordability_calculations/${id}/members`,
    
    // Additional endpoints
    counties: '/counties',
    carriers: '/carriers',
    service_areas: '/service_areas',
    networks: '/networks'
  },
  
  // Development settings
  development: {
    enableLogging: process.env.IDEON_DEBUG === 'true' || process.env.NODE_ENV === 'development',
    enableMocks: process.env.IDEON_ENABLE_MOCKS === 'true',
    logLevel: process.env.IDEON_LOG_LEVEL || 'info'
  },
  
  // Contact information from official site
  support: {
    email: 'sales@ideonapi.com',
    phone: '+1 201-552-4400',
    website: 'https://ideonapi.com/',
    docs: 'https://developers.ideonapi.com/',
    contact: 'https://ideonapi.com/contact-us/'
  }
};

// Enhanced IdeonAPI utility class
class IdeonAPI {
  /**
   * Get headers for different Ideon product APIs
   */
  static getHeaders(additionalHeaders = {}) {
    return {
      'Vericred-Api-Key': IDEON_CONFIG.apiKey, // Confirmed authentication method
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Version': 'v6', // Confirmed from working endpoints
      'User-Agent': 'InsuranceMasters/1.0',
      ...additionalHeaders
    };
  }
  
  /**
   * Get product-specific base URL
   */
  static getProductURL(product = 'main') {
    switch (product) {
      case 'quote':
        return IDEON_CONFIG.products.quote.baseURL;
      case 'enroll':
        return IDEON_CONFIG.products.enroll.baseURL;
      case 'select':
        return IDEON_CONFIG.products.select.baseURL;
      default:
        return IDEON_CONFIG.baseURL;
    }
  }
  
  /**
   * Validate API key format
   */
  static isValidApiKey(apiKey = IDEON_CONFIG.apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }
    
    // 32 character hex string format
    const apiKeyRegex = /^[a-f0-9]{32}$/i;
    return apiKeyRegex.test(apiKey);
  }
  
  /**
   * Check configuration status
   */
  static isConfigured() {
    return {
      hasApiKey: !!IDEON_CONFIG.apiKey,
      validApiKey: this.isValidApiKey(),
      hasBaseURL: !!IDEON_CONFIG.baseURL,
      isReady: !!IDEON_CONFIG.apiKey && this.isValidApiKey() && !!IDEON_CONFIG.baseURL,
      trialLimits: {
        hitsPerMinute: IDEON_CONFIG.rateLimiting.reservoir,
        totalHits: IDEON_CONFIG.rateLimiting.totalTrialLimit,
        ichraCalculations: IDEON_CONFIG.rateLimiting.ichraAffordabilityLimit
      }
    };
  }
  
  /**
   * Get full URL for endpoint with product context
   */
  static getEndpointURL(endpoint, product = 'main') {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    const baseURL = this.getProductURL(product);
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${cleanBaseURL}${cleanEndpoint}`;
  }
  
  /**
   * Enhanced error parsing for official Ideon API responses
   */
  static parseError(error) {
    const baseError = {
      message: 'Unknown API error',
      code: 'UNKNOWN_ERROR',
      status: null,
      details: null,
      timestamp: new Date().toISOString(),
      support: IDEON_CONFIG.support
    };
    
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle trial limit errors
      if (status === 429) {
        if (data?.message?.includes('ICHRA')) {
          return {
            ...baseError,
            message: 'ICHRA Affordability calculation limit reached (10 per trial)',
            code: 'ICHRA_TRIAL_LIMIT_EXCEEDED',
            status: 429,
            details: 'Contact sales@ideonapi.com to upgrade to production access'
          };
        }
        
        return {
          ...baseError,
          message: 'API rate limit exceeded (5 requests per minute in trial)',
          code: 'RATE_LIMIT_EXCEEDED',
          status: 429,
          details: 'Wait 60 seconds or contact sales@ideonapi.com for production limits'
        };
      }
      
      // Handle authentication errors
      if (status === 401) {
        return {
          ...baseError,
          message: 'Invalid API key - check Vericred-Api-Key header',
          code: 'AUTHENTICATION_ERROR',
          status: 401,
          details: 'Verify your API key or sign up at developers.ideonapi.com'
        };
      }
      
      // Handle trial quota exceeded
      if (status === 403 && data?.message?.includes('quota')) {
        return {
          ...baseError,
          message: 'Trial quota exceeded (100 total requests)',
          code: 'TRIAL_QUOTA_EXCEEDED',
          status: 403,
          details: 'Contact sales@ideonapi.com to upgrade to production'
        };
      }
      
      return {
        ...baseError,
        message: data?.message || error.message || 'API request failed',
        code: data?.code || 'HTTP_ERROR',
        status,
        details: data?.details || null
      };
    }
    
    if (error.request) {
      return {
        ...baseError,
        message: 'Network error - unable to reach Ideon API',
        code: 'NETWORK_ERROR',
        details: 'Check internet connection and verify API endpoints'
      };
    }
    
    return {
      ...baseError,
      message: error.message || 'Unknown error occurred',
      code: error.code || 'GENERIC_ERROR'
    };
  }
  
  /**
   * Check if we're hitting trial limits
   */
  static checkTrialUsage(requestCount, ichraCount) {
    const limits = IDEON_CONFIG.rateLimiting;
    
    return {
      totalRequests: {
        current: requestCount,
        limit: limits.totalTrialLimit,
        remaining: Math.max(0, limits.totalTrialLimit - requestCount),
        percentUsed: (requestCount / limits.totalTrialLimit) * 100
      },
      ichraCalculations: {
        current: ichraCount,
        limit: limits.ichraAffordabilityLimit,
        remaining: Math.max(0, limits.ichraAffordabilityLimit - ichraCount),
        percentUsed: (ichraCount / limits.ichraAffordabilityLimit) * 100
      },
      needsUpgrade: requestCount >= limits.totalTrialLimit || ichraCount >= limits.ichraAffordabilityLimit
    };
  }
  
  /**
   * Get upgrade information
   */
  static getUpgradeInfo() {
    return {
      contact: {
        email: IDEON_CONFIG.support.email,
        phone: IDEON_CONFIG.support.phone,
        website: IDEON_CONFIG.support.contact
      },
      benefits: [
        'Unlimited API requests (100+ per minute)',
        'Unlimited ICHRA affordability calculations', 
        'Access to IdeonEnroll for enrollment automation',
        'Premium support and account management',
        'Advanced analytics and reporting'
      ],
      trialLimitations: [
        '5 requests per minute',
        '100 total requests per trial',
        '10 ICHRA affordability calculations total'
      ]
    };
  }

  /**
   * Log API interaction for monitoring
   */
  static logInteraction(method, endpoint, duration, status, error = null) {
    if (IDEON_CONFIG.development.enableLogging) {
      const logData = {
        timestamp: new Date().toISOString(),
        method,
        endpoint,
        duration: `${duration}ms`,
        status,
        success: status >= 200 && status < 300
      };

      if (error) {
        logData.error = error.message || error.code;
      }

      console.log('📡 Ideon API Call:', logData);
    }
  }
}

// Environment validation with official limits
const configStatus = IdeonAPI.isConfigured();
if (IDEON_CONFIG.development.enableLogging) {
  console.log('🔧 Ideon API Configuration (Official):', {
    baseURL: IDEON_CONFIG.baseURL,
    quotingURL: IDEON_CONFIG.products.quote.baseURL,
    enrollmentURL: IDEON_CONFIG.products.enroll.baseURL,
    hasApiKey: configStatus.hasApiKey,
    validApiKey: configStatus.validApiKey,
    isReady: configStatus.isReady,
    trialLimits: configStatus.trialLimits,
    support: IDEON_CONFIG.support.email
  });
}

if (!configStatus.isReady && IDEON_CONFIG.development.enableLogging) {
  console.warn('⚠️ Ideon API Configuration Issues:', configStatus);
  console.log('📞 For support contact:', IDEON_CONFIG.support.email);
}

module.exports = {
  IDEON_CONFIG,
  IdeonAPI
}; 