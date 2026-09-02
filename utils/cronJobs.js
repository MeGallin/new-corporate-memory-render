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

// This job runs every day at 8:00 AM.
export const createReminderTask = () => {
  return cron.createTask(
    REMINDER_CRON_EXPRESSION,
    async () => {
      console.log('Running daily reminder email job...');
      try {
        const sevenDayWindow = moment().add(7, 'days').toDate();
        const memories = await Memories.find({
          dueDate: { $lte: sevenDayWindow },
          setDueDate: true,
          isComplete: false,
          hasSentSevenDayReminder: false,
        });

        for (const memory of memories) {
          const user = await User.findById(memory.user);
          if (!user) continue;

          const emailContent = buildReminderEmail({
            name: user.name,
            memoryTitle: memory.title,
            dueDate: moment(memory.dueDate).format('MMMM Do YYYY'),
            accountUrl: 'https://yourcorporatememory.com',
          });

          await sendEmail({
            from: process.env.MAILER_FROM,
            to: user.email,
            subject: 'Your Corporate Memory Automatic Reminder',
            html: emailContent.html,
            text: emailContent.text,
          });

          await Memories.findByIdAndUpdate(
            memory._id,
            { hasSentSevenDayReminder: true },
            { returnDocument: 'after' },
          );

          console.log(`Sent 7-day reminder for memory: ${memory._id}`);
        }
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
