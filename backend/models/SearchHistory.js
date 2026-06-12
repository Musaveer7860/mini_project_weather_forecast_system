const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
    trim: true,
  },
  temp: {
    type: Number,
    required: true,
  },
  condition: {
    type: String,
    required: true,
  },
  humidity: {
    type: Number,
  },
  windSpeed: {
    type: Number,
  },
  icon: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);
