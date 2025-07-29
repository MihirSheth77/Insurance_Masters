const mongoose = require('mongoose');

const countySchema = new mongoose.Schema({
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
  stateId: {
    type: String,
    required: true,
    maxlength: 2,
    index: true
  },
  ratingAreaCount: {
    type: Number,
    required: true,
    min: 0
  },
  serviceAreaCount: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'counties'
});

// Indexes
countySchema.index({ csvId: 1 }, { unique: true });
countySchema.index({ stateId: 1 });
countySchema.index({ stateId: 1, name: 1 });
countySchema.index({ name: 'text' });

// Instance methods
countySchema.methods.toJSON = function() {
  const county = this.toObject();
  return county;
};

// Static methods
countySchema.statics.findByCsvId = function(csvId) {
  return this.findOne({ csvId });
};

countySchema.statics.findByState = function(stateId) {
  return this.find({ stateId }).sort({ name: 1 });
};

module.exports = mongoose.model('County', countySchema); 