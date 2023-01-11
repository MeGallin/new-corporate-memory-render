const express = require('express');
const router = express.Router();
const {
  register,
  login,
  userUpdateAdminDetails,
  forgotPassword,
  resetPassword,
  getUserDetails,
  googleLogin,
} = require('../controllers/UserController');
const { protect } = require('../middleWare/authMiddleWare');

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/google-login').post(googleLogin);
router.route('/user-details').get(protect, getUserDetails);
router.route('/user/:id').put(protect, userUpdateAdminDetails);
router.route('/forgot-password').post(forgotPassword);
router.route('/resetpassword/:token').put(resetPassword);

module.exports = router;
