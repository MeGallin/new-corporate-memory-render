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

  const text = `<h1>Hi ${sanitizedName}</h1><p>Thank you for your enquiry</p><p>This is what your query said:</p><h2>${sanitizedMessage}</h2><h4>Somebody will make contact with in due course.</h4><p>Thank you.</p><h3>YCM management</h3>`;

  // Send Email
  sendEmail({
    from: process.env.MAILER_FROM,
    to: email, // The 'to' address is not part of the HTML body, so it doesn't need escaping here
    subject: 'Your Corporate Memory Contact Form',
    html: text,
  });

  res.status(200).json({ success: true, data: `Email sent successfully` });
});
