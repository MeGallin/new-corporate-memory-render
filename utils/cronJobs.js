import cron from 'node-cron';
import moment from 'moment';
import Memories from '../models/MemoriesModel.js';
import User from '../models/UserModel.js';
import sendEmail from './sendEmail.js';

// This job runs every day at 8:00 AM.
export const scheduleReminderEmails = () => {
  cron.schedule(
    '0 8 * * *',
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

          const text = `
            <h1>Hi ${user.name}</h1>
            <p>You have a memory due within the next seven (7) days.</p>
            <h3>The title is: <span style="color: orange;">${memory.title}</span></h3>
            <p>The task is due on ${moment(memory.dueDate).format('MMMM Do YYYY')}</p>
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

          console.log(`Sent 7-day reminder for memory: ${memory._id}`);
        }
      } catch (error) {
        console.error('Error in reminder cron job:', error);
      }
    },
    {
      scheduled: true,
      timezone: "Europe/London", // It's good practice to set a timezone
    },
  );
};

