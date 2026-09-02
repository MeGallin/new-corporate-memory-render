const palette = Object.freeze({
  black: '#080b10',
  blue: '#101d2f',
  orange: '#ff6200',
  white: '#f7f9fc',
  muted: '#a9b5c6',
  border: '#394657',
});

export const escapeEmailHtml = (value = '') =>
  String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character],
  );

const formatMessage = (value) =>
  escapeEmailHtml(value).replace(/\r?\n/g, '<br>');

const safeEmailUrl = (value) => {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Email action URL must use HTTP or HTTPS');
  }
  return escapeEmailHtml(url.toString());
};

const actionButton = (label, url) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0 8px;">
    <tr>
      <td style="border-radius: 8px; background-color: ${palette.orange};">
        <a href="${safeEmailUrl(url)}" style="display: inline-block; padding: 13px 20px; color: ${palette.black}; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; line-height: 1; text-decoration: none; text-transform: uppercase; letter-spacing: 0.6px;">${escapeEmailHtml(label)}</a>
      </td>
    </tr>
  </table>`;

const informationPanel = (label, content) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 22px 0; border: 1px solid ${palette.border}; border-radius: 8px; background-color: ${palette.black};">
    <tr>
      <td style="padding: 0 18px;">
        <span style="display: inline-block; position: relative; top: -9px; padding: 0 7px; background-color: ${palette.black}; color: ${palette.white}; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 700; line-height: 18px; text-transform: uppercase; letter-spacing: 0.7px;">${escapeEmailHtml(label)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 18px 18px; color: ${palette.white}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.65;">${content}</td>
    </tr>
  </table>`;

const emailLayout = ({ preheader, eyebrow, title, greeting, bodyHtml }) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeEmailHtml(title)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${palette.black}; color: ${palette.white};">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${escapeEmailHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: ${palette.black};">
      <tr>
        <td align="center" style="padding: 28px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 640px; border: 1px solid ${palette.border}; border-top: 5px solid ${palette.orange}; border-radius: 10px; background-color: ${palette.blue};">
            <tr>
              <td style="padding: 28px 30px 22px; border-bottom: 1px solid ${palette.border};">
                <p style="margin: 0 0 9px; color: ${palette.orange}; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.1px;">${escapeEmailHtml(eyebrow)}</p>
                <h1 style="margin: 0; color: ${palette.white}; font-family: Arial, Helvetica, sans-serif; font-size: 28px; line-height: 1.2; letter-spacing: -0.5px;">${escapeEmailHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 26px 30px 30px; color: ${palette.white}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.65;">
                <p style="margin: 0 0 16px; color: ${palette.white};">${escapeEmailHtml(greeting)}</p>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding: 18px 30px; border-top: 1px solid ${palette.border}; color: ${palette.muted}; font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.6; text-transform: uppercase; letter-spacing: 0.5px;">
                Your Corporate Memory<br>
                Keep what matters connected.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const buildRegistrationEmail = ({ name, confirmationUrl }) => ({
  text: `Hi ${name},\n\nYou have successfully registered with Your Corporate Memory. Confirm your email address to unlock the full account.\n\nConfirm your email: ${confirmationUrl}\n\nYour Corporate Memory`,
  html: emailLayout({
    preheader: 'Confirm your email address to activate your account.',
    eyebrow: 'Account access',
    title: 'Confirm your email',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p style="margin: 0; color: ${palette.muted};">You have successfully registered with Your Corporate Memory. Confirm your email address to unlock the full account.</p>
      ${informationPanel('Next step', 'Use the secure button below to verify your email address.')}
      ${actionButton('Confirm email', confirmationUrl)}
      <p style="margin: 16px 0 0; color: ${palette.muted}; font-size: 13px;">If you did not create this account, you can ignore this email.</p>`,
  }),
});

export const buildPasswordResetEmail = ({ name, resetUrl }) => ({
  text: `Hi ${name},\n\nWe received a request to reset your Your Corporate Memory password.\n\nReset your password: ${resetUrl}\n\nIf you did not request this change, you can ignore this email.`,
  html: emailLayout({
    preheader: 'Use the secure link to reset your password.',
    eyebrow: 'Account recovery',
    title: 'Reset your password',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p style="margin: 0; color: ${palette.muted};">We received a request to reset your Your Corporate Memory password.</p>
      ${informationPanel('Security notice', 'Only use this link if you requested the password change. The reset link is time limited.')}
      ${actionButton('Reset password', resetUrl)}
      <p style="margin: 16px 0 0; color: ${palette.muted}; font-size: 13px;">If you did not request this change, you can ignore this email.</p>`,
  }),
});

export const buildContactAcknowledgementEmail = ({ name, message }) => ({
  text: `Hi ${name},\n\nThank you for your enquiry. We have received your message and will get back to you shortly.\n\nYour message:\n${message}\n\nYour Corporate Memory`,
  html: emailLayout({
    preheader: 'We have received your enquiry.',
    eyebrow: 'Contact request',
    title: 'We received your message',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p style="margin: 0; color: ${palette.muted};">Thank you for your enquiry. We have received your message and will get back to you shortly.</p>
      ${informationPanel('Your message', formatMessage(message))}
      <p style="margin: 0; color: ${palette.muted};">Thank you for your patience.</p>`,
  }),
});

export const buildReminderEmail = ({ name, memoryTitle, dueDate, accountUrl }) => ({
  text: `Hi ${name},\n\nYou have a memory due within the next seven days.\n\nMemory: ${memoryTitle}\nDue: ${dueDate}\n\nView your account: ${accountUrl}\n\nYour Corporate Memory`,
  html: emailLayout({
    preheader: `${memoryTitle} is due within the next seven days.`,
    eyebrow: 'Memory reminder',
    title: 'A memory is due soon',
    greeting: `Hi ${name},`,
    bodyHtml: `
      <p style="margin: 0; color: ${palette.muted};">You have a memory due within the next seven days.</p>
      ${informationPanel(
        'Reminder details',
        `<strong style="display: block; color: ${palette.orange}; font-size: 18px;">${escapeEmailHtml(memoryTitle)}</strong><span style="display: block; margin-top: 7px; color: ${palette.muted};">Due ${escapeEmailHtml(dueDate)}</span>`,
      )}
      ${actionButton('View memory', accountUrl)}`,
  }),
});

