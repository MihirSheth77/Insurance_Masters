// Quote results 
const mongoose = require('mongoose');

const quoteResultSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  filters: {
    carrier: [{
      type: String
    }],
    metalLevel: [{
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Catastrophic']
    }],
    market: {
      type: String,
      enum: ['individual', 'small-group', 'large-group'],
      default: 'individual'
    },
    planType: [{
      type: String,
      enum: ['HMO', 'PPO', 'EPO', 'POS', 'HDHP']
    }],
    maxResults: {
      type: Number,
      default: 10
    }
  },
  employerSummary: {
    oldTotalCost: {
      type: Number,
      required: true,
      min: 0
    },
    newTotalCost: {
      type: Number,
      required: true,
      min: 0
    },
    monthlySavings: {
      type: Number,
      required: true
    },
    annualSavings: {
      type: Number,
      required: true
    },
    savingsPercentage: {
      type: Number
    },
    totalMembers: {
      type: Number,
      required: true
    },
    averageSavingsPerMember: {
      type: Number
    }
  },
  // Store the full comparison summary for comprehensive data
  comparisonSummary: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  memberQuotes: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },
    memberName: {
      type: String,
      required: true
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ICHRAClass'
    },
    className: {
      type: String
    },
    zipCode: {
      type: String,
      required: true
    },
    familySize: {
      type: Number,
      required: true
    },
    previousPlan: {
      planName: String,
      totalCost: Number,
      employerContribution: Number,
      memberContribution: Number
    },
    recommendedPlans: [{
      planId: String,
      planName: String,
      carrier: String,
      metalLevel: String,
      planType: String,
      premium: Number,
      fullPremium: Number,
      subsidizedPremium: Number,
      effectivePremium: Number,
      employerContribution: Number,
      memberContribution: Number,
      ichraContribution: Number,
      memberCost: Number,
      savings: Number,
      monthlySavings: Number,
      annualSavings: Number,
      savingsPercentage: Number,
      isPositiveSavings: Boolean,
      deductible: Number,
      outOfPocketMax: Number,
      hsaEligible: Boolean,
      networkType: String,
      isSubsidized: Boolean,
      marketType: String, // 'on-market' or 'off-market'
      costBreakdown: {
        fullPremium: Number,
        subsidyAmount: Number,
        subsidizedPremium: Number,
        employerContribution: Number,
        memberOutOfPocket: Number
      }
    }],
    selectedPlanId: String,
    memberSavings: Number,
    memberSavingsPercentage: Number,
    // Add missing critical fields
    county: {
      csvId: String,
      name: String,
      ratingAreaId: String
    },
    householdIncome: Number,
    subsidyEligibility: {
      isEligible: Boolean,
      subsidyInfo: mongoose.Schema.Types.Mixed
    },
    planOptions: {
      onMarket: {
        plans: [mongoose.Schema.Types.Mixed],
        totalPlans: Number,
        summary: mongoose.Schema.Types.Mixed
      },
      offMarket: {
        plans: [mongoose.Schema.Types.Mixed],
        totalPlans: Number,
        summary: mongoose.Schema.Types.Mixed
      }
    },
    bestPlan: mongoose.Schema.Types.Mixed,
    memberSummary: {
      ichraContribution: Number,
      bestPlanCost: Number,
      bestPlanSavings: Number,
      subsidyEligible: Boolean,
      planOptionsCount: {
        onMarket: Number,
        offMarket: Number,
        total: Number
      }
    }
  }],
  selectedPlans: [{
    planId: {
      type: String,
      required: true
    },
    planName: String,
    carrier: String,
    metalLevel: String,
    memberCount: Number,
    totalPremium: Number,
    totalEmployerContribution: Number,
    totalMemberContribution: Number,
    averagePremium: Number
  }],
  statistics: {
    averageMemberSavings: Number,
    medianMemberSavings: Number,
    membersWithSavings: Number,
    membersWithIncrease: Number,
    membersNoChange: Number,
    mostPopularCarrier: String,
    mostPopularMetalLevel: String,
    planDistribution: {
      type: Map,
      of: Number
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'expired'],
    default: 'completed',
    index: true
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Quotes expire after 30 days
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      return expiryDate;
    },
    index: true
  },
  metadata: {
    generationTime: Number, // milliseconds
    apiCallsCount: Number,
    errorMessages: [String],
    warnings: [String]
  }
}, {
  timestamps: true,
  collection: 'quoteresults'
});

// Compound indexes
quoteResultSchema.index({ groupId: 1, generatedAt: -1 });
quoteResultSchema.index({ status: 1, expiresAt: 1 });

// Instance method to check if quote is expired
quoteResultSchema.methods.isExpired = function() {
  return this.expiresAt < new Date() || this.status === 'expired';
};

// Instance method to calculate total savings
quoteResultSchema.methods.calculateTotalSavings = function() {
  return {
    monthly: this.employerSummary.monthlySavings,
    annual: this.employerSummary.annualSavings,
    percentage: this.employerSummary.savingsPercentage
  };
};

// Instance method to get member by ID
quoteResultSchema.methods.getMemberQuote = function(memberId) {
  return this.memberQuotes.find(mq => mq.memberId.toString() === memberId.toString());
};

// Static method to get latest quote for a group
quoteResultSchema.statics.getLatestForGroup = async function(groupId) {
  return await this.findOne({
    groupId: groupId,
    status: 'completed'
  }).sort({ generatedAt: -1 });
};

// Static method to get active quotes
quoteResultSchema.statics.getActiveQuotes = async function(groupId) {
  return await this.find({
    groupId: groupId,
    status: 'completed',
    expiresAt: { $gt: new Date() }
  }).sort({ generatedAt: -1 });
};

// Static method to expire old quotes
quoteResultSchema.statics.expireOldQuotes = async function() {
  return await this.updateMany(
    {
      status: 'completed',
      expiresAt: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );
};

// Static method to get quote statistics for a group
quoteResultSchema.statics.getGroupStatistics = async function(groupId) {
  const quotes = await this.find({
    groupId: groupId,
    status: 'completed'
  }).sort({ generatedAt: -1 }).limit(10);
  
  if (quotes.length === 0) return null;
  
  const totalSavings = quotes.reduce((sum, quote) => sum + quote.employerSummary.annualSavings, 0);
  const avgSavings = totalSavings / quotes.length;
  
  return {
    totalQuotes: quotes.length,
    averageAnnualSavings: avgSavings,
    latestQuoteDate: quotes[0].generatedAt,
    savingsTrend: quotes.map(q => ({
      date: q.generatedAt,
      savings: q.employerSummary.annualSavings
    }))
  };
};

// Pre-save middleware to calculate statistics
quoteResultSchema.pre('save', function(next) {
  if (this.memberQuotes && this.memberQuotes.length > 0) {
    // Calculate member statistics
    const savings = this.memberQuotes.map(mq => mq.memberSavings || 0);
    
    this.statistics = {
      averageMemberSavings: savings.reduce((a, b) => a + b, 0) / savings.length,
      medianMemberSavings: savings.sort((a, b) => a - b)[Math.floor(savings.length / 2)],
      membersWithSavings: savings.filter(s => s > 0).length,
      membersWithIncrease: savings.filter(s => s < 0).length,
      membersNoChange: savings.filter(s => s === 0).length
    };
    
    // Calculate employer summary percentages
    if (this.employerSummary.oldTotalCost > 0) {
      this.employerSummary.savingsPercentage = 
        (this.employerSummary.monthlySavings / this.employerSummary.oldTotalCost) * 100;
      
      this.employerSummary.averageSavingsPerMember = 
        this.employerSummary.monthlySavings / this.employerSummary.totalMembers;
    }
  }
  
  next();
});

const QuoteResult = mongoose.model('QuoteResult', quoteResultSchema);

module.exports = QuoteResult; 