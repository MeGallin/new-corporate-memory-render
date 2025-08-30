import express from 'express';
import Memories from '../models/MemoriesModel.js';
import multer from 'multer';
import path from 'path';
import cloudinary from 'cloudinary';

const router = express.Router();

const storage = multer.diskStorage({
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`,
    );
  },
});

function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images only!');
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// NB!!! This name 'memoryImage' must match the name attribute in the upload form.
router.post(
  '/memory-upload-image',
  upload.single('memoryImage'),
  async (req, res, next) => {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET,
      });
      const result = await cloudinary.uploader.upload(`${req.file.path}`);

      // Associate profile image with user profile
      const memory = await Memories.findById(req.headers.memoryid);

      if (!memory) {
        res.status(404);
        throw new Error('No MEMORY found');
      } else {
        // Save the memory
        memory.memoryImage = result.secure_url;
        memory.cloudinaryId = result.public_id;
        await memory.save();

        res.status(200).json({
          memoryImage: memory.memoryImage,
          cloudinaryId: memory.cloudinaryId,
        });
      }
    } catch (error) {
      next(error);
    }
  },
);

export default router;
