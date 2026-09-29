import { Router } from 'express';
import {
  createSessionHandler,
  getSessionHandler,
  submitAnswerHandler,
  completeSessionHandler,
  getPracticeHistoryHandler,
  getPracticeWeakTopicsHandler,
} from '../controllers/practice.controller.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const practiceLimiter = rateLimiter.createLimiter({ keyPrefix: 'practice' });

// Practice session routes
router.post('/practice/sessions', practiceLimiter, createSessionHandler);
router.get('/practice/sessions/:sessionId', getSessionHandler);
router.post('/practice/sessions/:sessionId/answer', practiceLimiter, submitAnswerHandler);
router.post('/practice/sessions/:sessionId/complete', practiceLimiter, completeSessionHandler);

// Candidate practice history & analytics
router.get('/users/:userId/practice-history', getPracticeHistoryHandler);
router.get('/users/:userId/practice-weak-topics', getPracticeWeakTopicsHandler);

export default router;
