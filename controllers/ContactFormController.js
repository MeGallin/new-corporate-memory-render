const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const catchAsync = require('../utils/catchAsync');

exports.sendContactForm = catchAsync(async (req, res, next) => {
  const { name, email, message } = req.body;

  //Potentionally could save the emailer details here.

  if (!name && !email && !message)
    return next(new ErrorResponse('Form can NOT be black', 500));
  const text = `<h1>Hi ${name}</h1><p>Thank you for your enquiry</p><p>This is what your query said:</p><h2>${message}</h2><h4>Somebody will make contact with in due course.</h4><p>Thank you.</p><h3>YCM management</h3>`;

  // Send Email
  sendEmail({
    from: process.env.MAILER_FROM,
    to: email,
    subject: 'Your Corporate Memory Contact Form',
    html: text,
  });
  res.status(200).json({ success: true, data: `Email sent successfully` });
});
