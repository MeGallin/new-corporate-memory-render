const mongoose = require('mongoose');

const PageHitsSchema = mongoose.Schema(
  {
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const PageHits = mongoose.model('PageHits', PageHitsSchema);

module.exports = PageHits;
