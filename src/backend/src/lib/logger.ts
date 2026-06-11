/**
 * Logger utilities
 */

import type { Logger } from 'pino';

export interface LogContext {
  requestId?: string;
  userId?: string;
  workspaceId?: string;
  [key: string]: any;
}

export function createLogger(baseLogger: Logger, context: LogContext) {
  return baseLogger.child(context);
}

export function logError(logger: Logger, error: unknown, context?: LogContext) {
  const childLogger = context ? logger.child(context) : logger;

  if (error instanceof Error) {
    childLogger.error(
      {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      'Error occurred'
    );
  } else {
    childLogger.error({ error }, 'Unknown error');
  }
}

export function logInfo(logger: Logger, message: string, context?: LogContext) {
  const childLogger = context ? logger.child(context) : logger;
  childLogger.info(message);
}
