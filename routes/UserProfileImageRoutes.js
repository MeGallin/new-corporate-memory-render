import express from 'express';
import User from '../models/UserModel.js';
import { protect } from '../middleWare/authMiddleWare.js';
import {
  imageUpload,
  removeTemporaryUpload,
} from '../utils/imageUpload.js';
import {
  replaceCloudinaryImage,
} from '../utils/cloudinaryImages.js';

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

      const { cleanupWarning } = await replaceCloudinaryImage({
        document: user,
        filePath: req.file.path,
        imageUrlField: 'profileImage',
      });

      return res.status(200).json({
        profileImage: user.profileImage,
        cloudinaryId: user.cloudinaryId,
        cleanupWarning,
      });
    } catch (error) {
      return next(error);
    } finally {
      await removeTemporaryUpload(req.file);
    }
  },
);

export default router;
