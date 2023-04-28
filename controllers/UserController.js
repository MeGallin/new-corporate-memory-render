const crypto = require('crypto');
const User = require('../models/UserModel');
const UserProfileImage = require('../models/UserProfileImageModel');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
const cloudinary = require('cloudinary');

// @description: Register new user
// @route: POST /api/register
// @access: Public
exports.register = async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  const { name, email, password } = req.body;

  try {
    const user = await User.create({
      name,
      email,
      password,
      profileImage: '/assets/images/sample.jpg',
      cloudinaryId: '12345',
      ipAddress: ipAddress,
      loginCounter: 0,
      registeredWithGoogle: false,
    });

    try {
      const link = `${
        process.env.MAILER_LOCAL_URL
      }api/confirm-email/${generateToken(user._id)}`;
      const message = `<h1>Hi ${name}</h1><p>You have successfully registered with Your Corporate Memory</p><p>Please click the link below to verify your email address.</p><h4>Please note, in order to get full functionality you must confirm your mail address with the link below.</h4></p><p><a href=${link} id='link'>Click here to verify</a></p><p>Thank you Your Corporate Memory management</p>`;

      // Send Email
      sendEmail({
        from: process.env.MAILER_FROM,
        to: user.email, // change to this when live user.email
        subject: 'Your Corporate Memory Registration',
        html: message,
      });

      res
        .status(201)
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
  const ipAddress = requestIp.getClientIp(req);
  const { email, password } = req.body;

  // Check if email and PW exist
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and Password', 400));
  }

  try {
    // Check if user exists and PW is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Please provide valid credentials', 401));
    }

    const isMatched = await user.matchPasswords(password);

    if (!isMatched) {
      return next(new ErrorResponse('Please provide valid credentials', 401));
    }
    user.loginCounter = user.loginCounter + 1;
    user.ipAddress = ipAddress;
    await user.save();

    sendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

//Google Login
exports.googleLogin = async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  token = req.body.headers.Authorization.split(' ')[1];
  try {
    if (!token?.sub)
      return next(new ErrorResponse('Your login was un-successful', 500));

    //Potential confirmation email here.

    const googleToken = jwt.decode(token);
    //check if email exist
    const existingUser = await User.findOne({ email: googleToken?.email });
    if (existingUser === null) {
      // Create user
      const user = await User.create({
        name: googleToken?.name,
        email: googleToken?.email,
        password: googleToken?.email + process.env.JWT_SECRET,
        isConfirmed: true,
        registeredWithGoogle: true,
        profileImage: '/assets/images/sample.jpg',
        cloudinaryId: '12345',
        ipAddress: ipAddress,
        loginCounter: 0,
      });
      await user.save();
      sendToken(user, 200, res);
    } else {
      //Login
      const user = await User.findOne({ email: googleToken?.email });
      user.loginCounter = user.loginCounter + 1;
      user.ipAddress = ipAddress;
      await user.save();
      sendToken(user, 200, res);
    }
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

// @description: Delete a User Profile Image
// @route: DELETE /api/user-profile-image-delete/:id
// @access: Private
exports.deleteUserProfileImage = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  try {
    if (!user) return next(new ErrorResponse('No User found!', 401));
    // Associate it with memory image
    const image = await UserProfileImage.findOne({
      cloudinaryId: user.cloudinaryId,
    });
    await image.remove();

    //Delete image from Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
    await cloudinary.uploader.destroy(user.cloudinaryId);

    //Update the memory object
    user.cloudinaryId = null;
    user.profileImage = null;

    await user.save();
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
