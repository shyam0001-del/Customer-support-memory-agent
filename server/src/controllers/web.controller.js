import { webSearchService } from '../services/web/webSearch.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * POST /api/web/search
 * Development-only endpoint to test web search integration directly
 */
export async function searchWebHandler(req, res, next) {
  try {
    const { query, limit, recencyDays, domain, intent } = req.body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
      return errorResponse(res, 'Search query is required.', 400, 'VALIDATION_ERROR');
    }

    const searchResult = await webSearchService.search({
      query: query.trim(),
      limit: limit ? Number(limit) : 5,
      recencyDays: recencyDays ? Number(recencyDays) : undefined,
      domain: domain && typeof domain === 'string' ? domain.trim() : undefined,
      intent: intent && typeof intent === 'string' ? intent.trim() : 'general',
    });

    return successResponse(res, searchResult, 200);
  } catch (err) {
    if (err.code === 'WEB_SEARCH_INVALID_QUERY') {
      return errorResponse(res, err.message, 400, 'VALIDATION_ERROR');
    }
    if (err.code === 'WEB_SEARCH_RATE_LIMITED') {
      return errorResponse(res, err.message, 429, 'RATE_LIMITED');
    }
    if (err.code === 'WEB_SEARCH_TIMEOUT') {
      return errorResponse(res, err.message, 504, 'GATEWAY_TIMEOUT');
    }
    next(err);
  }
}
