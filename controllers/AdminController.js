const User = require('../models/UserModel');
const Memories = require('../models/MemoriesModel');
const ErrorResponse = require('../utils/errorResponse');

// @description: Get All the Users and Memories
// @route: GET /api/admin/user-details-memories
// @access: Admin and Private
exports.adminGetAllUserData = async (req, res, next) => {
  const users = await User.find();
  const memories = await Memories.find();
  try {
    if (!users && !memories)
      return next(new ErrorResponse('Nothing could be found', 500));
    res.status(200).json({ success: true, users, memories });
  } catch (error) {
    next(error);
  }
};

// @description: Toggle is Admin rights
// @route: PUT /api/admin/user-is-admin/:id
// @access: Admin and Private
exports.adminToggleUserIsAdmin = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  try {
    if (!user) return next(new ErrorResponse('No user could be found', 400));
    user.isAdmin = req.body.isAdmin;
    await user.save();
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @description: Toggle is Suspended
// @route: PUT admin/user-is-suspended/:id
// @access: Admin and Private
exports.adminToggleUserIsSuspended = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  try {
    if (!user) return next(new ErrorResponse('No user could be found', 400));
    user.isSuspended = req.body.isSuspended;
    await user.save();
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @description: Delete a user and their memories
// @route: DELETE admin/user-memories-delete/:id
// @access: Admin and Private
exports.adminDeleteAllUserData = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  const memories = await Memories.find({ user: req.params.id });
  try {
    if (user === null && memories.length === 0)
      return next(new ErrorResponse('Nothing could be found', 500));
    // Associate users with their memories
    await user.remove({});
    await Memories.deleteMany({
      user: { $in: req.params.id },
    });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
