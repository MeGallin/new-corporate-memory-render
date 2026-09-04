import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import moment from 'moment';
import cron from 'node-cron';
import {
  REMINDER_CRON_EXPRESSION,
  REMINDER_CRON_OPTIONS,
  createReminderTask,
  isDueWithinReminderWindow,
  sendDueDateReminders,
} from '../utils/cronJobs.js';
import {
  createRequestLogger,
  redactSensitiveUrlTokens,
} from '../utils/requestLogging.js';

const listen = (app) => new Promise((resolve) => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});

const close = (server) => new Promise((resolve, reject) => {
  server.close((error) => (error ? reject(error) : resolve()));
});

test('request logging preserves ordinary paths and redacts account tokens', async () => {
  const lines = [];
  const app = express();
  app.use(createRequestLogger({
    stream: { write: (line) => lines.push(line.trim()) },
  }));
  app.get('/runtime-check', (req, res) => res.status(204).end());

  const server = await listen(app);
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/runtime-check`);
    assert.equal(response.status, 204);
  } finally {
    await close(server);
  }

  assert.equal(lines.length, 1);
  assert.match(lines[0], /GET \/runtime-check/);
  assert.match(lines[0], /204/);
  assert.equal(
    redactSensitiveUrlTokens('/api/confirm-email/secret-token?source=email'),
    '/api/confirm-email/[REDACTED]?source=email',
  );
  assert.equal(
    redactSensitiveUrlTokens('/api/resetpassword/reset-token'),
    '/api/resetpassword/[REDACTED]',
  );
});

test('node-cron 4 preserves the daily London reminder and task lifecycle', async () => {
  assert.equal(cron.validate(REMINDER_CRON_EXPRESSION), true);
  assert.equal(typeof cron.shutdown, 'function');
  assert.deepEqual(REMINDER_CRON_OPTIONS, {
    timezone: 'Europe/London',
    noOverlap: true,
    name: 'daily-reminder-emails',
  });

  const task = createReminderTask();
  try {
    assert.equal(task.getPattern(), REMINDER_CRON_EXPRESSION);
    assert.equal(task.getStatus(), 'stopped');
    assert.equal(typeof task.getNextRuns, 'function');
    assert.equal(task.match(new Date('2026-09-02T07:00:00Z')), true);
    assert.equal(task.match(new Date('2026-09-02T08:00:00Z')), false);
  } finally {
    await task.destroy();
  }

  assert.equal(task.getStatus(), 'destroyed');

  const lifecycleTask = cron.createTask(
    REMINDER_CRON_EXPRESSION,
    () => {},
    REMINDER_CRON_OPTIONS,
  );
  await lifecycleTask.start();
  assert.equal(lifecycleTask.getStatus(), 'idle');
  await lifecycleTask.stop();
  assert.equal(lifecycleTask.getStatus(), 'stopped');
  await lifecycleTask.destroy();
  assert.equal(lifecycleTask.getStatus(), 'destroyed');
});

test('Moment 2.30 retains the seven-day reminder window calculation', () => {
  assert.equal(moment.version, '2.30.1');
  const dueDate = moment.utc('2026-09-01T12:00:00Z').add(7, 'days');
  assert.equal(dueDate.format('YYYY-MM-DD'), '2026-09-08');
});

test('reminder dates are compared safely despite being stored as strings', () => {
  const now = moment.utc('2026-09-01T12:00:00Z');
  assert.equal(isDueWithinReminderWindow('2026-09-08', now), true);
  assert.equal(isDueWithinReminderWindow('2026-09-09', now), false);
  assert.equal(isDueWithinReminderWindow('not-a-date', now), false);
});

test('reminders are sent only for eligible memories and active confirmed users', async () => {
  const sent = [];
  const updated = [];
  const memoriesModel = {
    find: async (query) => {
      assert.deepEqual(query, {
        setDueDate: true,
        isComplete: false,
        hasSentSevenDayReminder: false,
      });
      return [
        { _id: 'failed', user: 'failed', title: 'Bad address', dueDate: '2026-09-03' },
        { _id: 'eligible', user: 'active', title: 'Pay invoice', dueDate: '2026-09-05' },
        { _id: 'future', user: 'active', title: 'Future', dueDate: '2026-09-20' },
        { _id: 'suspended', user: 'suspended', title: 'Hidden', dueDate: '2026-09-04' },
      ];
    },
    findByIdAndUpdate: async (...args) => updated.push(args),
  };
  const userModel = {
    findById: async (id) => ({
      name: 'Admin Guy',
      email: id === 'failed' ? 'failed@example.com' : 'admin@example.com',
      isConfirmed: true,
      isSuspended: id === 'suspended',
    }),
  };

  await sendDueDateReminders({
    now: moment.utc('2026-09-01T12:00:00Z'),
    memoriesModel,
    userModel,
    sendEmailFn: async (message) => {
      if (message.to === 'failed@example.com') throw new Error('SMTP failure');
      sent.push(message);
    },
    logger: { error: () => {} },
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'admin@example.com');
  assert.equal(updated.length, 1);
  assert.equal(updated[0][0], 'eligible');
});
