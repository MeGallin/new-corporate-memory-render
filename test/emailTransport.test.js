import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {
  buildMailOptions,
  createMailerTransport,
} from '../utils/sendEmail.js';

test('email transport requires certificate validation and TLS 1.2 or newer', () => {
  const originalEnvironment = {
    MAILER_HOST: process.env.MAILER_HOST,
    MAILER_USER: process.env.MAILER_USER,
    MAILER_PW: process.env.MAILER_PW,
  };

  process.env.MAILER_HOST = 'smtp.example.com';
  process.env.MAILER_USER = 'mailer@example.com';
  process.env.MAILER_PW = 'test-password';

  try {
    const transporter = createMailerTransport();

    assert.equal(transporter.options.host, 'smtp.example.com');
    assert.equal(transporter.options.port, 587);
    assert.equal(transporter.options.secure, false);
    assert.equal(transporter.options.requireTLS, true);
    assert.equal(transporter.options.tls.minVersion, 'TLSv1.2');
    assert.notEqual(transporter.options.tls.rejectUnauthorized, false);
  } finally {
    Object.entries(originalEnvironment).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
});

test('email messages disable file and URL access', () => {
  const originalFrom = process.env.MAILER_FROM;
  const originalBcc = process.env.MAILER_BCC;
  process.env.MAILER_FROM = 'sender@example.com';
  process.env.MAILER_BCC = 'audit@example.com';

  try {
    const mailOptions = buildMailOptions({
      to: 'recipient@example.com',
      subject: 'Test message',
      html: '<p>Hello</p>',
    });

    assert.deepEqual(mailOptions, {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      bcc: 'audit@example.com',
      subject: 'Test message',
      html: '<p>Hello</p>',
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  } finally {
    if (originalFrom === undefined) {
      delete process.env.MAILER_FROM;
    } else {
      process.env.MAILER_FROM = originalFrom;
    }

    if (originalBcc === undefined) {
      delete process.env.MAILER_BCC;
    } else {
      process.env.MAILER_BCC = originalBcc;
    }
  }
});

test('Nodemailer 9 composes the existing HTML message shape without network access', async () => {
  const transporter = nodemailer.createTransport({ jsonTransport: true });
  const info = await transporter.sendMail({
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Compatibility check',
    html: '<p>Hello</p>',
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  const message = JSON.parse(info.message);
  assert.equal(message.subject, 'Compatibility check');
  assert.equal(message.html, '<p>Hello</p>');
});
