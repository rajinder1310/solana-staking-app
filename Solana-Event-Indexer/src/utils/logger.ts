/**
 * @file Logger Utility
 * Configures and exports a Winston logger instance for application-wide logging.
 */

import winston from 'winston';

/**
 * Log levels definition.
 * 0: error (highest priority)
 * 4: debug (lowest priority)
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Color configuration for each log level.
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

/**
 * Custom log format combinator.
 * Includes timestamp, colorization, and a specific print format.
 */
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

/**
 * Transports definition.
 * Currently only logs to the Console.
 */
const transports = [
  new winston.transports.Console(),
];

/**
 * Configured Winston logger instance.
 * Reads LOG_LEVEL from environment variables, defaults to 'info'.
 */
export const logger = winston.createLogger({
  level: 'debug', // Changed to debug

  levels,
  format,
  transports,
});

/**
 * Helper function to log messages with a standardized program prefix.
 * @param programName Name of the program (e.g., 'token-program')
 * @param message The message to log
 * @param level Log level (default: 'info')
 */
export const logProgram = (programName: string, message: string, level: string = 'info') => {
  logger.log(level, `[${programName}] ${message}`);
};
