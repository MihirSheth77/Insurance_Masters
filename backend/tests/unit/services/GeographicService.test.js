// Unit Tests for GeographicService
// Tests multi-county ZIP resolution and geographic data accuracy

const { describe, test, expect, beforeEach, jest } = require('@jest/globals');
const GeographicService = require('../../../src/services/GeographicService');
const ZipCounty = require('../../../src/models/ZipCounty');
const County = require('../../../src/models/County');
const RatingArea = require('../../../src/models/RatingArea');

describe('GeographicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('resolveCountyFromZip', () => {
    test('should resolve single county for ZIP code', async () => {
      // Mock single county result
      const mockZipData = [{
        zipCodeId: '78701',
        countyId: 'TRAVIS_TX',
        isPrimary: true
      }];
      
      const mockCountyData = {
        countyId: 'TRAVIS_TX',
        countyName: 'Travis',
        stateAbbreviation: 'TX',
        stateName: 'Texas',
        ratingAreaId: 'RA_TX_001'
      };
      
      jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockZipData)
      }));
      
      jest.spyOn(County, 'findOne').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockCountyData)
      }));
      
      const result = await GeographicService.resolveCountyFromZip('78701');
      
      expect(result).toEqual({
        zipCode: '78701',
        isMultiCounty: false,
        primaryCounty: mockCountyData,
        allCounties: [mockCountyData],
        planCount: expect.any(Number)
      });
      
      expect(ZipCounty.find).toHaveBeenCalledWith({ zipCodeId: '78701' });
    });
    
    test('should resolve multiple counties for ZIP code', async () => {
      // Mock multi-county result
      const mockZipData = [
        { zipCodeId: '12345', countyId: 'COUNTY_A', isPrimary: true },
        { zipCodeId: '12345', countyId: 'COUNTY_B', isPrimary: false },
        { zipCodeId: '12345', countyId: 'COUNTY_C', isPrimary: false }
      ];
      
      const mockCounties = [
        { countyId: 'COUNTY_A', countyName: 'County A', stateAbbreviation: 'TX' },
        { countyId: 'COUNTY_B', countyName: 'County B', stateAbbreviation: 'TX' },
        { countyId: 'COUNTY_C', countyName: 'County C', stateAbbreviation: 'TX' }
      ];
      
      jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockZipData)
      }));
      
      jest.spyOn(County, 'findOne')
        .mockImplementationOnce(() => ({ exec: jest.fn().mockResolvedValue(mockCounties[0]) }))
        .mockImplementationOnce(() => ({ exec: jest.fn().mockResolvedValue(mockCounties[1]) }))
        .mockImplementationOnce(() => ({ exec: jest.fn().mockResolvedValue(mockCounties[2]) }));
      
      const result = await GeographicService.resolveCountyFromZip('12345');
      
      expect(result.isMultiCounty).toBe(true);
      expect(result.primaryCounty).toEqual(mockCounties[0]);
      expect(result.allCounties).toHaveLength(3);
      expect(result.allCounties).toContainEqual(mockCounties[0]);
      expect(result.allCounties).toContainEqual(mockCounties[1]);
      expect(result.allCounties).toContainEqual(mockCounties[2]);
    });
    
    test('should handle MVP ZIP codes (1-572)', async () => {
      const mvpZipCodes = ['1', '50', '100', '250', '400', '572'];
      
      for (const zipCode of mvpZipCodes) {
        const mockZipData = [{
          zipCodeId: zipCode,
          countyId: `COUNTY_${zipCode}`,
          isPrimary: true
        }];
        
        const mockCountyData = {
          countyId: `COUNTY_${zipCode}`,
          countyName: `County ${zipCode}`,
          stateAbbreviation: 'TX'
        };
        
        jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(mockZipData)
        }));
        
        jest.spyOn(County, 'findOne').mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(mockCountyData)
        }));
        
        const result = await GeographicService.resolveCountyFromZip(zipCode);
        
        expect(result.zipCode).toBe(zipCode);
        expect(result.primaryCounty.countyId).toBe(`COUNTY_${zipCode}`);
        
        jest.clearAllMocks();
      }
    });
    
    test('should throw error for invalid ZIP code', async () => {
      jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue([])
      }));
      
      await expect(GeographicService.resolveCountyFromZip('00000'))
        .rejects.toThrow('ZIP code not found in our service area');
        
      await expect(GeographicService.resolveCountyFromZip('99999'))
        .rejects.toThrow('ZIP code not found in our service area');
    });
    
    test('should validate ZIP code format', async () => {
      const invalidZipCodes = ['ABCDE', '123', '1234567', '', null, undefined];
      
      for (const invalidZip of invalidZipCodes) {
        await expect(GeographicService.resolveCountyFromZip(invalidZip))
          .rejects.toThrow('Invalid ZIP code format');
      }
    });
    
    test('should include plan count for each county', async () => {
      const mockZipData = [{
        zipCodeId: '78701',
        countyId: 'TRAVIS_TX',
        isPrimary: true
      }];
      
      const mockCountyData = {
        countyId: 'TRAVIS_TX',
        countyName: 'Travis',
        stateAbbreviation: 'TX'
      };
      
      // Mock plan count
      const PlanCounty = require('../../../src/models/PlanCounty');
      jest.spyOn(PlanCounty, 'countDocuments').mockImplementation(() => 
        Promise.resolve(25)
      );
      
      jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockZipData)
      }));
      
      jest.spyOn(County, 'findOne').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockCountyData)
      }));
      
      const result = await GeographicService.resolveCountyFromZip('78701');
      
      expect(result.planCount).toBe(25);
      expect(PlanCounty.countDocuments).toHaveBeenCalledWith({ countyId: 'TRAVIS_TX' });
    });
  });
  
  describe('getRatingAreaForCounty', () => {
    test('should return rating area for valid county', async () => {
      const mockRatingArea = {
        ratingAreaId: 'RA_TX_001',
        stateName: 'Texas',
        stateAbbreviation: 'TX',
        counties: ['TRAVIS_TX', 'WILLIAMSON_TX']
      };
      
      jest.spyOn(RatingArea, 'findOne').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockRatingArea)
      }));
      
      const result = await GeographicService.getRatingAreaForCounty('TRAVIS_TX');
      
      expect(result).toEqual(mockRatingArea);
      expect(RatingArea.findOne).toHaveBeenCalledWith({
        counties: { $in: ['TRAVIS_TX'] }
      });
    });
    
    test('should cache rating area results', async () => {
      const mockRatingArea = {
        ratingAreaId: 'RA_TX_001',
        stateName: 'Texas'
      };
      
      jest.spyOn(RatingArea, 'findOne').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockRatingArea)
      }));
      
      // First call
      const result1 = await GeographicService.getRatingAreaForCounty('TRAVIS_TX');
      
      // Second call should use cache
      const result2 = await GeographicService.getRatingAreaForCounty('TRAVIS_TX');
      
      expect(result1).toEqual(result2);
      expect(RatingArea.findOne).toHaveBeenCalledTimes(1); // Should only call DB once
    });
    
    test('should throw error for county not in any rating area', async () => {
      jest.spyOn(RatingArea, 'findOne').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));
      
      await expect(GeographicService.getRatingAreaForCounty('INVALID_COUNTY'))
        .rejects.toThrow('Rating area not found for county');
    });
  });
  
  describe('Performance and caching', () => {
    test('should handle concurrent ZIP resolutions efficiently', async () => {
      const zipCodes = ['78701', '90210', '10001', '33101', '60601'];
      
      // Mock data for each ZIP
      zipCodes.forEach((zipCode, index) => {
        const mockZipData = [{
          zipCodeId: zipCode,
          countyId: `COUNTY_${index}`,
          isPrimary: true
        }];
        
        const mockCountyData = {
          countyId: `COUNTY_${index}`,
          countyName: `County ${index}`,
          stateAbbreviation: 'TX'
        };
        
        jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(mockZipData)
        }));
        
        jest.spyOn(County, 'findOne').mockImplementation(() => ({
          exec: jest.fn().mockResolvedValue(mockCountyData)
        }));
      });
      
      const startTime = Date.now();
      
      const promises = zipCodes.map(zipCode => 
        GeographicService.resolveCountyFromZip(zipCode)
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(500); // Should complete quickly
      
      results.forEach((result, index) => {
        expect(result.zipCode).toBe(zipCodes[index]);
        expect(result.primaryCounty.countyId).toBe(`COUNTY_${index}`);
      });
    });
    
    test('should cache county data to reduce database calls', async () => {
      const mockZipData = [{
        zipCodeId: '78701',
        countyId: 'TRAVIS_TX',
        isPrimary: true
      }];
      
      const mockCountyData = {
        countyId: 'TRAVIS_TX',
        countyName: 'Travis',
        stateAbbreviation: 'TX'
      };
      
      jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockZipData)
      }));
      
      jest.spyOn(County, 'findOne').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockCountyData)
      }));
      
      // Multiple calls for same ZIP
      await GeographicService.resolveCountyFromZip('78701');
      await GeographicService.resolveCountyFromZip('78701');
      await GeographicService.resolveCountyFromZip('78701');
      
      // Should use caching to reduce database calls
      expect(ZipCounty.find).toHaveBeenCalledTimes(1);
      expect(County.findOne).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('Data validation and consistency', () => {
    test('should validate county data completeness', async () => {
      const mockZipData = [{
        zipCodeId: '78701',
        countyId: 'TRAVIS_TX',
        isPrimary: true
      }];
      
      // Mock incomplete county data
      const incompleteCountyData = {
        countyId: 'TRAVIS_TX',
        // Missing required fields
      };
      
      jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockZipData)
      }));
      
      jest.spyOn(County, 'findOne').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(incompleteCountyData)
      }));
      
      await expect(GeographicService.resolveCountyFromZip('78701'))
        .rejects.toThrow('Incomplete county data');
    });
    
    test('should ensure primary county is marked correctly', async () => {
      const mockZipData = [
        { zipCodeId: '12345', countyId: 'COUNTY_A', isPrimary: false },
        { zipCodeId: '12345', countyId: 'COUNTY_B', isPrimary: false },
        { zipCodeId: '12345', countyId: 'COUNTY_C', isPrimary: true }
      ];
      
      const mockCounties = [
        { countyId: 'COUNTY_A', countyName: 'County A' },
        { countyId: 'COUNTY_B', countyName: 'County B' },
        { countyId: 'COUNTY_C', countyName: 'County C' }
      ];
      
      jest.spyOn(ZipCounty, 'find').mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(mockZipData)
      }));
      
      jest.spyOn(County, 'findOne')
        .mockImplementationOnce(() => ({ exec: jest.fn().mockResolvedValue(mockCounties[0]) }))
        .mockImplementationOnce(() => ({ exec: jest.fn().mockResolvedValue(mockCounties[1]) }))
        .mockImplementationOnce(() => ({ exec: jest.fn().mockResolvedValue(mockCounties[2]) }));
      
      const result = await GeographicService.resolveCountyFromZip('12345');
      
      // Primary county should be COUNTY_C (the one marked as primary)
      expect(result.primaryCounty.countyId).toBe('COUNTY_C');
      expect(result.isMultiCounty).toBe(true);
    });
  });
}); 