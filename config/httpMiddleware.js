import cors from 'cors';
import helmet from 'helmet';

const productionOrigins = Object.freeze([
  'https://yourcorporatememory.com',
  'https://new-corporate-memory-api.onrender.com',
]);

const developmentOrigins = Object.freeze([
  'http://localhost:3000',
  'http://localhost:5000',
]);

export const getAllowedOrigins = (nodeEnvironment = process.env.NODE_ENV) =>
  nodeEnvironment === 'production' ? productionOrigins : developmentOrigins;

export const createCorsOptions = (nodeEnvironment = process.env.NODE_ENV) => {
  const allowedOrigins = getAllowedOrigins(nodeEnvironment);

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  };
};

export const createCorsMiddleware = (nodeEnvironment = process.env.NODE_ENV) =>
  cors(createCorsOptions(nodeEnvironment));

export const createSecurityHeadersMiddleware = () => helmet();
