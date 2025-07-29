const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  // Core Fields
  planId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  carrierName: {
    type: String,
    required: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  level: {
    type: String,
    required: true,
    enum: ['expanded_bronze', 'bronze', 'silver', 'gold', 'platinum', 'catastrophic'],
    index: true
  },
  onMarket: {
    type: Boolean,
    required: true,
    default: true
  },
  offMarket: {
    type: Boolean,
    required: true,
    default: false
  },
  serviceAreaId: {
    type: String,
    required: true,
    index: true
  },
  planType: {
    type: String,
    required: true,
    trim: true
  },
  hiossuerIdcId: {
    type: String,
    required: true,
    index: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  expirationDate: {
    type: Date,
    required: true
  },

  // Deductibles Object
  deductibles: {
    individualMedical: {
      type: String,
      default: null
    },
    familyMedical: {
      type: String,
      default: null
    },
    individualDrug: {
      type: String,
      default: null
    },
    familyDrug: {
      type: String,
      default: null
    },
    embeddedDeductible: {
      type: String,
      default: null
    }
  },

  // Max Out of Pocket Object
  maxOutOfPocket: {
    individualMedical: {
      type: String,
      default: null
    },
    familyMedical: {
      type: String,
      default: null
    },
    individualDrug: {
      type: String,
      default: null
    },
    familyDrug: {
      type: String,
      default: null
    }
  },

  // Copays Object
  copays: {
    primaryCarePhysician: {
      type: String,
      default: null
    },
    specialist: {
      type: String,
      default: null
    },
    emergencyRoom: {
      type: String,
      default: null
    },
    urgentCare: {
      type: String,
      default: null
    },
    inpatientFacility: {
      type: String,
      default: null
    },
    outpatientFacility: {
      type: String,
      default: null
    }
  },

  // Prescription Drugs Object
  prescriptionDrugs: {
    genericDrugs: {
      type: String,
      default: null
    },
    preferredBrandDrugs: {
      type: String,
      default: null
    },
    nonPreferredBrandDrugs: {
      type: String,
      default: null
    },
    specialtyDrugs: {
      type: String,
      default: null
    },
    nonpreferredGenericDrugShare: {
      type: String,
      default: null
    },
    mailOrderRx: {
      type: String,
      default: null
    }
  },

  // Features Object
  features: {
    hsaEligible: {
      type: Boolean,
      default: false
    },
    age29Rider: {
      type: Boolean,
      default: false
    },
    dpRider: {
      type: Boolean,
      default: false
    },
    fpRider: {
      type: Boolean,
      default: false
    },
    adultDental: {
      type: Boolean,
      default: false
    },
    childDental: {
      type: Boolean,
      default: false
    },
    childEyewear: {
      type: String,
      default: null
    },
    childEyeExam: {
      type: String,
      default: null
    },
    outOfNetworkCoverage: {
      type: Boolean,
      default: false
    },
    gated: {
      type: Boolean,
      default: false
    },
    infertilityTreatmentRider: {
      type: Boolean,
      default: false
    },
    abortionRider: {
      type: Boolean,
      default: false
    },
    telemedicine: {
      type: String,
      default: null
    },
    activelyMarketed: {
      type: Boolean,
      default: true
    },
    standardizedPlan: {
      type: Boolean,
      default: false
    }
  },

  // URLs Object
  urls: {
    benefitsSummary: {
      type: String,
      default: null
    },
    buyLink: {
      type: String,
      default: null
    },
    drugFormulary: {
      type: String,
      default: null
    },
    logo: {
      type: String,
      default: null
    },
    summaryOfBenefits: {
      type: String,
      default: null
    },
    networkProviderDirectory: {
      type: String,
      default: null
    }
  },

  // Additional Services Object (34+ fields)
  additionalServices: {
    ambulance: { type: String, default: null },
    durableMedicalEquipment: { type: String, default: null },
    diagnosticTest: { type: String, default: null },
    habilitationServices: { type: String, default: null },
    homeHealthCare: { type: String, default: null },
    hospiceService: { type: String, default: null },
    imaging: { type: String, default: null },
    inpatientBirth: { type: String, default: null },
    inpatientMentalHealth: { type: String, default: null },
    inpatientPhysician: { type: String, default: null },
    inpatientSubstance: { type: String, default: null },
    outpatientMentalHealth: { type: String, default: null },
    outpatientPhysician: { type: String, default: null },
    outpatientSubstance: { type: String, default: null },
    prenatalPostnatalCare: { type: String, default: null },
    preventativeCare: { type: String, default: null },
    rehabilitationServices: { type: String, default: null },
    skilledNursing: { type: String, default: null },
    chiropracticServices: { type: String, default: null },
    imagingCenter: { type: String, default: null },
    imagingPhysician: { type: String, default: null },
    labTest: { type: String, default: null },
    outpatientAmbulatoryCareCenter: { type: String, default: null },
    prenatalCare: { type: String, default: null },
    postnatalCare: { type: String, default: null },
    skilledNursingFacility365: { type: String, default: null },
    inpatientBirthPhysician: { type: String, default: null }
  },

  // Metadata
  actuarialValue: {
    type: Number,
    min: 0,
    max: 100
  },
  coinsurance: {
    type: Number,
    min: 0,
    max: 100
  },
  planMarket: {
    type: String,
    enum: ['individual_market', 'both_markets', 'small_group_market'],
    default: 'individual_market'
  },
  customerServicePhoneNumber: {
    type: String,
    default: null
  },
  networkSize: {
    type: String,
    default: null
  },
  networkName: {
    type: String,
    default: null
  },
  planCoinsurance: {
    type: String,
    default: null
  },

  // Quality Ratings
  qualityRatings: {
    overall: { type: Number, min: 1, max: 5 },
    medicalCare: { type: Number, min: 1, max: 5 },
    memberExperience: { type: Number, min: 1, max: 5 },
    planAdministration: { type: Number, min: 1, max: 5 }
  },

  // System fields
  source: {
    type: String,
    default: 'carrier'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'plans'
});

// Business Rules Validation
planSchema.pre('save', function(next) {
  // onMarket and offMarket cannot both be false
  if (!this.onMarket && !this.offMarket) {
    return next(new Error('Plan must be either on-market or off-market'));
  }
  next();
});

// Indexes
planSchema.index({ planId: 1 }, { unique: true });
planSchema.index({ serviceAreaId: 1 });
planSchema.index({ level: 1 });
planSchema.index({ carrierName: 1 });
planSchema.index({ onMarket: 1, offMarket: 1 });
planSchema.index({ hiossuerIdcId: 1 });
planSchema.index({ effectiveDate: 1, expirationDate: 1 });
planSchema.index({ 
  carrierName: 'text', 
  displayName: 'text', 
  name: 'text' 
});

// Instance methods
planSchema.methods.toJSON = function() {
  const plan = this.toObject();
  return plan;
};

planSchema.methods.isActive = function() {
  const now = new Date();
  return this.effectiveDate <= now && this.expirationDate >= now;
};

// Static methods
planSchema.statics.findByServiceArea = function(serviceAreaId) {
  return this.find({ serviceAreaId, onMarket: true }).sort({ level: 1, carrierName: 1 });
};

planSchema.statics.findByLevel = function(level) {
  return this.find({ level, onMarket: true }).sort({ carrierName: 1 });
};

planSchema.statics.searchPlans = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm },
    onMarket: true
  }).sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Plan', planSchema); 