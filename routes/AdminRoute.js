const express = require('express');
const { protect, admin } = require('../middleWare/authMiddleWare');
const {
  getAllUsers, // Renamed from adminGetAllUserData
  adminToggleUserIsAdmin,
  adminToggleUserIsSuspended,
  adminDeleteAllUserData,
} = require('../controllers/AdminController');
const router = express.Router();

router.route('/admin/users').get(protect, admin, getAllUsers); // Route updated
router
  .route('/admin/user-is-admin/:id')
  .put(protect, admin, adminToggleUserIsAdmin);
router
  .route('/admin/user-is-suspended/:id')
  .put(protect, admin, adminToggleUserIsSuspended);
router
  .route('/admin/user-memories-delete/:id')
  .delete(protect, admin, adminDeleteAllUserData);

module.exports = router;
