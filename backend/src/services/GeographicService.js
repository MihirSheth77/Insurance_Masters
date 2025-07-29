const ZipCounty = require('../models/ZipCounty');
const County = require('../models/County');
const PlanCounty = require('../models/PlanCounty');

class GeographicService {
  constructor() {
    // Cache for rating areas to improve performance
    this.ratingAreaCache = new Map();
  }

  /**
   * Resolve county from ZIP code
   * Logic: Accept 5-digit ZIP codes
   */
  async resolveCountyFromZip(zipCode) {
    try {
      // Handle 5-digit ZIP codes
      const zipCodeId = parseInt(zipCode);
      
      // Handle invalid ZIP codes
      if (isNaN(zipCodeId) || zipCodeId < 10000 || zipCodeId > 99999) {
        throw new Error('Invalid ZIP code. Must be a valid 5-digit ZIP code.');
      }

      // Query ZipCounty where zipCodeId = parseInt(zipCode)
      const zipCounties = await ZipCounty.find({ zipCodeId: zipCodeId });

      if (!zipCounties || zipCounties.length === 0) {
        throw new Error(`No county found for ZIP code ${zipCode}`);
      }

      // Handle multi-county scenarios
      if (zipCounties.length === 1) {
        // Single county: Return directly
        const county = await County.findOne({ csvId: zipCounties[0].countyId });
        
        // Include available plan count for each county option
        const planCount = await PlanCounty.countDocuments({ countyId: county.csvId });
        
        return {
          single: true,
          county: {
            csvId: county.csvId,
            name: county.name,
            stateId: county.stateId,
            ratingAreaId: zipCounties[0].ratingAreaId,
            availablePlans: planCount
          }
        };
      } else {
        // Multiple counties: Return array for user selection
        const countyOptions = await Promise.all(
          zipCounties.map(async (zipCounty) => {
            const county = await County.findOne({ csvId: zipCounty.countyId });
            const planCount = await PlanCounty.countDocuments({ countyId: county.csvId });
            
            return {
              csvId: county.csvId,
              name: county.name,
              stateId: county.stateId,
              ratingAreaId: zipCounty.ratingAreaId,
              availablePlans: planCount
            };
          })
        );

        return {
          single: false,
          counties: countyOptions
        };
      }
    } catch (error) {
      console.error('Error resolving county from ZIP:', error);
      throw error;
    }
  }

  /**
   * Get rating area for a county
   * Required for premium calculations
   */
  async getRatingAreaForCounty(countyId) {
    try {
      // Cache results for performance
      const cacheKey = `county_${countyId}`;
      if (this.ratingAreaCache.has(cacheKey)) {
        return this.ratingAreaCache.get(cacheKey);
      }

      // Find county's rating area from ZipCounty
      const zipCounty = await ZipCounty.findOne({ countyId: parseInt(countyId) });
      
      if (!zipCounty) {
        throw new Error(`No rating area found for county ${countyId}`);
      }

      const ratingAreaId = zipCounty.ratingAreaId;
      
      // Cache the result
      this.ratingAreaCache.set(cacheKey, ratingAreaId);
      
      return ratingAreaId;
    } catch (error) {
      console.error('Error getting rating area for county:', error);
      throw error;
    }
  }

  /**
   * Clear the rating area cache
   */
  clearCache() {
    this.ratingAreaCache.clear();
  }
}

module.exports = new GeographicService(); 