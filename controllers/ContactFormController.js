import ErrorResponse from '../utils/errorResponse.js';
import sendEmail from '../utils/sendEmail.js';
import catchAsync from '../utils/catchAsync.js';
import { isValidEmail, isValidName } from '../utils/inputValidation.js';

// Basic HTML escaping function to prevent HTML injection
const escapeHTML = (str) =>
  str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      }[tag] || tag),
  );

export const sendContactForm = catchAsync(async (req, res, next) => {
  const { name, email, message } = req.body;

  // Improved validation
  if (
    !name ||
    !email ||
    !message ||
    name.trim() === '' ||
    email.trim() === '' ||
    message.trim() === ''
  ) {
    return next(new ErrorResponse('Please fill out all required fields', 400));
  }

  if (!isValidName(name)) {
    return next(new ErrorResponse('Enter your first name and surname.', 400));
  }

  if (!isValidEmail(email)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  if (message.trim().length < 9) {
    return next(
      new ErrorResponse('Message must contain at least 9 characters.', 400),
    );
  }

  // Sanitize user input before embedding in HTML email
  const sanitizedName = escapeHTML(name.trim());
  const sanitizedMessage = escapeHTML(message.trim());

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
  await sendEmail({
    from: process.env.MAILER_FROM,
    to: email.trim(), // The address is not part of the HTML body.
    subject: 'Your Corporate Memory Contact Form',
    html: text,
  });

  res.status(200).json({ success: true, data: `Email sent successfully` });
});
