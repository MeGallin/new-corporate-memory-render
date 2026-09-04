import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';
import ErrorResponse from '../utils/errorResponse.js';
import { extractBearerToken } from '../utils/authSecurity.js';

export const protect = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return next(
      new ErrorResponse('You are not authorized to access this route', 401),
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch {
    return next(new ErrorResponse('Token has failed', 401));
  }

  const user = await User.findById(decoded.id).select('-password');

  if (!user) {
    return next(new ErrorResponse('No user found with this ID', 401));
  }

  if (user.isSuspended) {
    return next(new ErrorResponse('This account has been suspended', 403));
  }

  if (!user.isConfirmed) {
    return next(new ErrorResponse('Confirm your email before continuing', 403));
  }

  req.user = user;
  return next();
};

export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return next(
      new ErrorResponse(
        'You are not ADMIN and not authorized to access this route',
        403,
      ),
    );
  }
};
