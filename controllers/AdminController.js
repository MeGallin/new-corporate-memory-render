import User from '../models/UserModel.js';
import Memories from '../models/MemoriesModel.js';
import mongoose from 'mongoose';
import ErrorResponse from '../utils/errorResponse.js';
import catchAsync from '../utils/catchAsync.js';
import { deleteCloudinaryImage } from '../utils/cloudinaryImages.js';

// @description: Get all users
// @route: GET /api/admin/users
// @access: Admin and Private
export const getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find()
    .select(
      'name email isAdmin isConfirmed isSuspended profileImage ipAddress loginCounter registeredWithGoogle createdAt updatedAt',
    )
    .lean();

  // The current client only needs ownership references to calculate per-user counts.
  // Do not load or return encrypted/decrypted memory content from this endpoint.
  const memories = await Memories.find().select('_id user').lean();

  res.status(200).json({ success: true, users, memories });
});

// @description: Toggle is Admin rights
// @route: PUT /api/admin/user-is-admin/:id
// @access: Admin and Private
export const adminToggleUserIsAdmin = catchAsync(async (req, res, next) => {
  if (req.user.id === req.params.id) {
    return next(
      new ErrorResponse('Admins cannot change their own status.', 400),
    );
  }
  if (typeof req.body.isAdmin !== 'boolean') {
    return next(
      new ErrorResponse('Administrator status must be a boolean.', 400),
    );
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
export const adminToggleUserIsSuspended = catchAsync(async (req, res, next) => {
  if (req.user.id === req.params.id) {
    return next(
      new ErrorResponse('Admins cannot change their own status.', 400),
    );
  }
  if (typeof req.body.isSuspended !== 'boolean') {
    return next(
      new ErrorResponse('Suspended status must be a boolean.', 400),
    );
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
export const adminDeleteAllUserData = catchAsync(async (req, res, next) => {
  if (req.user.id === req.params.id) {
    return next(
      new ErrorResponse('Admins cannot delete their own account.', 400),
    );
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  const memories = await Memories.find({ user: req.params.id }).select(
    'cloudinaryId memoryImage',
  );

  if (user.cloudinaryId) {
    await deleteCloudinaryImage({
      publicId: user.cloudinaryId,
      imageUrl: user.profileImage,
    });
  }

  for (const memory of memories) {
    await deleteCloudinaryImage({
      publicId: memory.cloudinaryId,
      imageUrl: memory.memoryImage,
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await user.deleteOne({ session });
      await Memories.deleteMany({ user: req.params.id }, { session });
    });

    res.status(200).json({
      success: true,
      data: 'User and all associated memories have been deleted.',
    });
  } catch (error) {
    return next(new ErrorResponse('Data could not be deleted', 500));
  } finally {
    await session.endSession();
  }
});
