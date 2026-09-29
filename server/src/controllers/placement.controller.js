import { placementIntelligenceService } from '../services/placement/placementIntelligence.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/placement/roles
 * Retrieve all roles available in the catalog
 */
export async function getRolesHandler(req, res, next) {
  try {
    const roles = placementIntelligenceService.getAvailableRoles();
    return successResponse(res, roles, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/placement/roles/:role
 * Retrieve structured requirements for a specific role
 */
export async function getRoleRequirementsHandler(req, res, next) {
  try {
    const { role } = req.params;
    if (!role || typeof role !== 'string') {
      return errorResponse(res, 'Role parameter is required.', 400, 'VALIDATION_ERROR');
    }

    try {
      const requirements = placementIntelligenceService.getRoleRequirements(role.trim());
      return successResponse(res, requirements, 200);
    } catch (catalogErr) {
      return errorResponse(res, catalogErr.message, 404, 'ROLE_NOT_FOUND');
    }
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:userId/placement-analysis
 * Analyze placement readiness for a candidate (Development endpoint)
 */
export async function getPlacementAnalysisHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = req.query;

    if (!userId || typeof userId !== 'string') {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }

    try {
      const analysis = await placementIntelligenceService.generatePlacementAnalysis({
        userId: userId.trim(),
        role: role && typeof role === 'string' ? role.trim() : null,
      });

      return successResponse(res, analysis, 200);
    } catch (analysisErr) {
      if (analysisErr.message.includes('not found') || analysisErr.message.includes('invalid')) {
        return errorResponse(res, analysisErr.message, 404, 'USER_NOT_FOUND');
      }
      return errorResponse(res, analysisErr.message, 400, 'ANALYSIS_ERROR');
    }
  } catch (error) {
    next(error);
  }
}
