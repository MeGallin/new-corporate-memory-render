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
exports.memories = catchAsync(async (req, res, next) => {
  const memories = await Memories.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  const user = await User.findById(req.user._id);

  if (!memories)
    return next(new ErrorResponse('No memories could be found!', 400));

  // Add cron for sending email reminders
  memories.filter((memory) => {
    // NOTES: setTimeout then fire a function
    if (
      moment(new Date()).diff(moment(memory?.dueDate), 'seconds') >
        Number(-604850) &&
      memory?.setDueDate &&
      !memory?.isComplete
    ) {
      // REF https://crontab.guru/
      cron.schedule(`30 * * * *`, async () => {
        const text = `
          <h1>Hi ${user?.name}</h1>
      <p>You have a memory due within the next seven (7) days.</p>
      <h3>The title is: <span style="color: orange;"> ${memory?.title}</span> </h3>
      <p>The task is due on ${memory?.dueDate}</p>
      <p>Please log into <a href="https://yourcorporatememory.com" id='link'>YOUR ACCOUNT</a> to see the reminder</p>
      <p>Thank you</p>
      <h3>Your Corporate Memory management</h3>
          `;
        // Send Email
        sendEmail({
          from: process.env.MAILER_FROM,
          to: user?.email,
          subject: 'Your Corporate Memory Automatic Reminder',
          html: text,
        });
        await Memories.findByIdAndUpdate(
          memory._id.toString(),
          { hasSentSevenDayReminder: true },
          { new: true },
        );
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
