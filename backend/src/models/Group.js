// Application groups 
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  ideonGroupId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street1: {
      type: String,
      required: true
    },
    street2: {
      type: String
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 2
    },
    zipCode: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          // 5-digit ZIP codes
          const zipNum = parseInt(v);
          return zipNum >= 10000 && zipNum <= 99999;
        },
        message: 'ZIP code must be a valid 5-digit ZIP code'
      }
    }
  },
  effectiveDate: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  // Track group statistics
  statistics: {
    totalMembers: {
      type: Number,
      default: 0
    },
    totalClasses: {
      type: Number,
      default: 0
    },
    lastQuoteDate: {
      type: Date
    }
  }
}, {
  timestamps: true,
  collection: 'groups'
});

// Indexes for efficient queries
groupSchema.index({ status: 1, effectiveDate: -1 });

// Virtual for county lookup
groupSchema.virtual('county', {
  ref: 'ZipCounty',
  localField: 'address.zipCode',
  foreignField: 'zipCodeId',
  justOne: true
});

// Instance method to check if group is currently active
groupSchema.methods.isCurrentlyActive = function() {
  return this.status === 'active' && this.effectiveDate <= new Date();
};

// Instance method to update member count
groupSchema.methods.updateMemberCount = async function(count) {
  this.statistics.totalMembers = count;
  await this.save();
};

// Static method to get active groups
groupSchema.statics.getActiveGroups = async function() {
  return await this.find({ 
    status: 'active',
    effectiveDate: { $lte: new Date() }
  }).sort({ effectiveDate: -1 });
};

// Static method to find by Ideon ID
groupSchema.statics.findByIdeonId = async function(ideonGroupId) {
  return await this.findOne({ ideonGroupId: ideonGroupId });
};

const Group = mongoose.model('Group', groupSchema);

module.exports = Group; 