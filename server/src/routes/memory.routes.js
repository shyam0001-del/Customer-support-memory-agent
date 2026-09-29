import { Router } from 'express';
import {
  getMemoriesHandler,
  createMemoryHandler,
  updateMemoryHandler,
  deleteMemoryHandler,
} from '../controllers/memory.controller.js';

const router = Router();

/**
 * Development-only Memory Management Endpoints
 * Note: Authentication is not yet implemented. userId is passed as param.
 */
router.get('/users/:userId/memories', getMemoriesHandler);
router.post('/users/:userId/memories', createMemoryHandler);
router.patch('/memories/:memoryId', updateMemoryHandler);
router.delete('/memories/:memoryId', deleteMemoryHandler);

export default router;
