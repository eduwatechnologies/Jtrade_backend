const mongoose = require('mongoose');

const strategySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure strategy names are unique per user
strategySchema.index({ user: 1, name: 1 }, { unique: true });

const Strategy = mongoose.model('Strategy', strategySchema);

module.exports = Strategy;
