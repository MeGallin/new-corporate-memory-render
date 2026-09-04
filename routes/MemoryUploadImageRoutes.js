import express from 'express';
import Memories from '../models/MemoriesModel.js';
import { protect } from '../middleWare/authMiddleWare.js';
import { isResourceOwner } from '../utils/authSecurity.js';
import {
  imageUpload,
  removeTemporaryUpload,
} from '../utils/imageUpload.js';
import {
  replaceCloudinaryImage,
} from '../utils/cloudinaryImages.js';

const router = express.Router();

// NB!!! This name 'memoryImage' must match the name attribute in the upload form.
router.post(
  '/memory-upload-image',
  protect,
  imageUpload.single('memoryImage'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please select an image' });
      }

      const memory = await Memories.findById(req.headers.memoryid);

      if (!memory) {
        return res.status(404).json({ error: 'No MEMORY found' });
      }

      if (!isResourceOwner(memory.user, req.user._id)) {
        return res.status(403).json({ error: 'You cannot update this memory' });
      }

      const { cleanupWarning } = await replaceCloudinaryImage({
        document: memory,
        filePath: req.file.path,
        imageUrlField: 'memoryImage',
      });

      return res.status(200).json({
        memoryImage: memory.memoryImage,
        cloudinaryId: memory.cloudinaryId,
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
