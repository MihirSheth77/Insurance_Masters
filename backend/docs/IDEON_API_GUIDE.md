# Ideon API Integration Guide

## Overview

Ideon (formerly Vericred) provides a unified API for health insurance data and operations.

**Base URL**: `https://api.ideonapi.com`

**API Version**: The default version is v6. Some endpoints support v7 or v8 functionality.

**Main Endpoints**:
- `/networks` - Provider network information
- `/plans` - Insurance plan data
- `/carriers` - Insurance carrier information
- `/groups` - Group management (may require special access)
- `/members` - Member management
- `/quotes` - Quote generation
- `/ichra_affordability` - ICHRA affordability calculations

## Authentication

All requests require the `Vericred-Api-Key` header:
```
Vericred-Api-Key: YOUR_API_KEY
```

Optionally include version header for newer features:
```
Accept-Version: v6
```

## Trial API Limitations

1. **Rate Limits**:
   - 5 requests per minute
   - 100 total requests per trial period
   - 10 ICHRA affordability calculations total

2. **Available Endpoints**:
   - Not all endpoints may be available in trial
   - Some endpoints return limited data

## Common Issues and Solutions

### "No such resource" Error
**Cause**: Endpoint doesn't exist or requires special access
**Solution**: 
- Verify endpoint name (e.g., `/ichra_affordability` not `/ichra/affordability`)
- Some endpoints may not be available in trial accounts
- Contact sales@ideonapi.com for access to specific endpoints

### 401 Unauthorized
**Cause**: Invalid or missing API key
**Solution**: Verify `Vericred-Api-Key` header is set correctly

### 429 Rate Limit Exceeded
**Cause**: Too many requests
**Solution**: Wait 60 seconds or reduce request frequency

## Testing the API

Run the test script:
```bash
cd backend
node scripts/testIdeonAPI.js
```

This will test various endpoints and show which are accessible with your API key.

## Workflow Example

1. **Create a Group**
   ```
   POST https://api.ideonapi.com/groups
   ```

2. **Add Members**
   ```
   POST https://api.ideonapi.com/groups/{groupId}/members
   ```

3. **Create Quote**
   ```
   POST https://api.ideonapi.com/quotes
   ```

4. **Calculate ICHRA Affordability**
   ```
   POST https://api.ideonapi.com/ichra_affordability
   ```

**Note**: Group and enrollment endpoints may require special access. Contact Ideon for enrollment API access.

## Support

- Documentation: https://developers.ideonapi.com/
- Email: sales@ideonapi.com
- Phone: +1 201-552-4400