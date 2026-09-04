import crypto from 'crypto';
import User from '../models/UserModel.js';
import ErrorResponse from '../utils/errorResponse.js';
import sendEmail from '../utils/sendEmail.js';
import jwt from 'jsonwebtoken';
import requestIp from 'request-ip';
import catchAsync from '../utils/catchAsync.js';
import { OAuth2Client } from 'google-auth-library';
import {
  extractBearerToken,
  verifyGoogleIdToken,
} from '../utils/authSecurity.js';
import {
  PASSWORD_REQUIREMENT,
  isValidEmail,
  isValidName,
  isValidNewPassword,
  normalizeEmail,
} from '../utils/inputValidation.js';
import {
  buildPasswordResetEmail,
  buildRegistrationEmail,
} from '../utils/emailTemplates.js';
import { deleteCloudinaryImage } from '../utils/cloudinaryImages.js';
import { toPublicUser } from '../utils/userResponse.js';

const googleClient = new OAuth2Client();

// @description: Register new user
// @route: POST /api/register
// @access: Public
export const register = catchAsync(async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  const { name, email, password } = req.body;

  if (!isValidName(name)) {
    return next(new ErrorResponse('Enter your first name and surname.', 400));
  }
  if (!isValidEmail(email)) {
    return next(new ErrorResponse('Enter a valid email address.', 400));
  }
  if (!isValidNewPassword(password)) {
    return next(new ErrorResponse(PASSWORD_REQUIREMENT, 400));
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizeEmail(email),
    password,
    profileImage: '/assets/images/sample.jpg',
    ipAddress: ipAddress,
    loginCounter: 0,
    registeredWithGoogle: false,
  });

  try {
    const link = `${
      process.env.MAILER_LOCAL_URL
    }api/confirm-email/${generateConfirmationToken(user._id)}`;
    const message = buildRegistrationEmail({
      name: user.name,
      confirmationUrl: link,
    });

    // Send Email
    await sendEmail({
      from: process.env.MAILER_FROM,
      to: user.email, // change to this when live user.email
      subject: 'Your Corporate Memory Registration',
      html: message.html,
      text: message.text,
    });

    res
      .status(201)
      .json({
        success: true,
        data: 'Registration successful. Check your email to confirm your account.',
      });
  } catch (error) {
    await user.deleteOne();

    return next(new ErrorResponse('Registration email could not be sent', 500));
  }
});

// Generate a secret token for the user
export const generateConfirmationToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
};

const sendToken = (user, statusCode, res) => {
  const token = user.getSignedToken();
  res.status(statusCode).json({ success: true, token, name: user.name });
};

// @description: USER login
// @route: POST /api/login
// @access: Public
export const login = catchAsync(async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  const { email, password } = req.body;

  // Check if email and PW exist
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and Password', 400));
  }
  if (!isValidEmail(email)) {
    return next(new ErrorResponse('Please provide valid credentials', 401));
  }

  // Check if user exists and PW is correct
  const user = await User.findOne({ email: normalizeEmail(email) }).select(
    '+password',
  );

  if (!user) {
    return next(new ErrorResponse('Please provide valid credentials', 401));
  }

  const isMatched = await user.matchPasswords(password);

  if (!isMatched) {
    return next(new ErrorResponse('Please provide valid credentials', 401));
  }
  if (!user.isConfirmed) {
    return next(new ErrorResponse('Confirm your email before signing in', 403));
  }
  if (user.isSuspended) {
    return next(new ErrorResponse('This account has been suspended', 403));
  }
  user.loginCounter = user.loginCounter + 1;
  user.ipAddress = ipAddress;
  await user.save();

  sendToken(user, 200, res);
});

//Google Login
export const googleLogin = catchAsync(async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return next(new ErrorResponse('No Google token provided', 400));
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    return next(new ErrorResponse('Google login is not configured', 503));
  }

  let googleProfile;
  try {
    googleProfile = await verifyGoogleIdToken({
      client: googleClient,
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    return next(new ErrorResponse('Invalid Google token', 401));
  }

  //check if email exist
  const existingUser = await User.findOne({ email: googleProfile.email });
  if (!existingUser) {
    // Create user
    const user = await User.create({
      name: googleProfile.name,
      email: googleProfile.email,
      password: crypto.randomBytes(32).toString('hex'),
      isConfirmed: true,
      registeredWithGoogle: true,
      profileImage: '/assets/images/sample.jpg',
      ipAddress: ipAddress,
      loginCounter: 0,
    });
    await user.save();
    sendToken(user, 200, res);
  } else {
    //Login
    if (existingUser.isSuspended) {
      return next(new ErrorResponse('This account has been suspended', 403));
    }
    existingUser.isConfirmed = true;
    existingUser.loginCounter = existingUser.loginCounter + 1;
    existingUser.ipAddress = ipAddress;
    await existingUser.save();
    sendToken(existingUser, 200, res);
  }
});

// @description: USER ADMIN DETAIL UPDATE
// @route: PUT /api/user/:id
// @access: Private
export const updateUserDetails = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) return next(new ErrorResponse('User not found', 400));
  if (req.body.name !== undefined) {
    if (!isValidName(req.body.name)) {
      return next(new ErrorResponse('Enter your first name and surname.', 400));
    }
    user.name = req.body.name.trim();
  }
  if (req.body.email !== undefined) {
    if (!isValidEmail(req.body.email)) {
      return next(new ErrorResponse('Enter a valid email address.', 400));
    }
    user.email = normalizeEmail(req.body.email);
  }
  if (req.body.password !== undefined) {
    if (!isValidNewPassword(req.body.password)) {
      return next(new ErrorResponse(PASSWORD_REQUIREMENT, 400));
    }
    user.password = req.body.password;
  }
  const updatedUser = await user.save();
  res.json({
    success: true,
    updatedUser: toPublicUser(updatedUser),
  });
});

// @description: USER forgot PW request
// @route: PUT /api/forgot-password
// @access: Private
export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!isValidEmail(email)) {
    return next(new ErrorResponse('Enter a valid email address.', 400));
  }

  const user = await User.findOne({ email: normalizeEmail(email) });

  if (!user) {
    return res.status(200).json({
      success: true,
      data: 'If that account exists, a password reset email has been sent.',
    });
  }

  try {
    const resetToken = user.getResetPasswordToken();
    await user.save();
    const resetUrl = `${process.env.RESET_PASSWORD_LOCAL_URL}#/password-reset/${resetToken}`;
    const message = buildPasswordResetEmail({
      name: user.name,
      resetUrl,
    });
    // Send Email

    await sendEmail({
      from: process.env.MAILER_FROM,
      to: user.email,
      subject: 'YCM Password Reset Request',
      html: message.html,
      text: message.text,
    });

    res.status(200).json({
      success: true,
      data: 'If that account exists, a password reset email has been sent.',
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    return next(new ErrorResponse('Email could not be set', 500));
  }
});

// @description: USER ADMIN Password reset
// @route: PUT /api/resetpassword/:token
// @access: Private
export const resetPassword = catchAsync(async (req, res, next) => {
  if (!isValidNewPassword(req.body.password)) {
    return next(new ErrorResponse(PASSWORD_REQUIREMENT, 400));
  }

  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

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
});

// @description: Get user data of logged in in user
// @route: GET /api/users/user
// @access: PRIVATE
export const getUserDetails = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    userDetails: toPublicUser(req.user),
  });
});

// @description: Delete a User Profile Image
// @route: DELETE /api/user-profile-image
// @access: Private
export const deleteUserProfileImage = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) return next(new ErrorResponse('No User found!', 401));
  if (user.cloudinaryId) {
    await deleteCloudinaryImage({
      publicId: user.cloudinaryId,
      imageUrl: user.profileImage,
    });
  }

  //Update the memory object
  user.cloudinaryId = null;
  user.profileImage = null;

  await user.save();
  res.status(200).json({ success: true });
});
