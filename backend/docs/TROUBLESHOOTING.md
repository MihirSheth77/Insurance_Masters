# Troubleshooting Guide

## Common Issues and Solutions

### 1. "No pricing found for plan X in rating area Y" Error

**Symptoms:**
- Quote generation fails with errors like "No pricing found for plan X in rating area OR01"
- "No Silver plans with pricing available" error when calculating subsidies

**Root Cause:**
The pricing and plan data in the CSV files have expiration dates (e.g., 2024-12-31) that may be in the past relative to the current date. The application correctly filters out expired pricing records, which causes quotes to fail.

**Solutions:**

#### Quick Fix (Development/Testing):
Run the date update scripts to update all pricing and plan dates to the current year:

```bash
cd backend
node scripts/updatePricingDates.js
node scripts/updatePlanDates.js
```

#### Permanent Fix:
The import scripts have been modified to automatically update expired dates to the current year during import. When re-importing data:

```bash
cd backend
npm run import:all
# or
npm run import-data
```

The import scripts will now:
1. Check if the expiration date is in the past
2. If expired, update both effective and expiration dates to the current year
3. Maintain the same date ranges (e.g., Jan 1 - Dec 31)

### 2. Database Connection Issues

**Symptoms:**
- "Database service temporarily unavailable" errors
- Cannot connect to MongoDB

**Solutions:**
1. Ensure MongoDB is running locally: `mongod`
2. Check the MONGODB_URI in your .env file
3. Default connection string: `mongodb://localhost:27017/insurance_masters`

### 3. Missing Data After Import

**Symptoms:**
- No plans available for certain counties
- Missing pricing data

**Solutions:**
1. Verify CSV files are in the project root:
   - counties.csv
   - issuers.csv
   - plan_counties.csv
   - plans.csv
   - pricings.csv
   - rating_areas.csv
   - service_area_zip_counties.csv
   - service_areas.csv
   - zip_counties.csv

2. Run the import script and check for errors:
   ```bash
   npm run import:all
   ```

3. Verify data counts match expected values:
   - Plans: 177 records
   - Pricings: 929 records

### 4. Frontend API Connection Issues

**Symptoms:**
- Frontend cannot connect to backend API
- CORS errors

**Solutions:**
1. Ensure backend is running on port 5001: `npm run dev`
2. Check frontend proxy configuration points to `http://localhost:5001`
3. Verify CORS is enabled in backend server configuration

## Data Validation

To verify your data is properly imported:

```javascript
// Run this in the backend directory
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/insurance_masters').then(async () => {
  const Pricing = require('./src/models/Pricing');
  const Plan = require('./src/models/Plan');
  const PlanCounty = require('./src/models/PlanCounty');
  
  console.log('Database Summary:');
  console.log('- Plans:', await Plan.countDocuments());
  console.log('- Pricings:', await Pricing.countDocuments());
  console.log('- Plan-County mappings:', await PlanCounty.countDocuments());
  
  const now = new Date();
  const validPricing = await Pricing.countDocuments({
    effectiveDate: { $lte: now },
    expirationDate: { $gte: now }
  });
  console.log('- Valid (non-expired) pricings:', validPricing);
  
  process.exit(0);
});
"
```

## Debugging Tips

1. **Enable detailed logging**: Set `DEBUG=true` in your .env file
2. **Check MongoDB logs**: Look for connection issues or query errors
3. **API response inspection**: Use browser DevTools Network tab to see actual API responses
4. **Database inspection**: Use MongoDB Compass or similar tool to browse collections directly