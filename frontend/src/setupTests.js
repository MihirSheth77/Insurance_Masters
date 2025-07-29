// Frontend Test Setup
// Configures React Testing Library, MSW for API mocking, and custom utilities

import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver (used by some chart libraries)
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock URL.createObjectURL (used for file downloads)
global.URL.createObjectURL = jest.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = jest.fn();

// Mock File API
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.name = filename;
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    this.type = options.type || '';
    this.lastModified = Date.now();
  }
};

// Mock FileReader
global.FileReader = class FileReader {
  constructor() {
    this.readyState = 0;
    this.result = null;
    this.error = null;
  }
  
  readAsText(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'mocked file content';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
  
  readAsDataURL(file) {
    setTimeout(() => {
      this.readyState = 2;
      this.result = 'data:text/plain;base64,bW9ja2VkIGZpbGUgY29udGVudA==';
      if (this.onload) this.onload({ target: this });
    }, 0);
  }
};

// Default API responses for MSW
const defaultHandlers = [
  // Geographic API
  rest.post('/api/geographic/resolve-zip', (req, res, ctx) => {
    const { zipCode } = req.body;
    
    if (zipCode === '78701') {
      return res(ctx.json({
        success: true,
        data: {
          zipCode: '78701',
          isMultiCounty: false,
          primaryCounty: {
            countyId: 'TRAVIS_TX',
            countyName: 'Travis',
            stateAbbreviation: 'TX',
            stateName: 'Texas'
          },
          allCounties: [{
            countyId: 'TRAVIS_TX',
            countyName: 'Travis',
            stateAbbreviation: 'TX',
            stateName: 'Texas'
          }],
          planCount: 25
        }
      }));
    }
    
    if (zipCode === '12345') {
      return res(ctx.json({
        success: true,
        data: {
          zipCode: '12345',
          isMultiCounty: true,
          primaryCounty: {
            countyId: 'COUNTY_A',
            countyName: 'County A',
            stateAbbreviation: 'TX'
          },
          allCounties: [
            { countyId: 'COUNTY_A', countyName: 'County A', stateAbbreviation: 'TX' },
            { countyId: 'COUNTY_B', countyName: 'County B', stateAbbreviation: 'TX' },
            { countyId: 'COUNTY_C', countyName: 'County C', stateAbbreviation: 'TX' }
          ],
          planCount: 45
        }
      }));
    }
    
    return res(ctx.status(404), ctx.json({
      success: false,
      error: { code: 'ZIP_NOT_FOUND', message: 'ZIP code not found in our service area' }
    }));
  }),
  
  rest.get('/api/geographic/counties', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: [
        { countyId: 'TRAVIS_TX', countyName: 'Travis', stateAbbreviation: 'TX' },
        { countyId: 'HARRIS_TX', countyName: 'Harris', stateAbbreviation: 'TX' }
      ],
      count: 2
    }));
  }),
  
  // Plans API
  rest.get('/api/plans/search', (req, res, ctx) => {
    const url = new URL(req.url);
    const countyId = url.searchParams.get('countyId');
    const metalLevel = url.searchParams.get('metalLevel');
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    
    const mockPlans = [
      {
        planId: 'PLAN_001',
        planName: 'Silver HMO Plan',
        issuerId: 'ISSUER_001',
        issuerName: 'Test Insurance',
        metalLevel: 'Silver',
        planType: 'HMO',
        monthlyPremium: 350.00,
        deductibles: {
          individual: { inNetwork: 2000, outNetwork: 4000 },
          family: { inNetwork: 4000, outNetwork: 8000 }
        },
        copays: {
          primaryCare: 25,
          specialist: 50,
          emergencyRoom: 500
        }
      },
      {
        planId: 'PLAN_002',
        planName: 'Gold PPO Plan',
        issuerId: 'ISSUER_002',
        issuerName: 'Premium Insurance',
        metalLevel: 'Gold',
        planType: 'PPO',
        monthlyPremium: 450.00,
        deductibles: {
          individual: { inNetwork: 1500, outNetwork: 3000 },
          family: { inNetwork: 3000, outNetwork: 6000 }
        },
        copays: {
          primaryCare: 20,
          specialist: 40,
          emergencyRoom: 400
        }
      }
    ];
    
    let filteredPlans = mockPlans;
    
    if (metalLevel) {
      filteredPlans = filteredPlans.filter(plan => plan.metalLevel === metalLevel);
    }
    
    return res(ctx.json({
      success: true,
      data: {
        plans: filteredPlans.slice(0, limit),
        pagination: {
          currentPage: 1,
          totalPages: Math.ceil(filteredPlans.length / limit),
          totalCount: filteredPlans.length,
          hasNextPage: filteredPlans.length > limit,
          hasPrevPage: false
        },
        filters: { countyId, metalLevel }
      }
    }));
  }),
  
  rest.post('/api/plans/quote', (req, res, ctx) => {
    const { members, planIds } = req.body;
    
    const quotes = planIds.map(planId => ({
      planId,
      monthlyPremium: 350.00 * members.length,
      annualPremium: 350.00 * members.length * 12,
      memberBreakdown: members.map((member, index) => ({
        memberId: index,
        age: member.age,
        monthlyPremium: 350.00,
        annualPremium: 350.00 * 12
      }))
    }));
    
    return res(ctx.json({
      success: true,
      data: {
        quotes,
        summary: {
          totalMembers: members.length,
          averageAge: members.reduce((sum, m) => sum + m.age, 0) / members.length,
          tobaccoUsers: members.filter(m => m.tobaccoUse).length
        }
      }
    }));
  }),
  
  // Groups API
  rest.post('/api/groups', (req, res, ctx) => {
    const groupData = req.body;
    return res(ctx.status(201), ctx.json({
      success: true,
      data: {
        _id: 'group_123',
        ...groupData,
        ideonGroupId: 'IDEON_GROUP_001',
        createdAt: new Date().toISOString()
      }
    }));
  }),
  
  rest.get('/api/groups/:id', (req, res, ctx) => {
    const { id } = req.params;
    
    if (id === 'invalid') {
      return res(ctx.status(404), ctx.json({
        success: false,
        error: { code: 'GROUP_NOT_FOUND', message: 'Group not found' }
      }));
    }
    
    return res(ctx.json({
      success: true,
      data: {
        _id: id,
        groupName: 'Test Company',
        address: {
          street: '123 Main St',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          county: 'TRAVIS_TX'
        },
        effectiveDate: '2024-01-01',
        ideonGroupId: 'IDEON_GROUP_001'
      }
    }));
  }),
  
  // Classes API
  rest.post('/api/groups/:groupId/classes', (req, res, ctx) => {
    const { groupId } = req.params;
    const classData = req.body;
    
    return res(ctx.status(201), ctx.json({
      success: true,
      data: {
        _id: 'class_123',
        groupId,
        ...classData,
        createdAt: new Date().toISOString()
      }
    }));
  }),
  
  rest.get('/api/groups/:groupId/classes', (req, res, ctx) => {
    const { groupId } = req.params;
    
    return res(ctx.json({
      success: true,
      data: [
        {
          _id: 'class_123',
          groupId,
          className: 'Full-time Employees',
          monthlyContribution: 400,
          description: 'All full-time employees'
        }
      ],
      count: 1
    }));
  }),
  
  // Members API
  rest.post('/api/groups/:groupId/members', (req, res, ctx) => {
    const { groupId } = req.params;
    const memberData = req.body;
    
    return res(ctx.status(201), ctx.json({
      success: true,
      data: {
        _id: 'member_123',
        groupId,
        ...memberData,
        ideonMemberId: 'IDEON_MEMBER_001',
        createdAt: new Date().toISOString()
      }
    }));
  }),
  
  rest.get('/api/groups/:groupId/members', (req, res, ctx) => {
    const { groupId } = req.params;
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    
    const mockMembers = [
      {
        _id: 'member_123',
        groupId,
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        age: 34,
        zipCode: '78701',
        tobaccoUse: false,
        classId: 'class_123',
        previousContributions: {
          employerContribution: 400,
          memberContribution: 150,
          planName: 'Previous Plan'
        }
      }
    ];
    
    return res(ctx.json({
      success: true,
      data: {
        members: mockMembers,
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalCount: mockMembers.length,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    }));
  }),
  
  rest.post('/api/groups/:groupId/members/bulk', (req, res, ctx) => {
    // Simulate bulk upload processing
    return res(
      ctx.delay(1000), // Simulate processing time
      ctx.json({
        success: true,
        data: {
          totalRows: 10,
          successfulImports: 8,
          failedImports: 2,
          errors: [
            { row: 3, error: 'Invalid date format for dateOfBirth' },
            { row: 7, error: 'Missing required field: previousContributions.employerContribution' }
          ],
          importedMembers: ['member_001', 'member_002', 'member_003'],
          summary: {
            processingTime: '2.3s',
            validationErrors: 2,
            duplicatesSkipped: 0
          }
        }
      })
    );
  }),
  
  // Quotes API
  rest.post('/api/quotes/generate', (req, res, ctx) => {
    const { groupId } = req.body;
    
    return res(ctx.json({
      success: true,
      data: {
        quoteId: 'quote_123',
        groupId,
        plans: [
          {
            planId: 'PLAN_001',
            planName: 'Silver HMO Plan',
            monthlyPremium: 350.00,
            employeeSavings: 50.00,
            isRecommended: true
          },
          {
            planId: 'PLAN_002',
            planName: 'Gold PPO Plan',
            monthlyPremium: 450.00,
            employeeSavings: -25.00,
            isRecommended: false
          }
        ],
        summary: {
          totalEmployees: 5,
          averageSavings: 125.00,
          employeesWithSavings: 4,
          totalMonthlySavings: 625.00,
          totalAnnualSavings: 7500.00
        },
        generatedAt: new Date().toISOString()
      }
    }));
  })
];

// Create MSW server
export const server = setupServer(...defaultHandlers);

// Start server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error'
  });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Test utilities
export const testUtils = {
  // Create mock file for upload testing
  createMockFile: (name = 'test.csv', type = 'text/csv', content = 'mock,csv,content') => {
    return new File([content], name, { type });
  },
  
  // Create mock form data
  createMockFormData: (data = {}) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    return formData;
  },
  
  // Mock local storage
  mockLocalStorage: () => {
    let store = {};
    
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      })
    };
  },
  
  // Mock session storage
  mockSessionStorage: () => {
    let store = {};
    
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      })
    };
  },
  
  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Custom render function with providers
  renderWithProviders: (ui, options = {}) => {
    const { render } = require('@testing-library/react');
    const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
    const { BrowserRouter } = require('react-router-dom');
    
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    const AllTheProviders = ({ children }) => {
      return (
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </QueryClientProvider>
      );
    };
    
    return render(ui, { wrapper: AllTheProviders, ...options });
  },
  
  // Mock API responses
  mockApiResponse: {
    success: (data) => ({ success: true, data }),
    error: (code, message) => ({ success: false, error: { code, message } }),
    validation: (field, message) => ({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: { [field]: message }
      }
    })
  }
};

// Make testUtils available globally
global.testUtils = testUtils;


// Suppress console warnings in tests (unless debugging)
if (!process.env.JEST_VERBOSE) {
  global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn()
  };
} 