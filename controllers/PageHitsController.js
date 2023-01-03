const PageHits = require('../models/PageHitsModel');
const requestIp = require('request-ip');

exports.pageHits = async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  const hits = await PageHits.find();
  const ipAddressExists = await PageHits.findOne({ ipAddress: ipAddress });

  try {
    if (!ipAddressExists) {
      const newIpAddress = new PageHits({
        ipAddress,
      });
      await newIpAddress.save();
    }
    res.status(200).json({ success: true, hits });
  } catch (error) {
    next(error);
  }
};
