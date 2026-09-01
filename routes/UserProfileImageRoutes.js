import express from 'express';
import User from '../models/UserModel.js';
import { v2 as cloudinary } from 'cloudinary';
import { protect } from '../middleWare/authMiddleWare.js';
import {
  imageUpload,
  removeTemporaryUpload,
} from '../utils/imageUpload.js';

const router = express.Router();

// NB!!! This name 'userImage' must match the name attribute in the upload form.
router.post(
  '/user-profile-upload-image',
  protect,
  imageUpload.single('userProfileImage'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please select an image' });
      }

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ error: 'No USER found' });
      }

      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET,
      });
      const result = await cloudinary.uploader.upload(`${req.file.path}`);

      user.profileImage = result.secure_url;
      user.cloudinaryId = result.public_id;
      await user.save();

      return res.status(200).json({
        profileImage: user.profileImage,
        cloudinaryId: user.cloudinaryId,
      });
    } catch (error) {
      return next(error);
    } finally {
      await removeTemporaryUpload(req.file);
    }
  },
);

export default router;
