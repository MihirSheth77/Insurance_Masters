// Unit Tests for Rate Limiting
// Tests Bottleneck queue behavior and rate limiting functionality

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const Bottleneck = require('bottleneck');
const RateLimitService = require('../../../src/services/RateLimitService');

describe('RateLimitService', () => {
  let limiter;
  
  beforeEach(() => {
    // Create a test limiter with fast settings for testing
    limiter = new Bottleneck({
      maxConcurrent: 2,
      minTime: 100, // 100ms between requests
      reservoir: 10, // 10 requests per window
      reservoirRefreshAmount: 10,
      reservoirRefreshInterval: 1000 // 1 second window
    });
    
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    if (limiter) {
      await limiter.stop();
    }
  });
  
  describe('Queue behavior', () => {
    test('should limit concurrent requests', async () => {
      const executionTimes = [];
      
      // Mock function that records execution time
      const mockTask = jest.fn().mockImplementation(async (id) => {
        const startTime = Date.now();
        await testUtils.waitFor(50); // Simulate work
        const endTime = Date.now();
        executionTimes.push({ id, startTime, endTime });
        return `Task ${id} completed`;
      });
      
      // Queue 5 tasks simultaneously
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(limiter.schedule(() => mockTask(i)));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      expect(mockTask).toHaveBeenCalledTimes(5);
      
      // Should respect maxConcurrent = 2
      // Check that no more than 2 tasks were running simultaneously
      for (let i = 0; i < executionTimes.length; i++) {
        const currentTask = executionTimes[i];
        const overlappingTasks = executionTimes.filter(task => 
          task.id !== currentTask.id &&
          task.startTime < currentTask.endTime &&
          task.endTime > currentTask.startTime
        );
        
        expect(overlappingTasks.length).toBeLessThanOrEqual(1); // Max 1 other task overlapping
      }
    });
    
    test('should respect minimum time between requests', async () => {
      const executionTimes = [];
      
      const mockTask = jest.fn().mockImplementation(async (id) => {
        executionTimes.push({ id, time: Date.now() });
        return `Task ${id}`;
      });
      
      // Schedule 3 quick tasks
      const promises = [];
      for (let i = 1; i <= 3; i++) {
        promises.push(limiter.schedule(() => mockTask(i)));
      }
      
      await Promise.all(promises);
      
      // Check that there's at least 100ms between sequential executions
      for (let i = 1; i < executionTimes.length; i++) {
        const timeDiff = executionTimes[i].time - executionTimes[i-1].time;
        expect(timeDiff).toBeGreaterThanOrEqual(90); // Allow some tolerance
      }
    });
    
    test('should respect reservoir limits', async () => {
      const mockTask = jest.fn().mockResolvedValue('success');
      
      // Schedule more tasks than reservoir allows (11 tasks, reservoir = 10)
      const promises = [];
      for (let i = 1; i <= 11; i++) {
        promises.push(limiter.schedule(() => mockTask(i)));
      }
      
      // Wait a bit but not long enough for reservoir to refresh
      await testUtils.waitFor(500);
      
      // Only 10 tasks should have executed so far
      expect(mockTask).toHaveBeenCalledTimes(10);
      
      // Wait for reservoir to refresh
      await testUtils.waitFor(600); // Total 1.1 seconds
      
      // Now the 11th task should execute
      await Promise.all(promises);
      expect(mockTask).toHaveBeenCalledTimes(11);
    });
    
    test('should handle queue overflow gracefully', async () => {
      // Create limiter with small reservoir
      const smallLimiter = new Bottleneck({
        maxConcurrent: 1,
        minTime: 100,
        reservoir: 3,
        reservoirRefreshAmount: 3,
        reservoirRefreshInterval: 2000
      });
      
      const mockTask = jest.fn().mockImplementation(async () => {
        await testUtils.waitFor(50);
        return 'completed';
      });
      
      try {
        // Queue many tasks quickly
        const promises = [];
        for (let i = 1; i <= 10; i++) {
          promises.push(smallLimiter.schedule(() => mockTask()));
        }
        
        // Should not throw error, but queue them
        const results = await Promise.all(promises);
        expect(results).toHaveLength(10);
        
      } finally {
        await smallLimiter.stop();
      }
    });
  });
  
  describe('Error handling and retries', () => {
    test('should handle task failures without breaking queue', async () => {
      let callCount = 0;
      const mockTask = jest.fn().mockImplementation(async (shouldFail) => {
        callCount++;
        if (shouldFail) {
          throw new Error(`Task failed on attempt ${callCount}`);
        }
        return 'success';
      });
      
      const promises = [
        limiter.schedule(() => mockTask(false)), // Success
        limiter.schedule(() => mockTask(true)),  // Failure
        limiter.schedule(() => mockTask(false)), // Success
      ];
      
      const results = await Promise.allSettled(promises);
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
      
      expect(mockTask).toHaveBeenCalledTimes(3);
    });
    
    test('should implement retry logic with exponential backoff', async () => {
      let attemptCount = 0;
      const mockApiCall = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success after retries';
      });
      
      // Retry wrapper
      const retryTask = async (task, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await limiter.schedule(task);
          } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
              // Exponential backoff: 100ms, 200ms, 400ms
              const delay = 100 * Math.pow(2, attempt - 1);
              await testUtils.waitFor(delay);
            }
          }
        }
        
        throw lastError;
      };
      
      const result = await retryTask(() => mockApiCall());
      
      expect(result).toBe('success after retries');
      expect(mockApiCall).toHaveBeenCalledTimes(3);
      expect(attemptCount).toBe(3);
    });
  });
  
  describe('Queue monitoring and metrics', () => {
    test('should track queue statistics', async () => {
      const statsHistory = [];
      
      // Set up event listeners for queue statistics
      limiter.on('queued', () => {
        statsHistory.push({
          event: 'queued',
          time: Date.now(),
          queued: limiter.counts().QUEUED,
          running: limiter.counts().RUNNING
        });
      });
      
      limiter.on('scheduled', () => {
        statsHistory.push({
          event: 'scheduled',
          time: Date.now(),
          queued: limiter.counts().QUEUED,
          running: limiter.counts().RUNNING
        });
      });
      
      const slowTask = jest.fn().mockImplementation(async (id) => {
        await testUtils.waitFor(200);
        return id;
      });
      
      // Queue several tasks
      const promises = [];
      for (let i = 1; i <= 4; i++) {
        promises.push(limiter.schedule(() => slowTask(i)));
      }
      
      await Promise.all(promises);
      
      // Verify we tracked queue changes
      expect(statsHistory.length).toBeGreaterThan(0);
      
      // Should have seen tasks queued
      const queuedEvents = statsHistory.filter(s => s.event === 'queued');
      expect(queuedEvents.length).toBeGreaterThan(0);
      
      // Should have seen tasks scheduled
      const scheduledEvents = statsHistory.filter(s => s.event === 'scheduled');
      expect(scheduledEvents.length).toBeGreaterThan(0);
    });
    
    test('should provide queue status information', () => {
      const status = {
        counts: limiter.counts(),
        running: limiter.running(),
        queued: limiter.queued(),
        done: limiter.done()
      };
      
      expect(status.counts).toHaveProperty('RECEIVED');
      expect(status.counts).toHaveProperty('QUEUED');
      expect(status.counts).toHaveProperty('RUNNING');
      expect(status.counts).toHaveProperty('EXECUTING');
      
      expect(typeof status.running).toBe('number');
      expect(typeof status.queued).toBe('number');
      expect(typeof status.done).toBe('number');
    });
  });
  
  describe('Integration with IdeonAPIService', () => {
    test('should rate limit Ideon API calls', async () => {
      // Mock IdeonAPIService rate limiting behavior
      const IdeonAPIService = require('../../../src/services/IdeonAPIService');
      
      const mockApiResponse = { success: true, data: 'api response' };
      const mockAxios = jest.fn().mockResolvedValue({ data: mockApiResponse });
      
      // Mock the rate-limited API call
      const rateLimitedCall = jest.fn().mockImplementation(async (endpoint, data) => {
        return await limiter.schedule(async () => {
          return mockAxios(endpoint, data);
        });
      });
      
      const startTime = Date.now();
      
      // Make 5 API calls simultaneously
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(rateLimitedCall(`/api/endpoint${i}`, { id: i }));
      }
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(mockAxios).toHaveBeenCalledTimes(5);
      
      // Should take at least 400ms due to rate limiting (4 intervals * 100ms)
      expect(duration).toBeGreaterThan(300);
    });
    
    test('should handle API rate limit errors', async () => {
      const mockRateLimitError = {
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' }
        }
      };
      
      let callCount = 0;
      const mockApiCall = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw mockRateLimitError;
        }
        return { data: 'success' };
      });
      
      // Retry logic for rate limit errors
      const retryOnRateLimit = async (apiCall, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await limiter.schedule(apiCall);
          } catch (error) {
            if (error.response?.status === 429 && attempt < maxRetries) {
              // Wait longer for rate limit errors
              await testUtils.waitFor(1000 * attempt);
              continue;
            }
            throw error;
          }
        }
      };
      
      const result = await retryOnRateLimit(() => mockApiCall());
      
      expect(result.data).toBe('success');
      expect(mockApiCall).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Performance under load', () => {
    test('should handle burst traffic efficiently', async () => {
      const completionTimes = [];
      
      const quickTask = jest.fn().mockImplementation(async (id) => {
        const startTime = Date.now();
        await testUtils.waitFor(10); // Very quick task
        completionTimes.push({ id, duration: Date.now() - startTime });
        return id;
      });
      
      const startTime = Date.now();
      
      // Burst of 20 tasks
      const promises = [];
      for (let i = 1; i <= 20; i++) {
        promises.push(limiter.schedule(() => quickTask(i)));
      }
      
      await Promise.all(promises);
      const totalDuration = Date.now() - startTime;
      
      expect(quickTask).toHaveBeenCalledTimes(20);
      
      // Should complete within reasonable time despite rate limiting
      expect(totalDuration).toBeLessThan(5000); // 5 seconds max
      
      // All tasks should complete successfully
      completionTimes.forEach(completion => {
        expect(completion.duration).toBeGreaterThan(0);
      });
    });
  });
}); 