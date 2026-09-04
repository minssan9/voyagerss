import winston from 'winston';
import path from 'path';
import { configService } from '../../../../config/config-service';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message} ${info.stack || ''}`
  )
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

function buildTransports(): winston.transport[] {
  const level = configService.get('LOG_LEVEL', 'info')!;
  const transports: winston.transport[] = [
    new winston.transports.Console({ level, format }),
  ];

  if (process.env.NODE_ENV === 'production') {
    const logPath = configService.get('LOG_FILE_PATH', 'logs/app.log')!;
    transports.push(
      new winston.transports.File({
        filename: path.join(process.cwd(), logPath),
        level: 'info',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs/error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880,
        maxFiles: 5,
      })
    );
  }

  return transports;
}

function resolveLogLevel(): string {
  if (process.env.NODE_ENV === 'development') return 'debug';
  return configService.get('LOG_LEVEL', 'info')!;
}

export const logger = winston.createLogger({
  level: resolveLogLevel(),
  levels,
  format,
  transports: buildTransports(),
  exitOnError: false,
});

export function configureLoggerFromConfig(): void {
  logger.level = resolveLogLevel();
  logger.clear();
  for (const transport of buildTransports()) {
    logger.add(transport);
  }
}

export const morganStream = {
  write: (message: string) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};
