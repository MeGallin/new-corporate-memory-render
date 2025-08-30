import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import connectDB from './config/db.js';
import ErrorResponse from './utils/errorResponse.js';
import { scheduleReminderEmails } from './utils/cronJobs.js';

const app = express();

// CORS Configuration
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [
        'https://yourcorporatememory.com',
        'https://new-corporate-memory-api.onrender.com',
      ] // Added actual production domains
    : ['http://localhost:3000', 'http://localhost:5000']; // Development origins

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // Allow cookies to be sent
  }),
);

// Security Headers
app.use(helmet());

// Request Logging
app.use(morgan('dev')); // 'combined' for production, 'dev' for development

app.use(express.json());
app.use(compression()); // Apply compression
//Routes
import PageHitsRoute from './routes/PageHitsRoute.js';
import UserRoutes from './routes/UserRoutes.js';
import MemoriesRoute from './routes/MemoriesRoute.js';
import ContactFormRoute from './routes/ContactFormRoute.js';
import ConfirmationLinkRoute from './routes/ConfirmationLinkRoute.js';
import MemoryUploadImageRoutes from './routes/MemoryUploadImageRoutes.js';
import UserProfileImageRoutes from './routes/UserProfileImageRoutes.js';
import AdminRoute from './routes/AdminRoute.js';

app.use('/api/', PageHitsRoute);
app.use('/api/', UserRoutes);
app.use('/api/', MemoriesRoute);
app.use('/api/', ContactFormRoute);
app.use('/api/', ConfirmationLinkRoute);
app.use('/api/', MemoryUploadImageRoutes);
app.use('/api/', UserProfileImageRoutes);
app.use('/api/', AdminRoute);

// Basic route error handler (404 Not Found)
app.all('*', (req, res, next) => {
  next(new ErrorResponse(`Can't find ${req.originalUrl} on this server`, 404));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    const message = `Duplicate field value entered`;
    error = new ErrorResponse(message, 400);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Connect DB
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize scheduled jobs once the server is running
    scheduleReminderEmails();
  });
});
