import express from 'express';
import {
  register,
  login,
  updateUserDetails,
  forgotPassword,
  resetPassword,
  getUserDetails,
  googleLogin,
  deleteUserProfileImage,
} from '../controllers/UserController.js';
import { protect } from '../middleWare/authMiddleWare.js';
const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/google-login').post(googleLogin);

// Consolidated user details routes
router
  .route('/user-details')
  .get(protect, getUserDetails)
  .put(protect, updateUserDetails); // Route updated from /user/:id

// Consolidated user profile image routes
router
  .route('/user-profile-image')
  .delete(protect, deleteUserProfileImage); // Route updated from /user-profile-image-delete/:id

router.route('/forgot-password').post(forgotPassword);
router.route('/resetpassword/:token').put(resetPassword);

export default router;
