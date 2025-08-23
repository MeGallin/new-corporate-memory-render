const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');

// @description: Confirmation Email
// @route: GET /api/confirm-email/:token
// @access: public
exports.confirmEmailLink = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  let decoded;

  try {
    // Verify the token synchronously. It will throw an error if invalid or expired.
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(
      new ErrorResponse('The confirmation link is invalid or has expired.', 400),
    );
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ErrorResponse('No user found for this link.', 404));
  }

  // Use the client URL from environment variables for redirection
  const clientUrl = process.env.RESET_PASSWORD_LOCAL_URL || 'http://localhost:3000/';

  if (user.isConfirmed) {
    // User is already confirmed, redirect them. A query param could be added to show a message.
    // e.g., res.redirect(`${clientUrl}?status=already-confirmed`);
    return res.redirect(clientUrl);
  }

  user.isConfirmed = true;
  await user.save();

  // Redirect to the client application on successful confirmation.
  // e.g., res.redirect(`${clientUrl}?status=confirmed`);
  return res.redirect(clientUrl);
});
