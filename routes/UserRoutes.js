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
import {
  accountActionRateLimiter,
  loginRateLimiter,
} from '../middleWare/rateLimitMiddleWare.js';
const router = express.Router();

router.route('/register').post(accountActionRateLimiter, register);
router.route('/login').post(loginRateLimiter, login);
router.route('/google-login').post(loginRateLimiter, googleLogin);

// Consolidated user details routes
router
  .route('/user-details')
  .get(protect, getUserDetails)
  .put(protect, updateUserDetails); // Route updated from /user/:id

// Consolidated user profile image routes
router.route('/user-profile-image').delete(protect, deleteUserProfileImage); // Route updated from /user-profile-image-delete/:id

router.route('/forgot-password').post(accountActionRateLimiter, forgotPassword);
router
  .route('/resetpassword/:token')
  .put(accountActionRateLimiter, resetPassword);

export default router;
