const Memories = require('../models/MemoriesModel');
const ErrorResponse = require('../utils/errorResponse');

const moment = require('moment');

// @description: USER get all memories
// @route: GET /api/memories
// @access: Private
exports.memories = async (req, res, next) => {
  const memories = await Memories.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  // Add cron for sending email reminders
  res.status(200).json(memories);
};

// @description: USER Create a memory
// @route: GET /api/create-memory
// @access: Private
exports.createMemory = async (req, res, next) => {
  const { title, memory, setDueDate, dueDate, tags, priority, isComplete } =
    req.body;
  const userId = req.user._id;

  if (!title || !memory)
    return next(new ErrorResponse('Please provide a Title and a Memory', 400));

  try {
    const tag = [
      {
        tagName: tags,
      },
    ];

    await Memories.create({
      title,
      memory,
      setDueDate,
      dueDate,
      tags,
      priority,
      isComplete,
      hasSentSevenDayReminder: false,
      hasSentOneDayReminder: false,
      user: userId,
      tags: tag,
    });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @description: EDIT and UPDATE a memory
// @route: GET /api/edit-memory/:id
// @access: PRIVATE
exports.editMemory = async (req, res, next) => {
  const foundMemory = await Memories.findById(req.params.id);
  if (!foundMemory)
    return next(new ErrorResponse('No memory could be found', 400));
  try {
    const tag = [
      {
        tagName: req.body.tags,
      },
    ];
    const updatedMemory = {
      title: req.body.title,
      memory: req.body.memory,
      setDueDate: req.body.setDueDate,
      dueDate: req.body.dueDate,
      tags: tag,
      priority: req.body.priority,
      isComplete: req.body.isComplete,
    };

    await Memories.findByIdAndUpdate(
      req.params.id,
      { $set: updatedMemory },
      {
        new: true,
      },
    );
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @description: Delete a memory
// @route: GET /api/delete-memory/:id
// @access: PRIVATE
exports.deleteMemory = async (req, res, next) => {
  const memory = await Memories.findById(req.params.id);
  try {
    if (!memory) return next(new ErrorResponse('No Memory found!', 401));
    await memory.remove();
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @description: USER Delete a tag
// @route: DELETE /api/delete-memory-tag/:id
// @access: Private
exports.deleteMemoryTag = async (req, res, next) => {
  const memory = await Memories.findById(req.params.id);
  try {
    if (!memory) return next(new ErrorResponse('No Memory found!', 401));

    // Remove object for array
    memory.tags.shift();
    await memory.save();
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
