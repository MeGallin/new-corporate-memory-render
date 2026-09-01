import dotenv from 'dotenv';

export const loadEnvironment = ({
  path = './config.env',
  processEnv = process.env,
} = {}) =>
  dotenv.config({
    path,
    processEnv,
    quiet: true,
    override: false,
  });
