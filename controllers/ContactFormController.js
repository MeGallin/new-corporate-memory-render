import ErrorResponse from '../utils/errorResponse.js';
import sendEmail from '../utils/sendEmail.js';
import catchAsync from '../utils/catchAsync.js';
import { isValidEmail, isValidName } from '../utils/inputValidation.js';
import { buildContactAcknowledgementEmail } from '../utils/emailTemplates.js';

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

  const emailContent = buildContactAcknowledgementEmail({
    name: name.trim(),
    message: message.trim(),
  });

  // Send Email
  await sendEmail({
    from: process.env.MAILER_FROM,
    to: email.trim(), // The address is not part of the HTML body.
    subject: 'Your Corporate Memory Contact Form',
    html: emailContent.html,
    text: emailContent.text,
  });

  res.status(200).json({ success: true, data: `Email sent successfully` });
});
