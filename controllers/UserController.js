const crypto = require('crypto');
const User = require('../models/UserModel');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');

// @description: Register new user
// @route: POST /api/register
// @access: Public
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    const user = await User.create({
      name,
      email,
      password,
      profileImage: '/assets/images/sample.png',
      cloudinaryId: '12345',
    });

    try {
      const link = `${
        process.env.MAILER_LOCAL_URL
      }api/confirm-email/${generateToken(user._id)}`;
      const message = `<h1>Hi ${name}</h1><p>You have successfully registered with Your Corporate Memory</p><p>Please click the link below to verify your email address.</p><h4>Please note, in order to get full functionality you must confirm your mail address with the link below.</h4></p><p><a href=${link} id='link'>Click here to verify</a></p><p>Thank you Your Corporate Memory management</p>`;

      // Send Email
      sendEmail({
        from: process.env.MAILER_FROM,
        to: 'me@garyallin.uk', // change to this when live user.email
        subject: 'Your Corporate Memory Registration',
        html: message,
      });

      res
        .status(200)
        .json({ success: true, data: `Email sent successfully ${link}` });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      return next(new ErrorResponse('Email could not be set', 500));
    }
  } catch (error) {
    next(error);
  }
};

// Generate a secret token for the user
const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET);
};

const sendToken = (user, statusCode, res) => {
  const token = user.getSignedToken();
  res.status(statusCode).json({ success: true, token, name: user.name });
};

// @description: USER login
// @route: POST /api/login
// @access: Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and Password', 400));
  }

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Please provide valid credentials', 401));
    }

    const isMatched = await user.matchPasswords(password);

    if (!isMatched) {
      return next(new ErrorResponse('Please provide valid credentials', 401));
    }

    sendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @description: USER ADMIN DETAIL UPDATE
// @route: PUT /api/user/:id
// @access: Private
exports.userUpdateAdminDetails = async (req, res, next) => {
  const user = await User.findById(req.params.id);

  try {
    if (!user) return new ErrorResponse('User not found', 400);
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password || user.password;
    }
    const updatedUser = await user.save();
    res.json({
      success: true,
      updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

//Forgot PW
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return next(new ErrorResponse('Email could not be set', 404));

    try {
      const resetToken = user.getResetPasswordToken();
      await user.save();
      const resetUrl = `${process.env.RESET_PASSWORD_LOCAL_URL}#/password-reset/${resetToken}`;
      const message = `<h1>You have requested a password reset.</h1><p>Please click on the following link to reset your password.</p><p><a href=${resetUrl} id='link'>Click here to verify</a></p>`;
      // Send Email

      sendEmail({
        from: process.env.MAILER_FROM,
        to: user.email,
        subject: 'Password Reset Request',
        html: message,
      });

      res.status(200).json({ success: true, data: `Email sent successfully` });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();
      return next(new ErrorResponse('Email could not be set', 500));
    }
  } catch (error) {
    next(error);
  }
};

// @description: USER forgot PW request
// @route: PUT /api/forgot-password
// @access: Private
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) return next(new ErrorResponse('Email could not be set', 404));

    try {
      const resetToken = user.getResetPasswordToken();
      await user.save();
      const resetUrl = `${process.env.RESET_PASSWORD_LOCAL_URL}#/password-reset/${resetToken}`;
      const message = `<h1>You have requested a password reset.</h1><p>Please click on the following link to reset your password.</p><p><a href=${resetUrl} id='link'>Click here to verify</a></p>`;
      // Send Email

      sendEmail({
        from: process.env.MAILER_FROM,
        to: user.email,
        subject: 'YCM Password Reset Request',
        html: message,
      });

      res.status(200).json({ success: true, data: `Email sent successfully` });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();
      return next(new ErrorResponse('Email could not be set', 500));
    }
  } catch (error) {
    next(error);
  }
};

// @description: USER ADMIN Password reset
// @route: PUT /api/resetpassword/:token
// @access: Private
exports.resetPassword = async (req, res, next) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  try {
    const user = await User.findOne({
      resetPasswordToken: resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return next(new ErrorResponse('Invalid Reset Token', 400));

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res
      .status(200)
      .json({ success: true, data: 'Password was successfully changed.' });
  } catch (error) {
    next(error);
  }
};

// @description: Get user data of logged in in user
// @route: GET /api/users/user
// @access: PRIVATE
exports.getUserDetails = async (req, res, next) => {
  const userDetails = await User.findById(req.user.id);
  try {
    if (!userDetails)
      return next(new ErrorResponse('Invalid, no user details found'), 404);
    res.status(200).json({ success: true, userDetails });
  } catch (error) {
    next(error);
  }
};
