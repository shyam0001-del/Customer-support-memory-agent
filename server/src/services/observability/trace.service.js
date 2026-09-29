import crypto from 'crypto';

/**
 * Agent Request Tracing & Observability Service (Phase 9)
 * Tracks request correlation IDs, tool calls, iterations, token usage, and durations.
 */

export class TraceService {
  constructor(maxStoredTraces = 50) {
    this.maxStoredTraces = maxStoredTraces;
    this.traces = new Map(); // traceId -> trace object
  }

  /**
   * Start a new agent execution trace
   * @param {Object} params
   * @param {string} [params.requestId]
   * @param {string} [params.userId]
   * @param {string} [params.message]
   * @returns {Object} Active trace object
   */
  startTrace({ requestId = null, userId = null, message = '' } = {}) {
    const traceId = `trace_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanRequestId = requestId || `req_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const trace = {
      traceId,
      requestId: cleanRequestId,
      userId: userId || null,
      queryPreview: typeof message === 'string' ? message.slice(0, 80) : '',
      startTime: Date.now(),
      durationMs: 0,
      iterations: 0,
      toolCalls: [],
      tokens: {
        promptTokens: null,
        completionTokens: null,
        totalTokens: null,
      },
      status: 'in_progress',
      error: null,
      model: null,
      timestamp: new Date().toISOString(),
    };

    this.traces.set(traceId, trace);
    this.traces.set(cleanRequestId, trace);
    this._pruneOldTraces();

    return trace;
  }

  /**
   * Record a tool execution within an active trace
   * @param {string} traceId
   * @param {Object} toolExecution
   * @param {string} toolExecution.name
   * @param {number} toolExecution.durationMs
   * @param {boolean} toolExecution.success
   * @param {string} [toolExecution.status]
   */
  recordToolCall(traceId, { name, durationMs = 0, success = true, status = 'success' }) {
    const trace = this.getTrace(traceId);
    if (!trace) return;

    trace.toolCalls.push({
      name,
      durationMs,
      success,
      status: success ? 'success' : 'error',
    });
  }

  /**
   * Finalize and seal a trace with outcome data
   * @param {string} traceId
   * @param {Object} outcome
   */
  finalizeTrace(traceId, { status = 'success', iterations = 1, tokens = null, usage = null, model = null, error = null } = {}) {
    const trace = this.getTrace(traceId);
    if (!trace) return null;

    trace.durationMs = Date.now() - trace.startTime;
    trace.status = status;
    trace.iterations = iterations;
    trace.model = model || trace.model;

    const tokenData = tokens || usage;
    if (tokenData) {
      const parsed = {
        promptTokens: tokenData.promptTokens ?? tokenData.prompt_tokens ?? null,
        completionTokens: tokenData.completionTokens ?? tokenData.completion_tokens ?? null,
        totalTokens: tokenData.totalTokens ?? tokenData.total_tokens ?? null,
      };
      trace.tokens = parsed;
      trace.usage = parsed;
    } else {
      trace.usage = null;
    }

    if (error) {
      trace.error = {
        code: error.code || 'AGENT_ERROR',
        message: error.message || 'Agent error occurred',
      };
    }

    return trace;
  }

  /**
   * Retrieve a trace by its ID or requestId
   * @param {string} traceIdOrRequestId
   * @returns {Object|null}
   */
  getTrace(traceIdOrRequestId) {
    return this.traces.get(traceIdOrRequestId) || null;
  }

  /**
   * Get list of recent traces
   * @param {number} [limit=20]
   * @returns {Array<Object>}
   */
  getRecentTraces(limit = 20) {
    const all = Array.from(this.traces.values()).reverse();
    return all.slice(0, Math.min(limit, this.maxStoredTraces));
  }

  /**
   * Reset / clear stored traces
   */
  reset() {
    this.traces.clear();
  }

  /**
   * Keep memory bounded
   * @private
   */
  _pruneOldTraces() {
    if (this.traces.size > this.maxStoredTraces) {
      const keysToDelete = Array.from(this.traces.keys()).slice(0, this.traces.size - this.maxStoredTraces);
      for (const k of keysToDelete) {
        this.traces.delete(k);
      }
    }
  }
}

export const traceService = new TraceService();
