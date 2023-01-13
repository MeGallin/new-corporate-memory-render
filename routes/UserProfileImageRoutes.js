const express = require('express');
const User = require('../models/UserModel');
const ProfileImage = require('../models/UserProfileImageModel');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary');
const { protect } = require('../middleWare/authMiddleWare');

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

// NB!!! This name 'userImage' must match the name attribute in the upload form.
router.post(
  '/user-profile-upload-image',
  protect,
  upload.single('userProfileImage'),
  async (req, res, next) => {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_SECRET,
      });
      const result = await cloudinary.uploader.upload(`${req.file.path}`);

      // Associate profile image with user profile
      const user = await User.findById(req.headers.userid);

      if (!user) {
        res.status(401);
        throw new Error('No USER found');
      } else {
        // Create a new Instance of ProfileImages
        let userProfileImage = new ProfileImage({
          id: req.headers.userid,
          avatar: result.secure_url,
          cloudinaryId: result.public_id,
        });

        // Save the USER
        user.profileImage = result.secure_url;
        user.cloudinaryId = result.public_id;
        await user.save();

        //Save user profile
        await userProfileImage.save();
        res.status(200).json(userProfileImage);
      }
    } catch (error) {
      res.status(401);
      throw new Error(`Image not uploaded. ${error}`);
    }
  },
);

module.exports = router;
