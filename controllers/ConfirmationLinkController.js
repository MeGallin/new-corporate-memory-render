const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');

// @description: Confirmation Email
// @route: GET /confirm-email/:token
// @access: public
exports.confirmEmailLink = catchAsync(async (req, res) => {
  const decodedToken = jwt.verify(
    req.params.token,
    process.env.JWT_SECRET,
    function (err, decoded) {
      return decoded.id;
    },
  );

  const user = await User.findById(decodedToken);

  if (!user) return next(new ErrorResponse('No user found', 404));
  user.isConfirmed = true;
  await user.save();
  if (process.env.NODE_ENV === 'production') {
    return res.redirect('https://yourcorporatememory.com/');
  } else {
    return res.status(200).send({ message: 'Your Account has been Verified.' });
  }
});
