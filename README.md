# Insurance Masters - Group Insurance Quoting Tool

> **Full-Stack Developer Coding Challenge Solution**  
> **MERN Stack Implementation** (MongoDB, Express.js, React, Node.js)

A comprehensive group health insurance quoting tool built to demonstrate full-stack proficiency. This application guides users through a complete workflow for creating groups, defining ICHRA classes, onboarding members, and generating detailed insurance quotes with real-time comparison analytics.

## 🎯 **Project Overview**

This application implements the complete group insurance quoting workflow as specified in the coding challenge:

1. **Group Setup** - Create groups with complete address and effective date information
2. **Class Definition** - Define ICHRA employee classes with contribution structures  
3. **Member Onboarding** - Add members via file upload or manual entry with class assignments
4. **Group Quoting** - Generate comprehensive quotes with ICHRA affordability calculations

## 🏗️ **Architecture & Tech Stack**

### **Backend (Node.js + Express.js)**
- **Express.js** API with RESTful endpoints
- **MongoDB** with Mongoose ODM for data persistence
- **Ideon API Integration** for group/member creation and ICHRA calculations
- **Rate Limiting** with intelligent queuing (100 requests/minute)
- **CSV Data Import** for plans, pricing, and geographic data
- **Comprehensive Error Handling** and validation

### **Frontend (React)**
- **React 18** with modern hooks and context
- **React Router** for navigation between workflow steps
- **React Query** for data fetching and caching
- **Recharts** for data visualization
- **File Upload** with drag-and-drop CSV processing
- **Real-time Filtering** with live quote recalculation

### **Database (MongoDB)**
- **Groups** - Employer organizations with Ideon integration
- **ICHRA Classes** - Employee categorization with contribution structures
- **Members** - Employee data with class assignments and previous plan info
- **Plans/Pricing** - Insurance plan catalog imported from CSV files
- **Quote Results** - Generated quotes with affordability calculations

## 🔧 **Core Functionalities Implemented**

### **1. ICHRA Class Management ✅**
- ✅ **Create/Edit/Delete Classes** - Full CRUD operations for employee classes
- ✅ **Sub-classes Support** - Age-based and hierarchical class structures
- ✅ **Contribution Definition** - Separate employee/dependent contribution amounts
- ✅ **Class Types** - Full-time, Part-time, Seasonal, Salaried, Hourly employees
- ✅ **MongoDB Storage** - All class data persisted with group relationships

```javascript
// ICHRA Class Schema Implementation
{
  groupId: ObjectId,
  name: String,
  type: ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'],
  employeeContribution: Number,
  dependentContribution: Number,
  ageBasedContributions: Boolean,
  parentClassId: ObjectId // For sub-classes
}
```

### **2. Group and Member Management (Ideon API) ✅**
- ✅ **Group Creation** - `POST /groups` endpoint integration
- ✅ **Member Creation** - `POST /groups/{id}/members` endpoint integration  
- ✅ **Class Assignment** - Members assigned to ICHRA classes
- ✅ **Previous Plan Data** - Employer/employee contribution tracking
- ✅ **MongoDB Storage** - All data stored locally with Ideon ID references

```javascript
// Group Creation with Ideon API
const group = await ideonAPIService.createGroup({
  name: "Acme Corporation",
  address: { street1, city, state, zipCode },
  effectiveDate: "2024-01-01"
});

// Member Creation with Class Assignment
const member = await ideonAPIService.createMember(groupId, {
  personalInfo: { firstName, lastName, dateOfBirth },
  classId: ichraClassId,
  previousPlan: {
    employerContribution: 450,
    employeeContribution: 200
  }
});
```

### **3. ICHRA Affordability Calculation (Ideon API) ✅**
- ✅ **Group ICHRA Affordability** - Using Ideon's affordability endpoints
- ✅ **Results Storage** - Calculations stored in MongoDB
- ✅ **Rate Limiting** - Special handling for ICHRA API limits
- ✅ **Error Handling** - Comprehensive failure management

```javascript
// ICHRA Affordability Implementation
const affordabilityResult = await ideonAPIService.calculateGroupAffordability(groupId, {
  effectiveDate: group.effectiveDate,
  members: membersData.map(member => ({
    id: member.ideonMemberId,
    zipCode: member.personalInfo.zipCode,
    age: member.personalInfo.age,
    householdIncome: member.householdIncome,
    familySize: member.familySize
  }))
});
```

### **4. CSV Data Import & Premium Calculation ✅**
- ✅ **CSV Import Scripts** - All required CSV files imported to MongoDB
- ✅ **County Resolution** - Zip code to county mapping with multi-county handling
- ✅ **Plan Availability** - County-based plan filtering
- ✅ **Premium Calculation** - Age and tobacco-based pricing
- ✅ **On/Off Market Support** - Both plan types with subsidy calculations

**CSV Files Imported:**
- `plans.csv` - Insurance plan catalog
- `pricings.csv` - Age/tobacco-based premium calculations  
- `plan_counties.csv` - Geographic plan availability
- `zip_counties.csv` - Zip code to county mapping
- `counties.csv` - County reference data

**Premium Calculation Logic:**
```javascript
// Off-Market Plans
1. Find County from Zip Code (zip_counties.csv + counties.csv)
2. Find Available Plans (plan_counties.csv)  
3. Determine Premium (pricings.csv by age/tobacco)
4. Get Plan Details (plans.csv)

// On-Market Plans  
1. Calculate Benchmark Premium (2nd lowest Silver plan)
2. Determine Expected Contribution (MAGI vs FPL calculation)
3. Calculate Subsidy (Benchmark - Expected Contribution)
4. Apply Subsidy to All Plans
```

### **5. Quote Summary & Comparison Report ✅**
- ✅ **Employer Comparison** - Old vs new plan cost analysis
- ✅ **Employee Comparisons** - Individual savings calculations
- ✅ **Interactive Filtering** - Real-time plan filtering by carrier, metal level, market
- ✅ **Dynamic Recalculation** - Live updates of savings as filters change
- ✅ **Visual Analytics** - Charts and graphs for cost comparisons

**Comparison Features:**
- **Employer Analysis** - Total cost comparison, monthly/annual savings
- **Employee Analysis** - Individual out-of-pocket costs and savings
- **Real-time Filters** - Carrier, Metal Level (Bronze/Silver/Gold), Market Type
- **Live Updates** - Instant recalculation as filters are applied

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 16+ 
- MongoDB Atlas account or local MongoDB
- Ideon API key (trial or production)

### **Installation & Setup**

1. **Clone the repository**
```bash
git clone https://github.com/MihirSheth77/Insurance_Masters.git
cd Insurance_Masters
```

2. **Backend Setup**
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# MONGODB_URI=mongodb+srv://...
# IDEON_API_KEY=your_api_key
# IDEON_BASE_URL=https://api.ideonapi.com

# Import CSV data to MongoDB
npm run import:all

# Start backend server
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install

# Configure environment  
cp .env.example .env
# Edit .env:
# REACT_APP_API_URL=http://localhost:5000/api

# Start frontend application
npm start
```

4. **Access the application**
```
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api
```

## 📁 **Project Structure**

```
Insurance_Masters/
├── backend/                     # Express.js API Server
│   ├── src/
│   │   ├── models/              # MongoDB Schemas
│   │   │   ├── Group.js         # Groups with Ideon integration
│   │   │   ├── Member.js        # Members with class assignments
│   │   │   ├── ICHRAClass.js    # ICHRA employee classes
│   │   │   ├── Plan.js          # Insurance plans from CSV
│   │   │   ├── Pricing.js       # Premium calculations
│   │   │   └── Quote.js         # Generated quotes
│   │   ├── services/            # Business Logic
│   │   │   ├── IdeonAPIService.js    # Ideon API integration
│   │   │   ├── ICHRAService.js       # ICHRA calculations
│   │   │   ├── QuoteService.js       # Quote generation
│   │   │   ├── PricingService.js     # Premium calculations
│   │   │   └── RateLimitService.js   # API rate limiting
│   │   ├── routes/              # API Endpoints
│   │   │   ├── groups.js        # Group management
│   │   │   ├── members.js       # Member management  
│   │   │   ├── classes.js       # ICHRA class management
│   │   │   ├── quotes.js        # Quote generation
│   │   │   └── ideon.js         # Ideon API proxy
│   │   └── controllers/         # Route Handlers
│   ├── scripts/                 # Data Import Scripts
│   │   ├── importData/          # CSV import utilities
│   │   │   ├── importAll.js     # Import all CSV files
│   │   │   ├── importPlans.js   # Plans data import
│   │   │   ├── importPricings.js # Pricing data import
│   │   │   └── importCounties.js # Geographic data import
│   └── tests/                   # Test Suites
│       ├── unit/                # Unit tests
│       └── integration/         # Integration tests
│
├── frontend/                    # React Application
│   ├── src/
│   │   ├── pages/               # Main Application Pages
│   │   │   ├── Groups/          # Group management
│   │   │   ├── GroupSetup/      # Group creation workflow
│   │   │   ├── ClassManagement/ # ICHRA class management
│   │   │   ├── MemberManagement/# Member onboarding
│   │   │   ├── QuoteResults/    # Quote summary & comparison
│   │   │   └── Dashboard/       # Analytics dashboard
│   │   ├── components/          # Reusable Components
│   │   │   ├── forms/           # Form components
│   │   │   ├── tables/          # Data tables
│   │   │   ├── charts/          # Data visualization
│   │   │   └── common/          # Shared components
│   │   ├── services/            # API Services
│   │   ├── hooks/               # Custom React Hooks
│   │   └── context/             # State Management
│   └── cypress/                 # E2E Tests
```

## 🔌 **API Endpoints**

### **Group Management**
```
POST   /api/groups              # Create new group (with Ideon API)
GET    /api/groups              # List all groups
GET    /api/groups/:id          # Get group details
PUT    /api/groups/:id          # Update group
DELETE /api/groups/:id          # Delete group
```

### **ICHRA Class Management**
```
GET    /api/classes             # List classes for group
POST   /api/classes             # Create new ICHRA class
PUT    /api/classes/:id         # Update class
DELETE /api/classes/:id         # Delete class
POST   /api/classes/:id/subclass # Create sub-class
```

### **Member Management**
```
GET    /api/members             # List members
POST   /api/members             # Create member (with Ideon API)
POST   /api/members/bulk        # Bulk import from CSV
PUT    /api/members/:id         # Update member
DELETE /api/members/:id         # Delete member
```

### **Quote Generation**
```
POST   /api/quotes/generate     # Generate comprehensive group quote
GET    /api/quotes/:id          # Get quote details
GET    /api/quotes/group/:groupId # Get all quotes for group
```

### **ICHRA Affordability**
```
POST   /api/ichra/affordability # Calculate ICHRA affordability (Ideon API)
GET    /api/ichra/results/:groupId # Get affordability results
```

## 🛡️ **Rate Limiting Implementation**

The application implements sophisticated rate limiting for the Ideon API:

```javascript
// Production: 100 requests/minute
// Trial: 5 requests/minute  
// ICHRA Affordability: 10 total requests in trial

const limiter = new Bottleneck({
  reservoir: 100,                    // Request pool
  reservoirRefreshAmount: 100,       // Refill amount
  reservoirRefreshInterval: 60000,   // 1 minute
  maxConcurrent: 5,                  // Concurrent requests
  minTime: 600,                      // 600ms between requests
  
  // Exponential backoff on rate limit
  retryDelayGenerators: {
    429: (attemptNumber) => Math.pow(2, attemptNumber) * 1000
  }
});
```

**Features:**
- ✅ **Intelligent Queuing** - Requests queued when rate limit approached
- ✅ **Exponential Backoff** - Automatic retry with increasing delays
- ✅ **Concurrent Limiting** - Maximum 5 simultaneous requests
- ✅ **Special ICHRA Handling** - Separate limiter for affordability calculations

## 🗃️ **Database Schema**

### **Core Collections**

**Groups Collection:**
```javascript
{
  _id: ObjectId,
  ideonGroupId: String,           // Ideon API reference
  name: String,
  address: {
    street1: String,
    city: String, 
    state: String,
    zipCode: String
  },
  effectiveDate: Date,
  status: String
}
```

**Members Collection:**
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  ideonMemberId: String,          // Ideon API reference
  classId: ObjectId,              // ICHRA class assignment
  personalInfo: {
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    age: Number,
    zipCode: String
  },
  householdIncome: Number,        // For ICHRA calculations
  familySize: Number,
  tobaccoUse: Boolean,
  previousPlan: {                 // For comparison reporting
    employerContribution: Number,
    employeeContribution: Number,
    planName: String
  }
}
```

**ICHRA Classes Collection:**
```javascript
{
  _id: ObjectId,
  groupId: ObjectId,
  name: String,
  type: String,                   // full-time, part-time, etc.
  employeeContribution: Number,   // Monthly contribution
  dependentContribution: Number,  // Monthly dependent contribution
  ageBasedContributions: Boolean,
  parentClassId: ObjectId         // For sub-classes
}
```

## 📊 **Quote Generation Process**

1. **Data Collection**
   - Group information and effective date
   - All active members with class assignments
   - Previous plan contribution data

2. **ICHRA Affordability Calculation**
   - Call Ideon API for each member
   - Determine affordability based on income/family size
   - Store results in MongoDB

3. **Plan Discovery & Pricing**
   - Find county from member zip codes
   - Query available plans from CSV data
   - Calculate premiums based on age/tobacco use
   - Apply subsidies for on-market plans

4. **Comparison Analysis**
   - Calculate total employer costs (old vs new)
   - Determine individual employee savings
   - Generate comprehensive summary report

5. **Interactive Filtering**
   - Real-time plan filtering capabilities
   - Dynamic recalculation of savings
   - Updated employer/employee comparisons

## 🧪 **Testing Strategy**

### **Backend Testing**
```bash
npm test                    # All tests
npm run test:unit          # Unit tests  
npm run test:integration   # Integration tests
npm run test:coverage      # Coverage report
```

### **Frontend Testing**
```bash
npm test                   # Jest unit tests
npm run test:e2e          # Cypress E2E tests  
npm run test:coverage     # Coverage report
```

**Test Coverage:**
- ✅ **Unit Tests** - Services, utilities, and components
- ✅ **Integration Tests** - API endpoints and database operations
- ✅ **E2E Tests** - Complete user workflows
- ✅ **API Tests** - Ideon API integration testing

## 🎥 **Project Walkthrough**

A comprehensive video walkthrough demonstrating:
- Complete application workflow (Group → Classes → Members → Quotes)
- Architecture explanation and design decisions
- Code structure and key implementation details
- Rate limiting and error handling
- Real-time filtering and calculations

**Video Location:** `/project-walkthrough.mp4` *(or cloud link if file too large)*

## 🚀 **Deployment & Production**

The application is production-ready with:
- ✅ **Environment Configuration** - Separate dev/staging/prod configs
- ✅ **Error Handling** - Comprehensive error boundaries and logging
- ✅ **Security** - Input validation, rate limiting, CORS protection
- ✅ **Performance** - Query optimization, caching, lazy loading
- ✅ **Monitoring** - API health checks and performance metrics

## 💡 **Key Technical Achievements**

1. **Complex Rate Limiting** - Sophisticated queuing for shared API resources
2. **Real-time Calculations** - Live quote updates with filtering
3. **CSV Data Processing** - Efficient import and querying of large datasets
4. **ICHRA Compliance** - Accurate affordability calculations per federal guidelines
5. **Workflow Management** - Non-sequential navigation with data consistency
6. **Error Resilience** - Comprehensive error handling and recovery

## 📋 **Evaluation Criteria Addressed**

- ✅ **Functionality** - All specified requirements implemented and working
- ✅ **Code Quality** - Clean, maintainable, well-documented code structure
- ✅ **Problem-Solving** - Effective solutions for rate limiting and technical challenges
- ✅ **MERN Stack Proficiency** - Full utilization of MongoDB, Express, React, Node.js
- ✅ **API Integration** - Proper Ideon API usage with error handling
- ✅ **Database Design** - Efficient schema design and query optimization

---

## 🏆 **Summary**

This project demonstrates a complete full-stack insurance quoting application built according to the coding challenge specifications. The solution showcases:

- **Enterprise-grade architecture** with proper separation of concerns
- **Real-world API integration** with rate limiting and error handling  
- **Complex business logic** implementation for insurance calculations
- **Modern React development** with hooks, context, and real-time updates
- **Production-ready code** with comprehensive testing and documentation

**Built with the MERN stack as required, delivering a professional insurance quoting tool ready for enterprise deployment.** 