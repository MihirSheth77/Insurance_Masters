// 3612 records, 2 fields 
const mongoose = require('mongoose');

const planCountySchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    index: true,
    ref: 'Plan'
  },
  countyId: {
    type: Number,
    required: true,
    index: true,
    ref: 'County'
  }
}, {
  timestamps: true,
  collection: 'plancounties'
});

// Compound index for efficient lookups
planCountySchema.index({ planId: 1, countyId: 1 }, { unique: true });

// Static method to transform CSV data
planCountySchema.statics.transformFromCSV = function(csvRow) {
  return {
    planId: csvRow.plan_id,
    countyId: parseInt(csvRow.county_id)
  };
};

// Static method to get all plans available in a county
planCountySchema.statics.getPlansInCounty = async function(countyId) {
  const planCounties = await this.find({ countyId: parseInt(countyId) });
  return planCounties.map(pc => pc.planId);
};

// Static method to get all counties where a plan is available
planCountySchema.statics.getCountiesForPlan = async function(planId) {
  const planCounties = await this.find({ planId: planId });
  return planCounties.map(pc => pc.countyId);
};

// Static method to check if a plan is available in a county
planCountySchema.statics.isPlanAvailableInCounty = async function(planId, countyId) {
  const exists = await this.findOne({ 
    planId: planId, 
    countyId: parseInt(countyId) 
  });
  return !!exists;
};

// Static method to bulk check plan availability
planCountySchema.statics.bulkCheckAvailability = async function(planIds, countyId) {
  const availablePlans = await this.find({ 
    planId: { $in: planIds },
    countyId: parseInt(countyId) 
  });
  
  return availablePlans.map(pc => pc.planId);
};

const PlanCounty = mongoose.model('PlanCounty', planCountySchema);

module.exports = PlanCounty; 