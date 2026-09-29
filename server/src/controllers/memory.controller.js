import { memoryService } from '../services/memory/memory.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/users/:userId/memories
 * Retrieve memories for a specific candidate
 */
export async function getMemoriesHandler(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId || typeof userId !== 'string') {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }

    const memories = await memoryService.getMemoriesByUser(userId.trim());
    return successResponse(res, memories, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/users/:userId/memories
 * Manually create/record a memory for a candidate (Development API)
 */
export async function createMemoryHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const { type, key, value, confidence, importance } = req.body || {};

    if (!userId) {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }

    const saved = await memoryService.createOrUpdateMemory({
      userId: userId.trim(),
      type,
      key,
      value,
      confidence,
      importance,
      source: 'api',
    });

    return successResponse(res, saved, 201);
  } catch (error) {
    if (error.message.includes('Invalid memory type') || error.message.includes('required')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    next(error);
  }
}

/**
 * PATCH /api/memories/:memoryId
 * Update memory record by memoryId
 */
export async function updateMemoryHandler(req, res, next) {
  try {
    const { memoryId } = req.params;
    if (!memoryId) {
      return errorResponse(res, 'Memory ID is required.', 400, 'VALIDATION_ERROR');
    }

    const { value, confidence, importance } = req.body || {};
    const updated = await memoryService.updateMemory(memoryId.trim(), {
      value,
      confidence,
      importance,
    });

    if (!updated) {
      return errorResponse(res, `Memory "${memoryId}" was not found.`, 404, 'MEMORY_NOT_FOUND');
    }

    return successResponse(res, updated, 200);
  } catch (error) {
    if (error.message.includes('must be')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    next(error);
  }
}

/**
 * DELETE /api/memories/:memoryId
 * Delete a memory record
 */
export async function deleteMemoryHandler(req, res, next) {
  try {
    const { memoryId } = req.params;
    if (!memoryId) {
      return errorResponse(res, 'Memory ID is required.', 400, 'VALIDATION_ERROR');
    }

    const deleted = await memoryService.deleteMemory(memoryId.trim());
    if (!deleted) {
      return errorResponse(res, `Memory "${memoryId}" was not found.`, 404, 'MEMORY_NOT_FOUND');
    }

    return successResponse(res, { deleted: true, memoryId }, 200);
  } catch (error) {
    next(error);
  }
}
