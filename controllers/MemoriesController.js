const Memories = require('../models/MemoriesModel');
const User = require('../models/UserModel');
const MemoryImage = require('../models/MemoryImageModel');
const ErrorResponse = require('../utils/errorResponse');
const moment = require('moment');
const cron = require('node-cron');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('cloudinary');
const catchAsync = require('../utils/catchAsync');

// @description: USER get all memories
// @route: GET /api/memories
// @access: Private

const SEVEN_DAYS_IN_SECONDS = 604800;

exports.memories = catchAsync(async (req, res, next) => {
  const memories = await Memories.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  const user = await User.findById(req.user._id);

  if (!memories || memories.length === 0) {
    return next(new ErrorResponse('No memories could be found!', 400));
  }

  memories.forEach((memory) => {
    console.log('DDD', memory.title);
    // Calculate the difference in seconds between now and the memory's due date.
    const diffInSeconds = moment().diff(moment(memory.dueDate), 'seconds');

    // Check if the memory is due within the next 7 days, has a due date set, is not complete,
    // and if the reminder has not already been sent.
    if (
      diffInSeconds > -SEVEN_DAYS_IN_SECONDS &&
      memory.setDueDate &&
      !memory.isComplete &&
      !memory.hasSentSevenDayReminder
    ) {
      console.log('GGGG', memory.title);
      // Schedule the email reminder job.
      cron.schedule('30 * * * *', async () => {
        try {
          const text = `
            <h1>Hi ${user.name}</h1>
            <p>You have a memory due within the next seven (7) days.</p>
            <h3>The title is: <span style="color: orange;">${memory.title}</span></h3>
            <p>The task is due on ${memory.dueDate}</p>
            <p>Please log into <a href="https://yourcorporatememory.com" id="link">YOUR ACCOUNT</a> to see the reminder</p>
            <p>Thank you</p>
            <h3>Your Corporate Memory Management</h3>
          `;

          await sendEmail({
            from: process.env.MAILER_FROM,
            to: user.email,
            subject: 'Your Corporate Memory Automatic Reminder',
            html: text,
          });

          await Memories.findByIdAndUpdate(
            memory._id,
            { hasSentSevenDayReminder: true },
            { new: true },
          );
        } catch (error) {
          console.error(
            `Error sending reminder for memory ${memory._id}:`,
            error,
          );
        }
      });
    }
  });

  res.status(200).json({ success: true, memories });
});

// @description: USER Create a memory
// @route: GET /api/create-memory
// @access: Private
exports.createMemory = catchAsync(async (req, res, next) => {
  const { title, memory, setDueDate, dueDate, tag, priority, isComplete } =
    req.body;
  const userId = req.user._id;

  if (!title || !memory)
    return next(new ErrorResponse('Please provide a Title and a Memory', 400));
  await Memories.create({
    title,
    memory,
    setDueDate,
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
  const foundMemory = await Memories.findById(req.params.id);
  if (!foundMemory)
    return next(new ErrorResponse('No memory could be found', 400));

  const updatedMemory = {
    title: req.body.title,
    memory: req.body.memory,
    setDueDate: req.body.setDueDate,
    dueDate: req.body.dueDate,
    tag: req.body.tag,
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
});

// @description: Delete a memory
// @route: GET /api/delete-memory/:id
// @access: PRIVATE
exports.deleteMemory = catchAsync(async (req, res, next) => {
  const memory = await Memories.findById(req.params.id);
  if (!memory) return next(new ErrorResponse('No Memory found!', 401));
  await memory.remove();
  res.status(200).json({ success: true });
});

// @description: USER Delete a tag
// @route: DELETE /api/delete-memory-tag/:id
// @access: Private
exports.deleteMemoryTag = catchAsync(async (req, res, next) => {
  const memory = await Memories.findById(req.params.id);

  if (!memory) return next(new ErrorResponse('No Memory found!', 401));
  // Remove object for array
  memory.tag = null;
  await memory.save();
  res.status(200).json({ success: true });
});

// @description: Delete a Memory Image
// @route: DELETE /api/memory-image-delete/:id
// @access: Private
exports.deleteMemoryImage = catchAsync(async (req, res, next) => {
  const memory = await Memories.findById(req.params.id);

  if (!memory) return next(new ErrorResponse('No Memory found!', 401));
  // Associate it with memory image
  const image = await MemoryImage.findOne({
    cloudinaryId: memory.cloudinaryId,
  });
  await image.remove();

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
