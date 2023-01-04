const mongoose = require('mongoose');

const memoryImageSchema = mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Memories',
    },
    title: {
      type: String,
    },
    avatar: {
      type: String,
    },
    cloudinaryId: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const MemoryImage = mongoose.model('MemoryImage', memoryImageSchema);

module.exports = MemoryImage;
