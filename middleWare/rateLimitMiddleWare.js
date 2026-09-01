import { rateLimit } from 'express-rate-limit';

const createRateLimitResponse = (message) => ({
  success: false,
  error: message,
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: createRateLimitResponse(
    'Too many sign-in attempts. Please try again in 15 minutes.',
  ),
});

export const accountActionRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: createRateLimitResponse(
    'Too many account requests. Please try again later.',
  ),
});
