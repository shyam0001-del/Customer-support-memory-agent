import { Router } from 'express';
import { handleChatMessage } from '../controllers/chat.controller.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const chatLimiter = rateLimiter.createLimiter({ keyPrefix: 'chat' });

// POST /api/chat
router.post('/chat', chatLimiter, handleChatMessage);

export default router;
