import mongoose from 'mongoose';

const PageHitsSchema = mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: [true, 'IP address is required'],
      unique: true,
    },
  },
  {
    timestamps: true,
    versionKey: false, // You dont need this. It's a Mongoose option to stop the __v field from appearing
  },
);

const PageHits = mongoose.model('PageHits', PageHitsSchema);

export default PageHits;
