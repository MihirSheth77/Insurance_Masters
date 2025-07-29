// Integration Tests for API Endpoints
// Tests all API endpoints with proper HTTP status codes and response formats

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../../src/app');

// Import models for seeding test data
const County = require('../../../src/models/County');
const Plan = require('../../../src/models/Plan');
const Group = require('../../../src/models/Group');
const Member = require('../../../src/models/Member');
const ICHRAClass = require('../../../src/models/ICHRAClass');

describe('API Endpoints Integration Tests', () => {
  let testGroup;
  let testClass;
  let testMember;
  
  beforeAll(async () => {
    // Seed test data
    await testUtils.seedDatabase({
      counties: [
        testUtils.createTestCounty({ 
          countyId: 'TRAVIS_TX',
          countyName: 'Travis',
          stateAbbreviation: 'TX',
          ratingAreaId: 'RA_TX_001'
        }),
        testUtils.createTestCounty({ 
          countyId: 'HARRIS_TX',
          countyName: 'Harris',
          stateAbbreviation: 'TX',
          ratingAreaId: 'RA_TX_002'
        })
      ],
      
      zipCounties: [
        { zipCodeId: '78701', countyId: 'TRAVIS_TX', isPrimary: true },
        { zipCodeId: '77001', countyId: 'HARRIS_TX', isPrimary: true }
      ],
      
      plans: [
        testUtils.createTestPlan({
          planId: 'PLAN_001',
          planName: 'Silver HMO Plan',
          metalLevel: 'Silver',
          monthlyPremium: 350.00
        }),
        testUtils.createTestPlan({
          planId: 'PLAN_002',
          planName: 'Gold PPO Plan',
          metalLevel: 'Gold',
          monthlyPremium: 450.00
        })
      ]
    });
  });
  
  afterAll(async () => {
    // Cleanup is handled by test setup
  });
  
  beforeEach(async () => {
    // Create fresh test entities for each test
    testGroup = await Group.create(testUtils.createTestGroup({
      groupName: 'Test Company',
      address: {
        zipCode: '78701',
        county: 'TRAVIS_TX'
      }
    }));
    
    testClass = await ICHRAClass.create({
      groupId: testGroup._id,
      className: 'Full-time Employees',
      monthlyContribution: 400,
      description: 'All full-time employees'
    });
    
    testMember = await Member.create(testUtils.createTestMember({
      groupId: testGroup._id,
      classId: testClass._id,
      zipCode: '78701'
    }));
  });
  
  describe('Geographic API (/api/geographic)', () => {
    describe('POST /api/geographic/resolve-zip', () => {
      test('should resolve valid ZIP code - 200 OK', async () => {
        const response = await request(app)
          .post('/api/geographic/resolve-zip')
          .send({ zipCode: '78701' })
          .expect(200);
        
        expect(response.body).toMatchObject({
          success: true,
          data: {
            zipCode: '78701',
            isMultiCounty: false,
            primaryCounty: expect.objectContaining({
              countyId: 'TRAVIS_TX',
              countyName: 'Travis',
              stateAbbreviation: 'TX'
            }),
            allCounties: expect.arrayContaining([
              expect.objectContaining({
                countyId: 'TRAVIS_TX'
              })
            ]),
            planCount: expect.any(Number)
          }
        });
      });
      
      test('should return 400 for invalid ZIP format', async () => {
        const response = await request(app)
          .post('/api/geographic/resolve-zip')
          .send({ zipCode: 'INVALID' })
          .expect(400);
        
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('Invalid ZIP code format')
          }
        });
      });
      
      test('should return 404 for ZIP not in service area', async () => {
        const response = await request(app)
          .post('/api/geographic/resolve-zip')
          .send({ zipCode: '00000' })
          .expect(404);
        
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'ZIP_NOT_FOUND',
            message: expect.stringContaining('ZIP code not found')
          }
        });
      });
      
      test('should handle missing request body - 400', async () => {
        const response = await request(app)
          .post('/api/geographic/resolve-zip')
          .send({})
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
    
    describe('GET /api/geographic/counties', () => {
      test('should return all counties - 200 OK', async () => {
        const response = await request(app)
          .get('/api/geographic/counties')
          .expect(200);
        
        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              countyId: expect.any(String),
              countyName: expect.any(String),
              stateAbbreviation: expect.any(String)
            })
          ]),
          count: expect.any(Number)
        });
      });
      
      test('should filter counties by state', async () => {
        const response = await request(app)
          .get('/api/geographic/counties?state=TX')
          .expect(200);
        
        expect(response.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              stateAbbreviation: 'TX'
            })
          ])
        );
      });
    });
  });
  
  describe('Plans API (/api/plans)', () => {
    describe('GET /api/plans/search', () => {
      test('should search plans with filters - 200 OK', async () => {
        const response = await request(app)
          .get('/api/plans/search?countyId=TRAVIS_TX&metalLevel=Silver&limit=10')
          .expect(200);
        
        expect(response.body).toMatchObject({
          success: true,
          data: {
            plans: expect.any(Array),
            pagination: {
              currentPage: 1,
              totalPages: expect.any(Number),
              totalCount: expect.any(Number),
              hasNextPage: expect.any(Boolean),
              hasPrevPage: false
            },
            filters: {
              countyId: 'TRAVIS_TX',
              metalLevel: 'Silver'
            }
          }
        });
      });
      
      test('should handle empty results - 200 OK', async () => {
        const response = await request(app)
          .get('/api/plans/search?countyId=NONEXISTENT')
          .expect(200);
        
        expect(response.body.data.plans).toHaveLength(0);
        expect(response.body.data.pagination.totalCount).toBe(0);
      });
      
      test('should validate query parameters - 400', async () => {
        const response = await request(app)
          .get('/api/plans/search?limit=invalid')
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
    
    describe('POST /api/plans/quote', () => {
      test('should calculate quote for individual - 200 OK', async () => {
        const quoteRequest = {
          members: [{
            age: 30,
            tobaccoUse: false,
            zipCode: '78701'
          }],
          planIds: ['PLAN_001'],
          countyId: 'TRAVIS_TX'
        };
        
        const response = await request(app)
          .post('/api/plans/quote')
          .send(quoteRequest)
          .expect(200);
        
        expect(response.body).toMatchObject({
          success: true,
          data: {
            quotes: expect.arrayContaining([
              expect.objectContaining({
                planId: 'PLAN_001',
                monthlyPremium: expect.any(Number),
                annualPremium: expect.any(Number),
                memberBreakdown: expect.any(Array)
              })
            ]),
            summary: {
              totalMembers: 1,
              averageAge: 30,
              tobaccoUsers: 0
            }
          }
        });
      });
      
      test('should calculate family quote - 200 OK', async () => {
        const familyQuoteRequest = {
          members: [
            { age: 35, tobaccoUse: false, zipCode: '78701' },
            { age: 33, tobaccoUse: false, zipCode: '78701' },
            { age: 8, tobaccoUse: false, zipCode: '78701' }
          ],
          planIds: ['PLAN_001', 'PLAN_002'],
          countyId: 'TRAVIS_TX'
        };
        
        const response = await request(app)
          .post('/api/plans/quote')
          .send(familyQuoteRequest)
          .expect(200);
        
        expect(response.body.data.quotes).toHaveLength(2);
        expect(response.body.data.summary.totalMembers).toBe(3);
      });
      
      test('should return 422 for invalid member data', async () => {
        const invalidRequest = {
          members: [{ age: 'invalid', tobaccoUse: 'not_boolean' }],
          planIds: ['PLAN_001']
        };
        
        const response = await request(app)
          .post('/api/plans/quote')
          .send(invalidRequest)
          .expect(422);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });
  
  describe('Groups API (/api/groups)', () => {
    describe('POST /api/groups', () => {
      test('should create new group - 201 Created', async () => {
        const newGroup = {
          groupName: 'New Test Company',
          address: {
            street: '456 Oak Ave',
            city: 'Austin',
            state: 'TX',
            zipCode: '78701',
            county: 'TRAVIS_TX'
          },
          effectiveDate: '2024-01-01'
        };
        
        // Mock Ideon API response
        testUtils.mockIdeonAPI.createGroup(newGroup);
        
        const response = await request(app)
          .post('/api/groups')
          .send(newGroup)
          .expect(201);
        
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            groupName: 'New Test Company',
            address: expect.objectContaining({
              zipCode: '78701'
            }),
            ideonGroupId: expect.any(String)
          })
        });
      });
      
      test('should validate required fields - 400', async () => {
        const incompleteGroup = {
          groupName: 'Incomplete Group'
          // Missing address and other required fields
        };
        
        const response = await request(app)
          .post('/api/groups')
          .send(incompleteGroup)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
      
      test('should handle Ideon API failure - 503', async () => {
        const newGroup = testUtils.createTestGroup();
        
        // Mock Ideon API network error
        testUtils.mockIdeonAPI.networkError('/groups');
        
        const response = await request(app)
          .post('/api/groups')
          .send(newGroup)
          .expect(503);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('EXTERNAL_API_ERROR');
      });
    });
    
    describe('GET /api/groups/:id', () => {
      test('should retrieve group by ID - 200 OK', async () => {
        const response = await request(app)
          .get(`/api/groups/${testGroup._id}`)
          .expect(200);
        
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            _id: testGroup._id.toString(),
            groupName: testGroup.groupName
          })
        });
      });
      
      test('should return 404 for non-existent group', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        
        const response = await request(app)
          .get(`/api/groups/${fakeId}`)
          .expect(404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('GROUP_NOT_FOUND');
      });
      
      test('should return 400 for invalid ObjectId', async () => {
        const response = await request(app)
          .get('/api/groups/invalid-id')
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
  });
  
  describe('Classes API (/api/groups/:groupId/classes)', () => {
    describe('POST /api/groups/:groupId/classes', () => {
      test('should create new class - 201 Created', async () => {
        const newClass = {
          className: 'Part-time Employees',
          monthlyContribution: 300,
          description: 'All part-time employees'
        };
        
        const response = await request(app)
          .post(`/api/groups/${testGroup._id}/classes`)
          .send(newClass)
          .expect(201);
        
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            className: 'Part-time Employees',
            monthlyContribution: 300,
            groupId: testGroup._id.toString()
          })
        });
      });
      
      test('should validate contribution amount - 422', async () => {
        const invalidClass = {
          className: 'Invalid Class',
          monthlyContribution: -100 // Negative contribution
        };
        
        const response = await request(app)
          .post(`/api/groups/${testGroup._id}/classes`)
          .send(invalidClass)
          .expect(422);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });
    
    describe('GET /api/groups/:groupId/classes', () => {
      test('should list all classes for group - 200 OK', async () => {
        const response = await request(app)
          .get(`/api/groups/${testGroup._id}/classes`)
          .expect(200);
        
        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              _id: testClass._id.toString(),
              className: testClass.className,
              groupId: testGroup._id.toString()
            })
          ]),
          count: expect.any(Number)
        });
      });
    });
  });
  
  describe('Members API (/api/groups/:groupId/members)', () => {
    describe('POST /api/groups/:groupId/members', () => {
      test('should create new member - 201 Created', async () => {
        const newMember = testUtils.createTestMember({
          firstName: 'Jane',
          lastName: 'Smith',
          classId: testClass._id
        });
        
        // Mock Ideon API response
        testUtils.mockIdeonAPI.createMember(testGroup.ideonGroupId, newMember);
        
        const response = await request(app)
          .post(`/api/groups/${testGroup._id}/members`)
          .send(newMember)
          .expect(201);
        
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            firstName: 'Jane',
            lastName: 'Smith',
            groupId: testGroup._id.toString(),
            classId: testClass._id.toString(),
            ideonMemberId: expect.any(String)
          })
        });
      });
      
      test('should validate previous contributions - 422', async () => {
        const memberWithoutContributions = {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          zipCode: '78701',
          classId: testClass._id
          // Missing previousContributions
        };
        
        const response = await request(app)
          .post(`/api/groups/${testGroup._id}/members`)
          .send(memberWithoutContributions)
          .expect(422);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toContain('previousContributions');
      });
    });
    
    describe('GET /api/groups/:groupId/members', () => {
      test('should list members with pagination - 200 OK', async () => {
        const response = await request(app)
          .get(`/api/groups/${testGroup._id}/members?page=1&limit=10`)
          .expect(200);
        
        expect(response.body).toMatchObject({
          success: true,
          data: {
            members: expect.any(Array),
            pagination: {
              currentPage: 1,
              totalPages: expect.any(Number),
              totalCount: expect.any(Number)
            }
          }
        });
      });
      
      test('should filter members by class - 200 OK', async () => {
        const response = await request(app)
          .get(`/api/groups/${testGroup._id}/members?classId=${testClass._id}`)
          .expect(200);
        
        expect(response.body.data.members).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              classId: testClass._id.toString()
            })
          ])
        );
      });
    });
  });
  
  describe('Error handling and edge cases', () => {
    test('should handle malformed JSON - 400', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    test('should handle missing Content-Type header - 415', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send('some data')
        .expect(415);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });
    
    test('should handle database connection errors - 500', async () => {
      // Temporarily close database connection
      await mongoose.connection.close();
      
      const response = await request(app)
        .get('/api/geographic/counties')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DATABASE_ERROR');
      
      // Reconnect for other tests
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    });
    
    test('should enforce rate limits - 429', async () => {
      // Make many requests quickly to trigger rate limit
      const promises = [];
      for (let i = 0; i < 101; i++) { // Exceed rate limit
        promises.push(
          request(app).get('/api/geographic/counties')
        );
      }
      
      const responses = await Promise.allSettled(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(
        r => r.value?.status === 429
      );
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
}); 