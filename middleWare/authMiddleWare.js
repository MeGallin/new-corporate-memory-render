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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new ErrorResponse('No user found with this ID', 401));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(new ErrorResponse('Token has failed', 401));
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return next(
      new ErrorResponse(
        'You are not ADMIN and not authorized to access this route',
        401,
      ),
    );
  }
};
