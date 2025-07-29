// 572 records, 4 fields 
const mongoose = require('mongoose');

const zipCountySchema = new mongoose.Schema({
  csvId: {
    type: Number,
    required: true,
    unique: true
  },
  zipCodeId: {
    type: Number,
    required: true,
    index: true,
    min: 10000,
    max: 99999
    // Standard 5-digit ZIP codes
  },
  countyId: {
    type: Number,
    required: true,
    index: true,
    ref: 'County'
  },
  ratingAreaId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'zipcounties'
});

// Compound indexes for efficient lookups
zipCountySchema.index({ zipCodeId: 1, countyId: 1 });
zipCountySchema.index({ countyId: 1, ratingAreaId: 1 });

// Static method to transform CSV data
zipCountySchema.statics.transformFromCSV = function(csvRow) {
  return {
    csvId: parseInt(csvRow.id),
    zipCodeId: parseInt(csvRow.zip_code_id),
    countyId: parseInt(csvRow.county_id),
    ratingAreaId: csvRow.rating_area_id
  };
};

// Static method to get county by ZIP code
zipCountySchema.statics.getCountyByZipCode = async function(zipCode) {
  // Handle 5-digit ZIP codes
  const zipCodeId = parseInt(zipCode);
  if (zipCodeId < 10000 || zipCodeId > 99999) {
    return null;
  }
  
  return await this.findOne({ zipCodeId: zipCodeId });
};

// Static method to get all ZIP codes for a county
zipCountySchema.statics.getZipCodesByCounty = async function(countyId) {
  return await this.find({ countyId: parseInt(countyId) });
};

// Static method to get rating area for a ZIP code
zipCountySchema.statics.getRatingAreaByZipCode = async function(zipCode) {
  const zipCounty = await this.getCountyByZipCode(zipCode);
  return zipCounty ? zipCounty.ratingAreaId : null;
};

const ZipCounty = mongoose.model('ZipCounty', zipCountySchema);

module.exports = ZipCounty; 