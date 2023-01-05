const express = require('express');
const { protect, admin } = require('../middleWare/authMiddleWare');
const {
  adminGetAllUserData,
  adminToggleUserIsAdmin,
  adminToggleUserIsSuspended,
  adminDeleteAllUserData,
} = require('../controllers/AdminController');
const router = express.Router();

router
  .route('/admin/user-details-memories')
  .get(protect, admin, adminGetAllUserData);
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
