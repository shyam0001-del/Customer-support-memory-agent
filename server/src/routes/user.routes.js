import { Router } from 'express';
import {
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
} from '../controllers/user.controller.js';

const router = Router();

router.post('/users', createUserHandler);
router.get('/users/:id', getUserHandler);
router.patch('/users/:id', updateUserHandler);
router.delete('/users/:id', deleteUserHandler);

export default router;
