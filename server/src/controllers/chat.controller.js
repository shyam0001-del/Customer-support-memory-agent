import { agentService } from '../services/agent/agent.service.js';
import { userService } from '../services/user/user.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Handle incoming chat message through the Agent Loop (Phase 3)
 * POST /api/chat
 * Body: { message: string, history?: Array<{role: string, content: string}>, userId?: string }
 */
export async function handleChatMessage(req, res, next) {
  try {
    const { message, history, userId } = req.body || {};

    if (!message && (!history || !Array.isArray(history) || history.length === 0)) {
      return errorResponse(
        res,
        'Invalid request: "message" string is required in request body.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (message && typeof message !== 'string') {
      return errorResponse(
        res,
        '"message" field must be a valid non-empty string.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const trimmedMessage = message ? message.trim() : '';
    if (!trimmedMessage && (!history || history.length === 0)) {
      return errorResponse(
        res,
        'Message cannot be blank.',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate userId if provided
    let verifiedUserId = null;
    if (userId) {
      if (typeof userId !== 'string' || !userId.trim()) {
        return errorResponse(res, 'User ID must be a non-empty string if provided.', 400, 'VALIDATION_ERROR');
      }

      const user = await userService.getUserById(userId.trim());
      if (!user) {
        return errorResponse(res, `User with ID "${userId}" was not found.`, 404, 'USER_NOT_FOUND');
      }

      verifiedUserId = user.id;
    }

    // Execute through Agent Service
    const agentResult = await agentService.run({
      message: trimmedMessage,
      history: Array.isArray(history) ? history : [],
      userId: verifiedUserId,
    });

    return res.status(200).json({
      success: true,
      message: agentResult.message,
      data: {
        message: agentResult.message,
        model: agentResult.model,
        usage: agentResult.usage,
        iterations: agentResult.iterations,
        toolCalls: agentResult.toolCalls || [],
      },
    });
  } catch (error) {
    next(error);
  }
}
