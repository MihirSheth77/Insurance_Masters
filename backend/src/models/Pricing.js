// 929 records, 145 fields 
const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    index: true,
    ref: 'Plan'
  },
  ratingAreaId: {
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
  // Store age-based pricing as a Map with age as key and {regular, tobacco} as value
  ageBasedPricing: {
    type: Map,
    of: {
      regular: {
        type: Number,
        required: true
      },
      tobacco: {
        type: Number,
        required: true
        // Validation is done during import - tobacco prices can equal regular prices for ages 0-20
      }
    },
    required: true
  },
  // Family structure pricing
  familyStructurePricing: {
    childOnly: {
      type: Number
    },
    family: {
      type: Number
    },
    fixedPrice: {
      type: Number
    },
    single: {
      type: Number
    },
    singleAndChildren: {
      type: Number
    },
    singleAndSpouse: {
      type: Number
    },
    singleTobacco: {
      type: Number
    }
  },
  source: {
    type: String,
    default: 'cms'
  },
  updatedAt: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'pricings'
});

// Compound index for efficient plan + rating area lookups
pricingSchema.index({ planId: 1, ratingAreaId: 1, effectiveDate: -1 });

// Static method to transform CSV data to schema format
pricingSchema.statics.transformFromCSV = function(csvRow) {
  const ageBasedPricing = new Map();
  
  // Transform age columns (age_0 through age_65)
  for (let age = 0; age <= 65; age++) {
    const regularPrice = parseFloat(csvRow[`age_${age}`]) || 0;
    const tobaccoPrice = parseFloat(csvRow[`age_${age}_tobacco`]) || 0;
    
    // Validate tobacco price is >= regular price
    if (tobaccoPrice < regularPrice && tobaccoPrice > 0) {
      console.warn(`Warning: Tobacco price (${tobaccoPrice}) is less than regular price (${regularPrice}) for age ${age} in plan ${csvRow.plan_id}`);
    }
    
    ageBasedPricing.set(age.toString(), {
      regular: regularPrice,
      tobacco: tobaccoPrice
    });
  }
  
  return {
    planId: csvRow.plan_id,
    ratingAreaId: csvRow.rating_area_id,
    effectiveDate: new Date(csvRow.effective_date),
    expirationDate: new Date(csvRow.expiration_date),
    ageBasedPricing: ageBasedPricing,
    familyStructurePricing: {
      childOnly: parseFloat(csvRow.child_only) || null,
      family: parseFloat(csvRow.family) || null,
      fixedPrice: parseFloat(csvRow.fixed_price) || null,
      single: parseFloat(csvRow.single) || null,
      singleAndChildren: parseFloat(csvRow.single_and_children) || null,
      singleAndSpouse: parseFloat(csvRow.single_and_spouse) || null,
      singleTobacco: parseFloat(csvRow.single_tobacco) || null
    },
    source: csvRow.source || 'cms',
    updatedAt: csvRow.updated_at ? new Date(csvRow.updated_at) : new Date()
  };
};

// Instance method to get pricing for a specific age
pricingSchema.methods.getPriceForAge = function(age, usesTobacco = false) {
  const ageStr = age.toString();
  const agePricing = this.ageBasedPricing.get(ageStr);
  
  if (!agePricing) {
    // If age > 65, use age 65 pricing
    if (age > 65) {
      const age65Pricing = this.ageBasedPricing.get('65');
      return usesTobacco ? age65Pricing.tobacco : age65Pricing.regular;
    }
    return null;
  }
  
  return usesTobacco ? agePricing.tobacco : agePricing.regular;
};

// Instance method to calculate family pricing
pricingSchema.methods.calculateFamilyPrice = function(familyStructure, ages = [], tobaccoUsers = []) {
  // If fixed price exists, use it
  if (this.familyStructurePricing.fixedPrice) {
    return this.familyStructurePricing.fixedPrice;
  }
  
  // Otherwise calculate based on ages
  let totalPrice = 0;
  ages.forEach((age, index) => {
    const usesTobacco = tobaccoUsers[index] || false;
    const price = this.getPriceForAge(age, usesTobacco);
    if (price) {
      totalPrice += price;
    }
  });
  
  return totalPrice;
};

const Pricing = mongoose.model('Pricing', pricingSchema);

module.exports = Pricing; 