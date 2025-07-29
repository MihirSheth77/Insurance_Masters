// Group members 
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  ideonMemberId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ICHRAClass',
    required: true,
    index: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 120
    },
    zipCode: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          // Validate 5-digit US ZIP codes
          const zipNum = parseInt(v);
          return zipNum >= 10000 && zipNum <= 99999;
        },
        message: 'ZIP code must be a valid 5-digit ZIP code'
      }
    },
    tobacco: {
      type: Boolean,
      default: false
    },
    householdIncome: {
      type: Number,
      required: true,
      min: 0,
      max: 999999
    },
    familySize: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
      default: 1
    }
  },
  // CRITICAL: Previous contributions for comparison
  previousContributions: {
    employerContribution: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    memberContribution: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    planName: {
      type: String,
      required: true
    },
    planType: {
      type: String,
      enum: ['HMO', 'PPO', 'EPO', 'POS', 'HDHP', 'Other'],
      default: 'Other'
    },
    metalLevel: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Catastrophic', 'Other'],
      default: 'Other'
    },
    carrier: {
      type: String
    }
  },
  // Dependents array
  dependents: [{
    ideonDependentId: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      enum: ['spouse', 'child', 'domestic_partner', 'other'],
      required: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 120
    },
    tobacco: {
      type: Boolean,
      default: false
    }
  }],
  // Member status
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated'],
    default: 'active',
    index: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  terminationDate: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'members'
});

// Compound indexes
memberSchema.index({ groupId: 1, status: 1 });
memberSchema.index({ classId: 1, status: 1 });
memberSchema.index({ 'personalInfo.zipCode': 1 });

// Virtual for full name
memberSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for total family size
memberSchema.virtual('familySize').get(function() {
  return 1 + (this.dependents ? this.dependents.length : 0);
});

// Instance method to calculate age from DOB
memberSchema.methods.calculateAge = function() {
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Instance method to get all family ages
memberSchema.methods.getFamilyAges = function() {
  const ages = [this.personalInfo.age];
  
  if (this.dependents && this.dependents.length > 0) {
    this.dependents.forEach(dep => {
      ages.push(dep.age);
    });
  }
  
  return ages;
};

// Instance method to get tobacco users
memberSchema.methods.getTobaccoUsers = function() {
  const tobaccoUsers = [this.personalInfo.tobacco];
  
  if (this.dependents && this.dependents.length > 0) {
    this.dependents.forEach(dep => {
      tobaccoUsers.push(dep.tobacco || false);
    });
  }
  
  return tobaccoUsers;
};

// Instance method to calculate previous total cost
memberSchema.methods.getPreviousTotalCost = function() {
  return this.previousContributions.employerContribution + 
         this.previousContributions.memberContribution;
};

// Static method to get members by group
memberSchema.statics.getMembersByGroup = async function(groupId, includeInactive = false) {
  const query = { groupId: groupId };
  if (!includeInactive) {
    query.status = 'active';
  }
  
  return await this.find(query)
    .populate('classId')
    .sort({ 'personalInfo.lastName': 1, 'personalInfo.firstName': 1 });
};

// Static method to get members by class
memberSchema.statics.getMembersByClass = async function(classId) {
  return await this.find({ 
    classId: classId,
    status: 'active'
  }).sort({ 'personalInfo.lastName': 1, 'personalInfo.firstName': 1 });
};

// Static method to find by Ideon ID
memberSchema.statics.findByIdeonId = async function(ideonMemberId) {
  return await this.findOne({ ideonMemberId: ideonMemberId });
};

// Static method to get member count by ZIP code
memberSchema.statics.getCountByZipCode = async function(groupId, zipCode) {
  return await this.countDocuments({
    groupId: groupId,
    'personalInfo.zipCode': zipCode,
    status: 'active'
  });
};

// Pre-save middleware to update age
memberSchema.pre('save', function(next) {
  // Update member age
  this.personalInfo.age = this.calculateAge();
  
  // Update dependent ages
  if (this.dependents && this.dependents.length > 0) {
    this.dependents.forEach(dep => {
      const today = new Date();
      const birthDate = new Date(dep.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      dep.age = age;
    });
  }
  
  next();
});

const Member = mongoose.model('Member', memberSchema);

module.exports = Member; 