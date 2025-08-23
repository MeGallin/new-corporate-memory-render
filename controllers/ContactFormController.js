const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const catchAsync = require('../utils/catchAsync');

// Basic HTML escaping function to prevent HTML injection
const escapeHTML = (str) =>
  str.replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[tag] || tag));

// Basic email validation regex
const emailRegEx = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

exports.sendContactForm = catchAsync(async (req, res, next) => {
  const { name, email, message } = req.body;

  // Improved validation
  if (!name || !email || !message || name.trim() === '' || email.trim() === '' || message.trim() === '') {
    return next(new ErrorResponse('Please fill out all required fields', 400));
  }

  if (!emailRegEx.test(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  // Sanitize user input before embedding in HTML email
  const sanitizedName = escapeHTML(name);
  const sanitizedMessage = escapeHTML(message);

  const text = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee;">
        <h1 style="color: #0056b3;">Your Corporate Memory</h1>
    </div>
    <div style="padding: 20px 0;">
        <p>Hi <strong style="color: #0056b3;">${sanitizedName}</strong>,</p>
        <p>Thank you for your enquiry. We have received your message and will get back to you shortly.</p>
        <p style="font-weight: bold;">Your query:</p>
        <div style="background-color: #f9f9f9; border-left: 4px solid #0056b3; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 0;">${sanitizedMessage}</p>
        </div>
        <p>Thank you for your patience.</p>
    </div>
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #777;">
        <p>Best regards,</p>
        <p>Your Corporate Memory Management</p>
    </div>
</div>`;

  // Send Email
  sendEmail({
    from: process.env.MAILER_FROM,
    to: email, // The 'to' address is not part of the HTML body, so it doesn't need escaping here
    subject: 'Your Corporate Memory Contact Form',
    html: text,
  });

  res.status(200).json({ success: true, data: `Email sent successfully` });
});
