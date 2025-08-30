import PageHits from '../models/PageHitsModel.js';
import requestIp from 'request-ip';
import catchAsync from '../utils/catchAsync.js';

export const pageHits = catchAsync(async (req, res, next) => {
  const ipAddress = requestIp.getClientIp(req);
  let statusCode = 200; // Default to 200 OK for existing IPs

  try {
    // Attempt to create a new document. If the ipAddress is unique, it will be created.
    // If it's a duplicate, Mongoose will throw a unique index error (code 11000).
    await PageHits.create({ ipAddress });
    statusCode = 201; // If successful, it's a new IP, so we set status to 201 Created.
  } catch (error) {
    // If the error is not a duplicate key error, re-throw it to be handled by our global error handler.
    if (error.code !== 11000) {
      throw error;
    }
    // For duplicate key errors (expected for repeat visitors), we simply ignore it and proceed.
  }

  // Get the total count of unique visitors.
  const totalHits = await PageHits.countDocuments();

  // Send the response with the correct status code and the total count.
  res.status(statusCode).json({ success: true, count: totalHits });
});
