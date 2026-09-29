import { practiceService } from '../services/practice/practice.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * POST /api/practice/sessions
 * Start a new practice or mock interview session
 */
export async function createSessionHandler(req, res, next) {
  try {
    const { userId, mode, role, topic, difficulty, questionCount } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }

    const session = await practiceService.createSession({
      userId: userId.trim(),
      mode,
      role,
      topic,
      difficulty,
      questionCount,
    });

    return successResponse(res, session, 201);
  } catch (error) {
    if (
      error.message.includes('Invalid') ||
      error.message.includes('required') ||
      error.message.includes('between')
    ) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    next(error);
  }
}

/**
 * GET /api/practice/sessions/:sessionId
 * Retrieve a practice session by ID
 */
export async function getSessionHandler(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!sessionId) {
      return errorResponse(res, 'Session ID is required.', 400, 'VALIDATION_ERROR');
    }
    if (!userId) {
      return errorResponse(res, 'User ID is required via query param ?userId= or X-User-Id header.', 400, 'VALIDATION_ERROR');
    }

    const session = await practiceService.getSession(sessionId, userId);
    return successResponse(res, session, 200);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      return errorResponse(res, error.message, 404, 'SESSION_NOT_FOUND');
    }
    next(error);
  }
}

/**
 * POST /api/practice/sessions/:sessionId/answer
 * Submit an answer for the current question in a session
 */
export async function submitAnswerHandler(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { userId, answer } = req.body || {};

    if (!sessionId) {
      return errorResponse(res, 'Session ID is required.', 400, 'VALIDATION_ERROR');
    }
    if (!userId || typeof userId !== 'string') {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }
    if (!answer || typeof answer !== 'string') {
      return errorResponse(res, 'Answer must be a non-empty string.', 400, 'VALIDATION_ERROR');
    }

    const result = await practiceService.submitAnswer({
      sessionId,
      userId: userId.trim(),
      answer: answer.trim(),
    });

    return successResponse(res, result, 200);
  } catch (error) {
    if (
      error.message.includes('not found') ||
      error.message.includes('Access denied')
    ) {
      return errorResponse(res, error.message, 404, 'SESSION_NOT_FOUND');
    }
    if (
      error.message.includes('completed') ||
      error.message.includes('Invalid') ||
      error.message.includes('required')
    ) {
      return errorResponse(res, error.message, 400, 'INVALID_SESSION_STATE');
    }
    next(error);
  }
}

/**
 * POST /api/practice/sessions/:sessionId/complete
 * Conclude a practice session and generate performance summary
 */
export async function completeSessionHandler(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { userId } = req.body || {};
    const effectiveUserId = userId || req.query.userId || req.headers['x-user-id'];

    if (!sessionId) {
      return errorResponse(res, 'Session ID is required.', 400, 'VALIDATION_ERROR');
    }
    if (!effectiveUserId) {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }

    const result = await practiceService.completeSession(sessionId, effectiveUserId);
    return successResponse(res, result, 200);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Access denied')) {
      return errorResponse(res, error.message, 404, 'SESSION_NOT_FOUND');
    }
    next(error);
  }
}

/**
 * GET /api/users/:userId/practice-history
 * Retrieve session history for a candidate
 */
export async function getPracticeHistoryHandler(req, res, next) {
  try {
    const { userId } = req.params;
    const { limit, mode } = req.query;

    if (!userId || typeof userId !== 'string') {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    const history = await practiceService.getPracticeHistory(userId.trim(), {
      limit: isNaN(parsedLimit) ? 10 : parsedLimit,
      mode: mode && typeof mode === 'string' ? mode.trim() : undefined,
    });

    return successResponse(res, history, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/:userId/practice-weak-topics
 * Retrieve list of topics with weak performance
 */
export async function getPracticeWeakTopicsHandler(req, res, next) {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string') {
      return errorResponse(res, 'User ID is required.', 400, 'VALIDATION_ERROR');
    }

    const weakTopics = await practiceService.getWeakPracticeTopics(userId.trim());
    return successResponse(res, weakTopics, 200);
  } catch (error) {
    next(error);
  }
}
