const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    http: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    http: 'cyan',
    info: 'green',
    debug: 'blue',
  },
};

winston.addColors(customLevels.colors);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${timestamp}] ${level}: ${message} ${metaString}`;
  })
);

const transports = [];

if (process.env.LOG_TO_CONSOLE !== 'false') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

if (process.env.LOG_TO_FILE === 'true') {
  transports.push(
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '5m',
      maxFiles: '3d',
      format: fileFormat,
    })
  );
}

const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  transports,
});

const requestLogger = (req, res, next) => {
  const origin = req.headers.origin || 'unknown';

  if (req.originalUrl.includes('metrics')) {
    return next();
  }

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    logger.http(
      `${req.method} ${req.originalUrl} from ${origin} status ${res.statusCode} - ${durationMs.toFixed(2)} ms`
    );
  });
  next();
};

module.exports = {
  logger,
  requestLogger,
};
