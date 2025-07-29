const mongoose = require('mongoose');

const ichraAffordabilityResultSchema = new mongoose.Schema({
  // Reference to the Ideon API calculation ID
  calculationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Reference to our internal group
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  
  // Calculation parameters
  effectiveDate: {
    type: Date,
    required: true
  },
  
  safeHarborType: {
    type: String,
    enum: ['RATE_OF_PAY', 'FPL'],
    default: 'RATE_OF_PAY'
  },
  
  // Overall calculation status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Overall affordability result
  overallAffordability: {
    type: Boolean,
    default: null
  },
  
  // Member-specific results
  memberResults: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },
    
    // Ideon member ID from API
    ideonMemberId: {
      type: String,
      required: true
    },
    
    // Individual affordability calculation
    isAffordable: {
      type: Boolean,
      required: true
    },
    
    // Financial details
    benchmarkPremium: {
      type: Number,
      required: true
    },
    
    minimumContribution: {
      type: Number,
      required: true
    },
    
    maximumEmployeeCost: {
      type: Number,
      required: true
    },
    
    actualContribution: {
      type: Number,
      required: true
    },
    
    affordabilityThreshold: {
      type: Number,
      required: true
    },
    
    complianceStatus: {
      type: String,
      enum: ['compliant', 'non_compliant', 'warning'],
      required: true
    },
    
    // Input data for reference
    householdIncome: {
      type: Number,
      required: true
    },
    
    householdSize: {
      type: Number,
      default: 1
    },
    
    zipCode: {
      type: String,
      required: true
    },
    
    age: {
      type: Number,
      required: true
    }
  }],
  
  // Summary data
  summary: {
    totalMembers: {
      type: Number,
      required: true
    },
    
    affordableMembers: {
      type: Number,
      required: true
    },
    
    nonAffordableMembers: {
      type: Number,
      required: true
    },
    
    averageBenchmarkPremium: {
      type: Number
    },
    
    totalMinimumContribution: {
      type: Number
    },
    
    compliancePercentage: {
      type: Number
    }
  },
  
  // API response metadata
  apiMetadata: {
    calculationUrl: String,
    processingTime: Number,
    apiVersion: String
  },
  
  // Error information if calculation failed
  errorDetails: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
ichraAffordabilityResultSchema.index({ groupId: 1, createdAt: -1 });
ichraAffordabilityResultSchema.index({ calculationId: 1 });
ichraAffordabilityResultSchema.index({ effectiveDate: 1 });
ichraAffordabilityResultSchema.index({ status: 1 });

// Virtual for compliance rate
ichraAffordabilityResultSchema.virtual('complianceRate').get(function() {
  if (!this.summary || this.summary.totalMembers === 0) return 0;
  return (this.summary.affordableMembers / this.summary.totalMembers) * 100;
});

// Static methods
ichraAffordabilityResultSchema.statics.findByGroup = function(groupId) {
  return this.find({ groupId })
    .sort({ createdAt: -1 })
    .populate('groupId', 'groupName')
    .populate('memberResults.memberId', 'firstName lastName');
};

ichraAffordabilityResultSchema.statics.findByCalculationId = function(calculationId) {
  return this.findOne({ calculationId })
    .populate('groupId', 'groupName')
    .populate('memberResults.memberId', 'firstName lastName');
};

ichraAffordabilityResultSchema.statics.getLatestForGroup = function(groupId) {
  console.log('🔍 Model: Searching for groupId:', groupId, 'type:', typeof groupId);
  
  // Ensure groupId is properly converted to ObjectId if it's a string
  const mongoose = require('mongoose');
  const searchId = typeof groupId === 'string' ? new mongoose.Types.ObjectId(groupId) : groupId;
  
  return this.findOne({ groupId: searchId })
    .sort({ createdAt: -1 })
    .populate('groupId', 'groupName')
    .populate('memberResults.memberId', 'firstName lastName');
};

// Instance methods
ichraAffordabilityResultSchema.methods.updateFromIdeonAPI = function(ideonData) {
  this.status = ideonData.status;
  this.overallAffordability = ideonData.overall_affordability;
  
  // Update member results
  if (ideonData.members) {
    this.memberResults = ideonData.members.map(member => ({
      memberId: this.memberResults.find(m => m.ideonMemberId === member.member_id)?.memberId,
      ideonMemberId: member.member_id,
      isAffordable: member.is_affordable,
      benchmarkPremium: member.benchmark_premium,
      minimumContribution: member.minimum_contribution,
      maximumEmployeeCost: member.maximum_employee_cost,
      actualContribution: member.actual_contribution,
      affordabilityThreshold: member.affordability_threshold,
      complianceStatus: member.compliance_status,
      householdIncome: member.household_income,
      householdSize: member.household_size,
      zipCode: member.zip_code,
      age: member.age
    }));
  }
  
  // Update summary
  if (ideonData.summary) {
    this.summary = {
      totalMembers: ideonData.summary.total_members,
      affordableMembers: ideonData.summary.affordable_members,
      nonAffordableMembers: ideonData.summary.non_affordable_members,
      averageBenchmarkPremium: ideonData.summary.average_benchmark_premium,
      totalMinimumContribution: ideonData.summary.total_minimum_contribution,
      compliancePercentage: ideonData.summary.compliance_percentage
    };
  }
  
  return this.save();
};

ichraAffordabilityResultSchema.methods.getMemberResult = function(memberId) {
  return this.memberResults.find(result => 
    result.memberId.toString() === memberId.toString()
  );
};

ichraAffordabilityResultSchema.methods.getNonCompliantMembers = function() {
  return this.memberResults.filter(result => 
    result.complianceStatus === 'non_compliant'
  );
};

ichraAffordabilityResultSchema.methods.getComplianceSummary = function() {
  const total = this.memberResults.length;
  const compliant = this.memberResults.filter(r => r.complianceStatus === 'compliant').length;
  const nonCompliant = this.memberResults.filter(r => r.complianceStatus === 'non_compliant').length;
  const warning = this.memberResults.filter(r => r.complianceStatus === 'warning').length;
  
  return {
    total,
    compliant,
    nonCompliant,
    warning,
    complianceRate: total > 0 ? (compliant / total) * 100 : 0
  };
};

module.exports = mongoose.model('ICHRAAffordabilityResult', ichraAffordabilityResultSchema);