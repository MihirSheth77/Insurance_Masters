// ICHRA Employee Classes 
const mongoose = require('mongoose');

const ichraClassSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'],
    required: true
  },
  parentClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ICHRAClass',
    default: null,
    index: true
  },
  // Contribution amounts
  employeeContribution: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  dependentContribution: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  // Age-based contributions for sub-classes
  ageBasedContributions: [{
    minAge: {
      type: Number,
      required: true,
      min: 0
    },
    maxAge: {
      type: Number,
      required: true,
      max: 120
    },
    employeeContribution: {
      type: Number,
      required: true,
      min: 0
    },
    dependentContribution: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  // Class rules and criteria
  criteria: {
    minHoursPerWeek: {
      type: Number,
      min: 0
    },
    minMonthsEmployed: {
      type: Number,
      min: 0
    },
    locations: [{
      type: String
    }],
    departments: [{
      type: String
    }]
  },
  // Track class statistics
  statistics: {
    memberCount: {
      type: Number,
      default: 0
    },
    averageAge: {
      type: Number,
      default: 0
    },
    totalMonthlyContribution: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'ichraclasses'
});

// Compound indexes
ichraClassSchema.index({ groupId: 1, isActive: 1 });
ichraClassSchema.index({ parentClassId: 1, isActive: 1 });

// Virtual for sub-classes
ichraClassSchema.virtual('subClasses', {
  ref: 'ICHRAClass',
  localField: '_id',
  foreignField: 'parentClassId'
});

// Instance method to check if this is a sub-class
ichraClassSchema.methods.isSubClass = function() {
  return !!this.parentClassId;
};

// Instance method to get contribution for a specific age
ichraClassSchema.methods.getContributionForAge = function(age) {
  // If age-based contributions exist, find the matching range
  if (this.ageBasedContributions && this.ageBasedContributions.length > 0) {
    const ageContribution = this.ageBasedContributions.find(
      ac => age >= ac.minAge && age <= ac.maxAge
    );
    
    if (ageContribution) {
      return {
        employee: ageContribution.employeeContribution,
        dependent: ageContribution.dependentContribution
      };
    }
  }
  
  // Otherwise return standard contributions
  return {
    employee: this.employeeContribution,
    dependent: this.dependentContribution
  };
};

// Static method to get all classes for a group
ichraClassSchema.statics.getClassesForGroup = async function(groupId, includeInactive = false) {
  const query = { groupId: groupId };
  if (!includeInactive) {
    query.isActive = true;
  }
  
  return await this.find(query)
    .populate('subClasses')
    .sort({ createdAt: 1 });
};

// Static method to get parent classes only
ichraClassSchema.statics.getParentClasses = async function(groupId) {
  return await this.find({
    groupId: groupId,
    parentClassId: null,
    isActive: true
  }).sort({ name: 1 });
};

// Static method to update member count
ichraClassSchema.statics.updateMemberCount = async function(classId, count) {
  return await this.findByIdAndUpdate(
    classId,
    { 'statistics.memberCount': count },
    { new: true }
  );
};

// Pre-save validation
ichraClassSchema.pre('save', async function(next) {
  // Validate age ranges don't overlap
  if (this.ageBasedContributions && this.ageBasedContributions.length > 1) {
    const sorted = this.ageBasedContributions.sort((a, b) => a.minAge - b.minAge);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].maxAge >= sorted[i + 1].minAge) {
        throw new Error('Age ranges cannot overlap');
      }
    }
  }
  
  next();
});

const ICHRAClass = mongoose.model('ICHRAClass', ichraClassSchema);

module.exports = ICHRAClass; 