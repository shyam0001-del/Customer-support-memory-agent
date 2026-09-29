import { Router } from 'express';
import { handleChatMessage, getCustomerMemoryHandler, resetDemoCustomerHandler } from '../controllers/chat.controller.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const chatLimiter = rateLimiter.createLimiter({ keyPrefix: 'chat' });

// POST /api/chat
router.post('/chat', chatLimiter, handleChatMessage);

// GET /api/chat/memory/:customerId (Safe customer memory summary for CloudDesk UI)
router.get('/chat/memory/:customerId', getCustomerMemoryHandler);

// POST /api/chat/demo/reset (Deterministic demo reset for clean presentations)
router.post('/chat/demo/reset', resetDemoCustomerHandler);

export default router;
