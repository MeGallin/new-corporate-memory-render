const PageHits = require('../models/PageHitsModel');
const requestIp = require('request-ip');
const catchAsync = require('../utils/catchAsync');

exports.pageHits = catchAsync(async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  const hits = await PageHits.find();
  const ipAddressExists = await PageHits.findOne({ ipAddress: ipAddress });
  if (!ipAddressExists) {
    const newIpAddress = new PageHits({
      ipAddress,
    });
    await newIpAddress.save();
  }
  res.status(200).json({ success: true, hits });
});
