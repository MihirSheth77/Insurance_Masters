const mongoose = require('mongoose');

const issuerSchema = new mongoose.Schema({
  csvId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  alternateName: {
    type: String,
    trim: true,
    default: null
  },
  logoPath: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true,
  collection: 'issuers'
});

// Indexes
issuerSchema.index({ csvId: 1 }, { unique: true });
issuerSchema.index({ 
  name: 'text', 
  alternateName: 'text' 
}, {
  weights: {
    name: 10,
    alternateName: 5
  }
});

// Instance methods
issuerSchema.methods.toJSON = function() {
  const issuer = this.toObject();
  return issuer;
};

// Static methods
issuerSchema.statics.findByCsvId = function(csvId) {
  return this.findOne({ csvId });
};

issuerSchema.statics.searchByName = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm }
  }).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Issuer', issuerSchema); 