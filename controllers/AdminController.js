const User = require('../models/UserModel');
const Memories = require('../models/MemoriesModel');
const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');

// @description: Get all users
// @route: GET /api/admin/users
// @access: Admin and Private
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();

  if (!users)
    return next(new ErrorResponse('Could not fetch users', 500));

  // Fetch all memories separately for now, but ideally this would be a separate endpoint.
  const memories = await Memories.find();

  res.status(200).json({ success: true, users, memories });
});

// @description: Toggle is Admin rights
// @route: PUT /api/admin/user-is-admin/:id
// @access: Admin and Private
exports.adminToggleUserIsAdmin = catchAsync(async (req, res, next) => {
  if (req.user.id === req.params.id) {
    return next(new ErrorResponse('Admins cannot change their own status.', 400));
  }
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorResponse('No user could be found', 400));
  user.isAdmin = req.body.isAdmin;
  await user.save();
  res.status(200).json({ success: true });
});

// @description: Toggle is Suspended
// @route: PUT admin/user-is-suspended/:id
// @access: Admin and Private
exports.adminToggleUserIsSuspended = catchAsync(async (req, res, next) => {
  if (req.user.id === req.params.id) {
    return next(new ErrorResponse('Admins cannot change their own status.', 400));
  }
  const user = await User.findById(req.params.id);

  if (!user) return next(new ErrorResponse('No user could be found', 400));
  user.isSuspended = req.body.isSuspended;
  await user.save();
  res.status(200).json({ success: true });
});

// @description: Delete a user and their memories
// @route: DELETE admin/user-memories-delete/:id
// @access: Admin and Private
exports.adminDeleteAllUserData = catchAsync(async (req, res, next) => {
  if (req.user.id === req.params.id) {
    return next(new ErrorResponse('Admins cannot delete their own account.', 400));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Using the session for atomicity
    await user.deleteOne({ session });
    await Memories.deleteMany({ user: req.params.id }, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, data: 'User and all associated memories have been deleted.' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new ErrorResponse('Data could not be deleted', 500));
  }
});
