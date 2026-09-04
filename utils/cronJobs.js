import cron from 'node-cron';
import moment from 'moment';
import Memories from '../models/MemoriesModel.js';
import User from '../models/UserModel.js';
import sendEmail from './sendEmail.js';
import { buildReminderEmail } from './emailTemplates.js';

export const REMINDER_CRON_EXPRESSION = '0 8 * * *';
export const REMINDER_CRON_OPTIONS = Object.freeze({
  timezone: 'Europe/London',
  noOverlap: true,
  name: 'daily-reminder-emails',
});

export const isDueWithinReminderWindow = (dueDate, now = moment()) => {
  const parsedDueDate = moment(dueDate, moment.ISO_8601, true);
  if (!parsedDueDate.isValid()) return false;

  return parsedDueDate.isSameOrBefore(moment(now).add(7, 'days'), 'day');
};

export const sendDueDateReminders = async ({
  now = moment(),
  memoriesModel = Memories,
  userModel = User,
  sendEmailFn = sendEmail,
  logger = console,
} = {}) => {
  const candidates = await memoriesModel.find({
    setDueDate: true,
    isComplete: false,
    hasSentSevenDayReminder: false,
  });

  for (const memory of candidates) {
    if (!isDueWithinReminderWindow(memory.dueDate, now)) continue;

    try {
      const user = await userModel.findById(memory.user);
      if (!user || !user.isConfirmed || user.isSuspended) continue;

      const emailContent = buildReminderEmail({
        name: user.name,
        memoryTitle: memory.title,
        dueDate: moment(memory.dueDate).format('MMMM Do YYYY'),
        accountUrl: 'https://yourcorporatememory.com',
      });

      await sendEmailFn({
        from: process.env.MAILER_FROM,
        to: user.email,
        subject: 'Your Corporate Memory Automatic Reminder',
        html: emailContent.html,
        text: emailContent.text,
      });

      await memoriesModel.findByIdAndUpdate(
        memory._id,
        { hasSentSevenDayReminder: true },
        { returnDocument: 'after' },
      );
    } catch {
      logger.error(`Reminder processing failed for memory ${memory._id}.`);
    }
  }
};

// This job runs every day at 8:00 AM.
export const createReminderTask = () => {
  return cron.createTask(
    REMINDER_CRON_EXPRESSION,
    async () => {
      console.log('Running daily reminder email job...');
      try {
        await sendDueDateReminders();
      } catch (error) {
        console.error('Error in reminder cron job:', error);
      }
    },
    REMINDER_CRON_OPTIONS,
  );
};

export const scheduleReminderEmails = () => {
  const task = createReminderTask();
  task.start();
  return task;
};
