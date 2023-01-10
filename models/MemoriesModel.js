const mongoose = require('mongoose');

const MemoriesSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: [true, 'Title cant be blank'],
    },
    memory: {
      type: String,
      required: [true, 'Memory cant be blank'],
    },
    setDueDate: {
      type: Boolean,
      default: true,
    },
    dueDate: {
      type: String,
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
    hasSentSevenDayReminder: {
      type: Boolean,
      default: false,
    },
    hasSentOneDayReminder: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 1,
    },
    tag: {
      type: String,
    },
    memoryImage: {
      type: String,
    },
    cloudinaryId: {
      type: String,
    },
  },

  {
    timestamps: true,
  },
);

const Memories = mongoose.model('Memories', MemoriesSchema);

module.exports = Memories;
