import winston from 'winston';
import { config } from '../config';

/**
 * Logger configurado com Winston
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bot-instagram-forefy' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ...metadata }) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
              msg += ` ${JSON.stringify(metadata, null, 2)}`;
            }
            return msg;
          }
        )
      ),
    }),
    // File output para erros
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    // File output para todos os logs
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

/**
 * Logger específico para o Instagram API
 */
export const instagramLogger = logger.child({
  component: 'instagram-api',
});

/**
 * Logger específico para o AI Agent
 */
export const agentLogger = logger.child({
  component: 'ai-agent',
});

/**
 * Logger específico para o Vector Store
 */
export const vectorLogger = logger.child({
  component: 'vector-store',
});
