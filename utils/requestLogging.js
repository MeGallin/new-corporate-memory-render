import morgan from 'morgan';

const sensitiveTokenPathPattern =
  /(\/api\/(?:confirm-email|resetpassword)\/)[^/?#]+/gi;

export const redactSensitiveUrlTokens = (url = '') =>
  url.replace(sensitiveTokenPathPattern, '$1[REDACTED]');

morgan.token('safe-url', (req) => redactSensitiveUrlTokens(req.originalUrl));

export const createRequestLogger = (options = {}) =>
  morgan(
    ':method :safe-url :status :response-time ms - :res[content-length]',
    options,
  );
