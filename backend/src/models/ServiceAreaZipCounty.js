// 3764 records, 3 fields 
const mongoose = require('mongoose');

const serviceAreaZipCountySchema = new mongoose.Schema({
  countyId: {
    type: Number,
    required: true,
    index: true,
    ref: 'County'
  },
  serviceAreaId: {
    type: String,
    required: true,
    index: true,
    ref: 'ServiceArea'
  },
  zipCodeId: {
    type: Number,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'serviceareazipcounties'
});

// Compound indexes for efficient lookups
serviceAreaZipCountySchema.index({ serviceAreaId: 1, countyId: 1 });
serviceAreaZipCountySchema.index({ serviceAreaId: 1, zipCodeId: 1 });
serviceAreaZipCountySchema.index({ countyId: 1, zipCodeId: 1 });

// Static method to transform CSV data
serviceAreaZipCountySchema.statics.transformFromCSV = function(csvRow) {
  return {
    countyId: parseInt(csvRow.county_id),
    serviceAreaId: csvRow.service_area_id,
    zipCodeId: parseInt(csvRow.zip_code_id)
  };
};

// Static method to get all zip codes in a service area
serviceAreaZipCountySchema.statics.getZipCodesInServiceArea = async function(serviceAreaId) {
  const records = await this.find({ serviceAreaId: serviceAreaId });
  return [...new Set(records.map(r => r.zipCodeId))]; // Return unique zip codes
};

// Static method to get all counties in a service area
serviceAreaZipCountySchema.statics.getCountiesInServiceArea = async function(serviceAreaId) {
  const records = await this.find({ serviceAreaId: serviceAreaId });
  return [...new Set(records.map(r => r.countyId))]; // Return unique counties
};

// Static method to check if a zip code is in a service area
serviceAreaZipCountySchema.statics.isZipInServiceArea = async function(zipCodeId, serviceAreaId) {
  const exists = await this.findOne({ 
    zipCodeId: parseInt(zipCodeId), 
    serviceAreaId: serviceAreaId 
  });
  return !!exists;
};

// Static method to get service areas for a zip code
serviceAreaZipCountySchema.statics.getServiceAreasForZip = async function(zipCodeId) {
  const records = await this.find({ zipCodeId: parseInt(zipCodeId) });
  return [...new Set(records.map(r => r.serviceAreaId))]; // Return unique service areas
};

const ServiceAreaZipCounty = mongoose.model('ServiceAreaZipCounty', serviceAreaZipCountySchema);

module.exports = ServiceAreaZipCounty; 