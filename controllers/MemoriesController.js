const Memories = require('../models/MemoriesModel');
const User = require('../models/UserModel');
const ErrorResponse = require('../utils/errorResponse');
const moment = require('moment');
const cron = require('node-cron');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('cloudinary');
const catchAsync = require('../utils/catchAsync');

// @description: USER get all memories
// @route: GET /api/memories
// @access: Private



exports.memories = catchAsync(async (req, res, next) => {
  const memories = await Memories.find({ user: req.user._id }).sort({
    createdAt: -1,
  });

  // Return empty array if no memories found - this is a valid state, not an error
  res.status(200).json({
    success: true,
    memories: memories || [],
    count: memories ? memories.length : 0,
  });
});

// @description: USER Create a memory
// @route: GET /api/create-memory
// @access: Private
exports.createMemory = catchAsync(async (req, res, next) => {
  const { title, memory, dueDate, tag, priority, isComplete } =
    req.body;
  const userId = req.user._id;

  if (!title || !memory)
    return next(new ErrorResponse('Please provide a Title and a Memory', 400));

  // Determine setDueDate based on whether dueDate is provided
  const finalSetDueDate = !!dueDate;

  await Memories.create({
    title,
    memory,
    setDueDate: finalSetDueDate, // Use the determined value
    dueDate,
    tag,
    priority,
    isComplete,
    hasSentSevenDayReminder: false,
    hasSentOneDayReminder: false,
    user: userId,
  });
  res.status(200).json({ success: true });
});

// @description: EDIT and UPDATE a memory
// @route: GET /api/edit-memory/:id
// @access: PRIVATE
exports.editMemory = catchAsync(async (req, res, next) => {
  const memoryToUpdate = await Memories.findOne({ _id: req.params.id, user: req.user._id });

  if (!memoryToUpdate) {
    return next(new ErrorResponse('Memory not found or user not authorized', 404));
  }

  const { title, memory, dueDate, tag, priority, isComplete } = req.body;

  // Determine setDueDate based on whether dueDate is provided in the update
  const finalSetDueDate = !!dueDate;

  const updatedMemory = {
    title,
    memory,
    setDueDate: finalSetDueDate, // Use the determined value
    dueDate,
    tag,
    priority,
    isComplete,
  };

  // The findOne query in the controller already ensures ownership, so we can update by ID.
  await Memories.findByIdAndUpdate(
    req.params.id,
    { $set: updatedMemory },
    {
      new: true,
    },
  );
  res.status(200).json({ success: true });
});

// @description: Delete a memory
// @route: GET /api/delete-memory/:id
// @access: PRIVATE
exports.deleteMemory = catchAsync(async (req, res, next) => {
  const memory = await Memories.findOne({ _id: req.params.id, user: req.user._id });

  if (!memory) {
    return next(new ErrorResponse('Memory not found or user not authorized', 404));
  }

  await memory.deleteOne(); // Replaced deprecated remove()
  res.status(200).json({ success: true });
});

// @description: USER Delete a tag
// @route: DELETE /api/delete-memory-tag/:id
// @access: Private
exports.deleteMemoryTag = catchAsync(async (req, res, next) => {
  const memory = await Memories.findOne({ _id: req.params.id, user: req.user._id });

  if (!memory) {
    return next(new ErrorResponse('Memory not found or user not authorized', 404));
  }
  // Remove object for array
  memory.tag = null;
  await memory.save();
  res.status(200).json({ success: true });
});

// @description: Delete a Memory Image
// @route: DELETE /api/memory-image-delete/:id
// @access: Private
exports.deleteMemoryImage = catchAsync(async (req, res, next) => {
  const memory = await Memories.findOne({ _id: req.params.id, user: req.user._id });

  if (!memory) {
    return next(new ErrorResponse('Memory not found or user not authorized', 404));
  }

  //Delete image from Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  });
  await cloudinary.uploader.destroy(memory.cloudinaryId);

  //Update the memory object
  memory.cloudinaryId = null;
  memory.memoryImage = null;

  await memory.save();
  res.status(200).json({ success: true });
});