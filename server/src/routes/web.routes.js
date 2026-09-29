import express from 'express';
import { searchWebHandler } from '../controllers/web.controller.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const webLimiter = rateLimiter.createLimiter({ keyPrefix: 'web' });

/**
 * Web Intelligence & Search Routes (Phase 8)
 * Development-only endpoints
 */
router.post('/web/search', webLimiter, searchWebHandler);

export default router;
