import { Router } from 'express';
import {
  getRolesHandler,
  getRoleRequirementsHandler,
  getPlacementAnalysisHandler,
} from '../controllers/placement.controller.js';

const router = Router();

/**
 * Development Placement Intelligence Endpoints
 * Note: Authentication is not yet implemented. userId is passed as param.
 */
router.get('/placement/roles', getRolesHandler);
router.get('/placement/roles/:role', getRoleRequirementsHandler);
router.get('/users/:userId/placement-analysis', getPlacementAnalysisHandler);

export default router;
