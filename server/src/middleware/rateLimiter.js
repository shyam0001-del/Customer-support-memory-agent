import { config } from '../config/env.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * In-Memory Rate Limiting Middleware (Phase 9)
 * Protects expensive agent, web search, and practice evaluation endpoints without Redis dependencies.
 */

class RateLimiter {
  constructor() {
    this.hits = new Map(); // key -> Array<timestamps>
    this.enabled = true;
  }

  /**
   * Reset all tracked request windows (used for test teardown)
   */
  reset() {
    this.hits.clear();
  }

  /**
   * Factory function returning Express rate limiter middleware
   * @param {Object} [options]
   * @param {number} [options.windowMs] - Window size in ms
   * @param {number} [options.max] - Max requests allowed within window
   * @param {string} [options.keyPrefix] - Prefix for rate limit buckets
   */
  createLimiter(options = {}) {
    const windowMs = options.windowMs || config.rateLimit?.windowMs || 60000;
    const max = options.max || config.rateLimit?.maxRequests || 60;
    const keyPrefix = options.keyPrefix || 'rl';

    return (req, res, next) => {
      // In test mode, allow skipping rate limits unless explicitly testing the limiter
      if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
        return next();
      }

      if (!this.enabled) {
        return next();
      }

      const clientIp =
        req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '127.0.0.1';

      const key = `${keyPrefix}:${clientIp}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Retrieve existing timestamps and purge ones outside current window
      let timestamps = this.hits.get(key) || [];
      timestamps = timestamps.filter((t) => t > windowStart);

      if (timestamps.length >= max) {
        return errorResponse(
          res,
          'Too many requests. Please try again later.',
          429,
          'RATE_LIMITED'
        );
      }

      timestamps.push(now);
      this.hits.set(key, timestamps);

      // Periodically clean up idle keys to prevent memory leak
      if (this.hits.size > 2000) {
        this._prune(now - windowMs);
      }

      next();
    };
  }

  /**
   * Internal cleaner for stale rate limit keys
   * @private
   */
  _prune(staleThreshold) {
    for (const [k, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => t > staleThreshold);
      if (valid.length === 0) {
        this.hits.delete(k);
      } else {
        this.hits.set(k, valid);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
