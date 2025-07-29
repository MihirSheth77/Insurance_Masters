// 10 records, 3 fields 
const mongoose = require('mongoose');

const serviceAreaSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  issuerId: {
    type: String,
    required: true,
    index: true,
    ref: 'Issuer'
  },
  name: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'serviceareas'
});

// Static method to transform CSV data
serviceAreaSchema.statics.transformFromCSV = function(csvRow) {
  return {
    id: csvRow.id,
    issuerId: csvRow.issuer_id,
    name: csvRow.name
  };
};

// Static method to get all service areas for an issuer
serviceAreaSchema.statics.getByIssuer = async function(issuerId) {
  return await this.find({ issuerId: issuerId });
};

// Static method to get service area details
serviceAreaSchema.statics.getDetails = async function(serviceAreaId) {
  return await this.findOne({ id: serviceAreaId });
};

const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);

module.exports = ServiceArea; 