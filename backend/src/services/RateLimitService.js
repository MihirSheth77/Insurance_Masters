const Bottleneck = require('bottleneck');
const redis = require('redis');

/**
 * Rate Limiting Service
 * Provides centralized rate limiting for various API integrations
 */
class RateLimitService {
  constructor() {
    this.limiters = new Map();
    this.redisClient = null;
    this.isRedisEnabled = process.env.REDIS_ENABLED === 'true';
    
    if (this.isRedisEnabled) {
      this.initializeRedis();
    }
  }

  /**
   * Initialize Redis connection for distributed rate limiting
   */
  async initializeRedis() {
    try {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      });

      this.redisClient.on('error', (error) => {
        console.error('Redis connection error:', error);
        this.isRedisEnabled = false;
      });

      this.redisClient.on('connect', () => {
        console.log('Redis connected for distributed rate limiting');
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isRedisEnabled = false;
    }
  }

  /**
   * Create or get a rate limiter for a specific service
   */
  createLimiter(serviceName, options = {}) {
    // Check if limiter already exists
    if (this.limiters.has(serviceName)) {
      return this.limiters.get(serviceName);
    }

    // Default configurations for known services
    const defaultConfigs = {
      ideon: {
        reservoir: process.env.NODE_ENV === 'production' ? 100 : 5,
        reservoirRefreshAmount: process.env.NODE_ENV === 'production' ? 100 : 5,
        reservoirRefreshInterval: 60 * 1000, // 1 minute
        maxConcurrent: 2,
        minTime: 600, // 600ms between requests
        retryDelayGenerators: {
          429: (attemptNumber) => Math.pow(2, attemptNumber) * 1000,
          500: (attemptNumber) => Math.pow(2, attemptNumber) * 1000,
          502: (attemptNumber) => Math.pow(2, attemptNumber) * 1000,
          503: (attemptNumber) => Math.pow(2, attemptNumber) * 1000,
          504: (attemptNumber) => Math.pow(2, attemptNumber) * 1000
        }
      },
      ichraAffordability: {
        reservoir: 10, // 10 total for trial period
        reservoirRefreshAmount: 0, // No refresh for trial
        maxConcurrent: 1,
        minTime: 1000 // 1 second between requests
      },
      default: {
        reservoir: 100,
        reservoirRefreshAmount: 100,
        reservoirRefreshInterval: 60 * 1000,
        maxConcurrent: 5,
        minTime: 100
      }
    };

    // Merge default config with provided options
    const config = {
      ...(defaultConfigs[serviceName] || defaultConfigs.default),
      ...options
    };

    // Add Redis datastore if enabled
    if (this.isRedisEnabled) {
      config.datastore = 'redis';
      config.clearDatastore = false;
      config.clientOptions = {
        redis: this.redisClient
      };
    }

    // Create the limiter
    const limiter = new Bottleneck(config);

    // Add event listeners
    this.attachEventListeners(limiter, serviceName);

    // Store the limiter
    this.limiters.set(serviceName, limiter);

    return limiter;
  }

  /**
   * Attach event listeners to a limiter
   */
  attachEventListeners(limiter, serviceName) {
    limiter.on('error', (error) => {
      console.error(`Rate limiter error for ${serviceName}:`, error);
    });

    limiter.on('idle', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`${serviceName} rate limiter is idle`);
      }
    });

    limiter.on('depleted', () => {
      console.warn(`${serviceName} rate limit depleted - requests will be queued`);
    });

    limiter.on('dropped', (dropped) => {
      console.error(`${serviceName} dropped ${dropped.length} requests due to rate limiting`);
    });

    limiter.on('received', (queued) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`${serviceName} received request, ${queued} queued`);
      }
    });

    limiter.on('queued', (queued, blocked) => {
      if (blocked > 0) {
        console.log(`${serviceName} has ${queued} queued and ${blocked} blocked requests`);
      }
    });

    limiter.on('done', (info) => {
      if (info.retryCount > 0) {
        console.log(`${serviceName} request completed after ${info.retryCount} retries`);
      }
    });
  }

  /**
   * Get rate limiter for a specific service
   */
  getLimiter(serviceName) {
    if (!this.limiters.has(serviceName)) {
      return this.createLimiter(serviceName);
    }
    return this.limiters.get(serviceName);
  }

  /**
   * Get current status of all rate limiters
   */
  async getStatus() {
    const status = {};

    for (const [serviceName, limiter] of this.limiters) {
      const counts = await limiter.counts();
      const reservoir = await limiter.currentReservoir();

      status[serviceName] = {
        running: counts.RUNNING,
        queued: counts.QUEUED,
        done: counts.DONE,
        reservoir: reservoir,
        isEmpty: limiter.empty(),
        isDepleted: counts.QUEUED > 0
      };
    }

    return status;
  }

  /**
   * Get status for a specific service
   */
  async getServiceStatus(serviceName) {
    const limiter = this.limiters.get(serviceName);
    if (!limiter) {
      return null;
    }

    const counts = await limiter.counts();
    const reservoir = await limiter.currentReservoir();

    return {
      service: serviceName,
      running: counts.RUNNING,
      queued: counts.QUEUED,
      done: counts.DONE,
      reservoir: reservoir,
      isEmpty: limiter.empty(),
      isDepleted: counts.QUEUED > 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear queued jobs for a service
   */
  async clearQueue(serviceName) {
    const limiter = this.limiters.get(serviceName);
    if (!limiter) {
      throw new Error(`No rate limiter found for service: ${serviceName}`);
    }

    const dropped = await limiter.stop({
      dropWaitingJobs: true,
      dropErrorMessage: 'Queue cleared by admin'
    });

    return {
      service: serviceName,
      droppedJobs: dropped,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update rate limit configuration for a service
   */
  async updateLimits(serviceName, newLimits) {
    const limiter = this.limiters.get(serviceName);
    if (!limiter) {
      throw new Error(`No rate limiter found for service: ${serviceName}`);
    }

    // Update reservoir if provided
    if (newLimits.reservoir !== undefined) {
      await limiter.updateSettings({
        reservoir: newLimits.reservoir
      });
    }

    // Update refresh settings if provided
    if (newLimits.reservoirRefreshAmount !== undefined || 
        newLimits.reservoirRefreshInterval !== undefined) {
      await limiter.updateSettings({
        reservoirRefreshAmount: newLimits.reservoirRefreshAmount,
        reservoirRefreshInterval: newLimits.reservoirRefreshInterval
      });
    }

    // Update timing settings if provided
    if (newLimits.minTime !== undefined) {
      await limiter.updateSettings({
        minTime: newLimits.minTime
      });
    }

    if (newLimits.maxConcurrent !== undefined) {
      await limiter.updateSettings({
        maxConcurrent: newLimits.maxConcurrent
      });
    }

    return {
      service: serviceName,
      updatedSettings: newLimits,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute a function with rate limiting
   */
  async execute(serviceName, fn, priority = 5) {
    const limiter = this.getLimiter(serviceName);
    
    return limiter.schedule({ priority }, async () => {
      const startTime = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`${serviceName} request completed in ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`${serviceName} request failed after ${duration}ms:`, error.message);
        throw error;
      }
    });
  }

  /**
   * Wrap an async function with rate limiting
   */
  wrap(serviceName, fn) {
    return async (...args) => {
      return this.execute(serviceName, () => fn(...args));
    };
  }

  /**
   * Create middleware for Express routes
   */
  middleware(serviceName, options = {}) {
    return async (req, res, next) => {
      const limiter = this.getLimiter(serviceName);
      
      try {
        await limiter.schedule(async () => {
          next();
        });
      } catch (error) {
        console.error(`Rate limit middleware error for ${serviceName}:`, error);
        
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: options.retryAfter || 60
        });
      }
    };
  }

  /**
   * Clean up resources
   */
  async shutdown() {
    console.log('Shutting down rate limiters...');
    
    // Stop all limiters
    for (const [serviceName, limiter] of this.limiters) {
      await limiter.stop();
      console.log(`Stopped rate limiter for ${serviceName}`);
    }

    // Close Redis connection if enabled
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
      console.log('Redis connection closed');
    }

    this.limiters.clear();
  }

  /**
   * Get metrics for monitoring
   */
  async getMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      services: {},
      redis: {
        enabled: this.isRedisEnabled,
        connected: this.redisClient?.isOpen || false
      }
    };

    for (const [serviceName, limiter] of this.limiters) {
      const counts = await limiter.counts();
      const reservoir = await limiter.currentReservoir();
      
      metrics.services[serviceName] = {
        totalRequests: counts.DONE,
        activeRequests: counts.RUNNING,
        queuedRequests: counts.QUEUED,
        availableTokens: reservoir,
        utilizationRate: counts.DONE > 0 ? 
          ((counts.DONE / (counts.DONE + reservoir)) * 100).toFixed(2) + '%' : '0%'
      };
    }

    return metrics;
  }
}

// Export singleton instance
module.exports = new RateLimitService();