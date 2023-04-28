const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');
const ErrorResponse = require('../utils/errorResponse');

exports.protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      req.user = user;
      if (!user) {
        return next(new ErrorResponse('No user found with this ID', 401));
      }
      next();
    } catch (error) {
      res.status(401);
      new ErrorResponse('Token has failed', 401);
    }
  }

  if (!token) {
    return next(
      new ErrorResponse('You are not authorized to access this route', 401),
    );
  }
};

exports.admin = (req, res, next) => {
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
