const winston = require('winston');
const path = require('path');

const { combine, timestamp, label, printf, colorize } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

const createLogger = (moduleName) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
      label({ label: moduleName }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      colorize(),
      myFormat
    ),
    transports: [new winston.transports.Console()],
  });
};

module.exports = createLogger;
