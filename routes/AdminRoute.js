import express from 'express';
import { protect, admin } from '../middleWare/authMiddleWare.js';
import {
  getAllUsers,
  adminToggleUserIsAdmin,
  adminToggleUserIsSuspended,
  adminDeleteAllUserData,
} from '../controllers/AdminController.js';

const router = express.Router();

router.route('/admin/users').get(protect, admin, getAllUsers);
router
  .route('/admin/user-is-admin/:id')
  .put(protect, admin, adminToggleUserIsAdmin);
router
  .route('/admin/user-is-suspended/:id')
  .put(protect, admin, adminToggleUserIsSuspended);
router
  .route('/admin/user-memories-delete/:id')
  .delete(protect, admin, adminDeleteAllUserData);

export default router;
