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
    const { message, history, customerId, userId } = req.body || {};

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

    let verifiedCustomerId = null;
    if (customerId !== undefined && customerId !== null) {
      if (typeof customerId !== 'string' || !customerId.trim()) {
        return errorResponse(
          res,
          'Customer ID must be a non-empty string if provided.',
          400,
          'VALIDATION_ERROR'
        );
      }
      verifiedCustomerId = customerId.trim();
    } else if (!userId) {
      // Default customer identity for Customer Support Agent
      verifiedCustomerId = 'customer_001';
    }

    // Validate legacy userId if provided
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
      customerId: verifiedCustomerId,
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
        customerId: agentResult.customerId || verifiedCustomerId || null,
        memory: agentResult.memory || null,
        knowledge: agentResult.knowledge || null,
        outcome: agentResult.outcome || null,
        toolCalls: agentResult.toolCalls || [],
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Safe endpoint to fetch remembered customer support details from Hindsight
 * GET /api/chat/memory/:customerId
 */
export async function getCustomerMemoryHandler(req, res, next) {
  try {
    const { customerId } = req.params;
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return errorResponse(res, 'Customer ID must be a non-empty string.', 400, 'VALIDATION_ERROR');
    }

    const { hindsightService } = await import('../services/memory/hindsight.service.js');
    const recallResult = await hindsightService.recallMemory({
      customerId: customerId.trim(),
      query: 'environment operating system browser previous issue resolution successful failed troubleshooting preference communication style technical level',
    });

    const items = (recallResult?.memories || [])
      .map((m) => (typeof m === 'string' ? m : m.text || m.content || ''))
      .filter(Boolean);

    const preferences = [];
    const successfulResolutions = [];
    const failedAttempts = [];
    const environmentFacts = [];
    const issueFacts = [];

    for (const text of items) {
      const lower = text.toLowerCase();
      if (
        lower.includes('customer preference:') ||
        lower.includes('troubleshooting_style') ||
        lower.includes('communication_style') ||
        lower.includes('technical_level')
      ) {
        preferences.push(text);
      } else if (lower.includes('successfully resolved') || lower.includes('resolution:')) {
        successfulResolutions.push(text);
      } else if (
        lower.includes('did not resolve') ||
        lower.includes('failed to resolve') ||
        lower.includes('failed troubleshooting')
      ) {
        failedAttempts.push(text);
      } else if (
        lower.includes('windows') ||
        lower.includes('chrome') ||
        lower.includes('macos') ||
        lower.includes('browser')
      ) {
        environmentFacts.push(text);
      } else if (lower.includes('crash') || lower.includes('issue') || lower.includes('error')) {
        issueFacts.push(text);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        customerId: customerId.trim(),
        hasMemory: items.length > 0,
        memoryCount: items.length,
        items,
        preferences,
        successfulResolutions,
        failedAttempts,
        environmentFacts,
        issueFacts,
      },
    });
  } catch (_error) {
    return res.status(200).json({
      success: true,
      data: {
        customerId: req.params?.customerId || null,
        hasMemory: false,
        memoryCount: 0,
        items: [],
        preferences: [],
        successfulResolutions: [],
        failedAttempts: [],
        environmentFacts: [],
        issueFacts: [],
      },
    });
  }
}
