const PageHits = require('../models/PageHtisModel');
const ErrorResponse = require('../utils/errorResponse');
const requestIp = require('request-ip');
const { findByIdAndUpdate } = require('../models/PageHtisModel');

exports.pageHits = async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  const hits = await PageHits.find();

  try {
    if (!hits) next(new ErrorResponse('No Memory found!', 401));
    await PageHits.create({
      ipAddress: ipAddress,
    });
  } catch (error) {
    next(error);
  }
  res.status(200).json({ success: true, hits });
};
