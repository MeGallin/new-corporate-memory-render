import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildContactAcknowledgementEmail,
  buildPasswordResetEmail,
  buildRegistrationEmail,
  buildReminderEmail,
  escapeEmailHtml,
} from '../utils/emailTemplates.js';

test('email HTML escaping protects every special character', () => {
  assert.equal(
    escapeEmailHtml(`<script data-test="yes">'&</script>`),
    '&lt;script data-test=&quot;yes&quot;&gt;&#39;&amp;&lt;/script&gt;',
  );
});

test('all transactional emails use the shared visual system and text fallback', () => {
  const messages = [
    buildRegistrationEmail({
      name: 'Test User',
      confirmationUrl: 'https://example.com/api/confirm-email/token',
    }),
    buildPasswordResetEmail({
      name: 'Test User',
      resetUrl: 'https://example.com/#/password-reset/token',
    }),
    buildContactAcknowledgementEmail({
      name: 'Test User',
      message: 'Please help with this memory.',
    }),
    buildReminderEmail({
      name: 'Test User',
      memoryTitle: 'Review the quarterly archive',
      dueDate: 'September 9th 2026',
      accountUrl: 'https://example.com/#/memories',
    }),
  ];

  for (const message of messages) {
    assert.match(message.html, /<!doctype html>/);
    assert.match(message.html, /#080b10/);
    assert.match(message.html, /#101d2f/);
    assert.match(message.html, /#ff6200/);
    assert.match(message.html, /#f7f9fc/);
    assert.match(message.html, /Your Corporate Memory/);
    assert.ok(message.text.length > 40);
  }
});

test('customer content is escaped in HTML while remaining readable in plain text', () => {
  const message = buildContactAcknowledgementEmail({
    name: '<Admin User>',
    message: '<script>alert("email")</script>\nSecond line',
  });

  assert.doesNotMatch(message.html, /<script>/);
  assert.match(message.html, /&lt;Admin User&gt;/);
  assert.match(message.html, /&lt;script&gt;alert\(&quot;email&quot;\)&lt;\/script&gt;<br>Second line/);
  assert.match(message.text, /<script>alert\("email"\)<\/script>\nSecond line/);
});

test('email action buttons reject unsafe URL protocols', () => {
  assert.throws(
    () =>
      buildPasswordResetEmail({
        name: 'Test User',
        resetUrl: 'javascript:alert(1)',
      }),
    /must use HTTP or HTTPS/,
  );
});

