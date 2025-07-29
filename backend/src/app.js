// Express App Configuration
// Main application setup with middleware, routes, and error handling

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import route modules
const geographicRoutes = require('./routes/geographic');
const planRoutes = require('./routes/plans');
const groupRoutes = require('./routes/groups');
const classRoutes = require('./routes/classes');
const memberRoutes = require('./routes/members');
const quoteRoutes = require('./routes/quotes');
const uploadRoutes = require('./routes/upload');
const ideonRoutes = require('./routes/ideon'); // New Ideon integration routes
const { router: dashboardRoutes } = require('./routes/dashboard'); // Dashboard analytics routes

// Import middleware
const { errorHandler, notFound, AppError } = require('./middleware/errorHandler');
const corsMiddleware = require('./middleware/cors');
const { groupValidators, classValidators, memberValidators, quoteValidators, ichraValidators } = require('./middleware/validators');

const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.ideonapi.com", "https://enrollments.ideonapi.com"]
    }
  }
}));

// CORS configuration
app.use(corsMiddleware);

// Request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    },
    message: 'Insurance Masters API is running'
  });
});

// Also add /api/health for frontend compatibility
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    },
    message: 'Insurance Masters API is running'
  });
});

// API Routes
app.use('/api/geographic', geographicRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups', classRoutes); // Classes are sub-resources of groups
app.use('/api', memberRoutes); // Members are sub-resources of groups
app.use('/api/quotes', quoteRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ideon', ideonRoutes); // Ideon API integration routes
app.use('/api/dashboard', dashboardRoutes); // Dashboard analytics routes

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Insurance Masters API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'ICHRA and health insurance management platform',
      documentation: '/api/docs',
      health: '/health'
    },
    message: 'Welcome to Insurance Masters API'
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    data: {
      endpoints: {
        geographic: {
          'POST /api/geographic/resolve-zip': 'Resolve ZIP code to county information',
          'GET /api/geographic/counties': 'Get all available counties'
        },
        plans: {
          'GET /api/plans/search': 'Search health insurance plans',
          'POST /api/plans/quote': 'Calculate plan premiums and quotes',
          'GET /api/plans/benchmark/:countyId': 'Get benchmark silver plans for subsidies'
        },
        groups: {
          'POST /api/groups': 'Create new employer group',
          'GET /api/groups/:id': 'Get group information',
          'PUT /api/groups/:id': 'Update group information'
        },
        classes: {
          'POST /api/groups/:groupId/classes': 'Create ICHRA employee class',
          'GET /api/groups/:groupId/classes': 'List all classes for group',
          'POST /api/groups/:groupId/classes/:classId/subclasses': 'Create age-based sub-class'
        },
        members: {
          'POST /api/groups/:groupId/members': 'Add individual member',
          'POST /api/groups/:groupId/members/bulk': 'Bulk upload members via CSV',
          'GET /api/groups/:groupId/members': 'List group members with pagination'
        },
        quotes: {
          'POST /api/quotes/generate': 'Generate ICHRA quote for group',
          'GET /api/quotes/:quoteId': 'Get quote results',
          'POST /api/quotes/:quoteId/export': 'Export quote to PDF/Excel'
        },
        ideon: {
          'GET /api/ideon/health': 'Check Ideon API connectivity and status',
          'POST /api/ideon/groups': 'Test group creation in Ideon API',
          'POST /api/ideon/groups/:groupId/members': 'Test member creation in Ideon API',
          'POST /api/ideon/quotes': 'Test quote creation in Ideon API',
          'GET /api/ideon/quotes/:quoteId': 'Get quote results from Ideon API',
          'POST /api/ideon/ichra/affordability': 'Calculate ICHRA affordability',
          'POST /api/ideon/ichra/minimum-contribution': 'Calculate minimum ICHRA contribution',
          'POST /api/ideon/ichra/group-affordability': 'Calculate group ICHRA affordability',
          'GET /api/ideon/plans': 'Get available plans from Ideon API',
          'GET /api/ideon/rate-limits': 'Check current rate limiting status',
          'POST /api/ideon/test-workflow': 'Test complete Ideon API workflow'
        }
      },
      authentication: {
        ideon_api: 'Vericred-Api-Key header required for Ideon API integration'
      },
      rate_limits: {
        general: '100 requests per 15 minutes per IP',
        ideon_api: '100 requests per minute (shared), 5/minute in trial',
        ichra_affordability: '10 calculations per trial period'
      }
    },
    message: 'Insurance Masters API Documentation'
  });
});

// 404 handler for undefined routes
app.use(notFound);

// Global error handling middleware
app.use(errorHandler);

module.exports = app; 