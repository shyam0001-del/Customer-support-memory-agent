import { randomUUID } from 'crypto';

/**
 * Lightweight request logger satisfying Section 19:
 * Logs: Request ID, Endpoint, Duration, Errors without sensitive data
 */
export function requestLogger(req, res, next) {
  const requestId = randomUUID().slice(0, 8);
  req.id = requestId;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    console.log(`[REQ ${requestId}] ${method} ${originalUrl} -> ${statusCode} (${duration}ms)`);
  });

  next();
}
