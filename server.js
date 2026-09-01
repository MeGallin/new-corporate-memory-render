import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
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

app.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

//Routes
import PageHitsRoute from './routes/PageHitsRoute.js';
import UserRoutes from './routes/UserRoutes.js';
import MemoriesRoute from './routes/MemoriesRoute.js';
import ContactFormRoute from './routes/ContactFormRoute.js';
import ConfirmationLinkRoute from './routes/ConfirmationLinkRoute.js';
import MemoryUploadImageRoutes from './routes/MemoryUploadImageRoutes.js';
import UserProfileImageRoutes from './routes/UserProfileImageRoutes.js';
import AdminRoute from './routes/AdminRoute.js';
import AgentRoute from './routes/AgentRoute.js';

app.use('/api/', PageHitsRoute);
app.use('/api/', UserRoutes);
app.use('/api/', MemoriesRoute);
app.use('/api/', ContactFormRoute);
app.use('/api/', ConfirmationLinkRoute);
app.use('/api/', MemoryUploadImageRoutes);
app.use('/api/', UserProfileImageRoutes);
app.use('/api/', AdminRoute);
app.use('/api/', AgentRoute);

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
const HOST = process.env.HOST || '0.0.0.0';
const reminderCronEnabled =
  String(process.env.ENABLE_REMINDER_CRON || 'true').toLowerCase() === 'true';

let server;
let reminderTask;
let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  const forceShutdown = setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
  forceShutdown.unref();

  try {
    reminderTask?.stop();

    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await mongoose.disconnect();
    clearTimeout(forceShutdown);
    console.log('Shutdown complete.');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdown);
    console.error(`Shutdown failed: ${error.message}`);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

const startServer = async () => {
  try {
    await connectDB();

    server = app.listen(PORT, HOST, () => {
      console.log(`Server is running on ${HOST}:${PORT}`);

      if (reminderCronEnabled) {
        reminderTask = scheduleReminderEmails();
        console.log('Reminder email cron is enabled.');
      } else {
        console.log('Reminder email cron is disabled.');
      }
    });
  } catch (error) {
    console.error(`Server startup failed: ${error.message}`);
    process.exitCode = 1;
  }
};

startServer();
