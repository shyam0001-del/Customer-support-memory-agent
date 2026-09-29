import { errorResponse } from '../utils/apiResponse.js';
import { securityService } from '../services/security/security.service.js';
import { config } from '../config/env.js';

/**
 * Centralized error-handling middleware
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const sanitized = securityService.sanitizeError(err, config.nodeEnv);

  // Log server-side with context without exposing secrets
  console.error(`[ERROR] [${req.method} ${req.originalUrl}] [${sanitized.code}]:`, sanitized.message);

  // Return clean, standardized client error without stack trace
  return errorResponse(res, sanitized.message, statusCode, sanitized.code);
}

/**
 * 404 Route Not Found handler
 */
export function notFoundHandler(req, res) {
  return errorResponse(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
}
