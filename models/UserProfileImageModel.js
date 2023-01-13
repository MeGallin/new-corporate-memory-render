const mongoose = require('mongoose');

const userProfileImageSchema = mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
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

const ProfileImage = mongoose.model('ProfileImage', userProfileImageSchema);

module.exports = ProfileImage;
