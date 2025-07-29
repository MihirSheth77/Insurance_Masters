const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  quoteNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'completed', 'expired'],
    default: 'pending'
  },
  plans: [{
    planId: String,
    planName: String,
    carrier: String,
    metalLevel: String,
    monthlyPremium: Number,
    deductible: Number,
    maxOutOfPocket: Number,
    coinsurance: Number,
    primaryCareVisit: String,
    specialistVisit: String,
    genericDrugs: String,
    preferredDrugs: String,
    emergencyRoom: String,
    urgentCare: String,
    labTests: String,
    xraysImaging: String,
    preventiveCare: String,
    memberCount: Number,
    totalMonthlyCost: Number
  }],
  summary: {
    totalMembers: Number,
    totalEmployerCost: Number,
    averageEmployeeCost: Number,
    estimatedSavings: Number,
    lowestCostPlan: {
      planId: String,
      planName: String,
      monthlyCost: Number
    },
    highestValuePlan: {
      planId: String,
      planName: String,
      monthlyCost: Number,
      qualityScore: Number
    }
  },
  filters: {
    metalLevels: [String],
    carriers: [String],
    maxPremium: Number,
    maxDeductible: Number,
    maxOutOfPocket: Number
  },
  ichraContributions: [{
    classId: mongoose.Schema.Types.ObjectId,
    className: String,
    monthlyContribution: Number,
    memberCount: Number
  }],
  metadata: {
    generatedBy: String,
    generatedAt: Date,
    expiresAt: Date,
    source: {
      type: String,
      enum: ['manual', 'api', 'import'],
      default: 'manual'
    }
  }
}, {
  timestamps: true
});

// Generate quote number before saving
quoteSchema.pre('save', async function(next) {
  if (!this.quoteNumber && this.isNew) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.quoteNumber = `Q-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Index for efficient queries
quoteSchema.index({ groupId: 1, createdAt: -1 });
quoteSchema.index({ quoteNumber: 1 });
quoteSchema.index({ status: 1 });

const Quote = mongoose.model('Quote', quoteSchema);

module.exports = Quote;