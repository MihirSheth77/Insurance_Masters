// 7 records, 2 fields 
const mongoose = require('mongoose');

const ratingAreaSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  stateId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'ratingareas'
});

// Static method to transform CSV data
ratingAreaSchema.statics.transformFromCSV = function(csvRow) {
  return {
    id: csvRow.id,
    stateId: csvRow.state_id
  };
};

// Static method to get all rating areas for a state
ratingAreaSchema.statics.getByState = async function(stateId) {
  return await this.find({ stateId: stateId });
};

// Static method to validate rating area exists
ratingAreaSchema.statics.exists = async function(ratingAreaId) {
  const area = await this.findOne({ id: ratingAreaId });
  return !!area;
};

const RatingArea = mongoose.model('RatingArea', ratingAreaSchema);

module.exports = RatingArea; 