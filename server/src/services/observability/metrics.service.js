/**
 * In-Memory Metrics Service (Phase 9)
 * Process-level observability for agent executions, tool calls, and error tracking without external dependencies.
 */

export class MetricsService {
  constructor() {
    this.reset();
  }

  /**
   * Reset all metrics counters
   */
  reset() {
    this.startTime = Date.now();
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.totalLatencyMs = 0;
    this.toolCalls = {};
    this.toolFailures = {};
    this.categories = {
      webSearches: 0,
      ragSearches: 0,
      practiceSessions: 0,
      placementAnalyses: 0,
    };
    this.evaluationsRun = 0;
    this.lastEvaluationSummary = null;
  }

  /**
   * Record a completed agent request
   * @param {Object} params
   * @param {number} params.durationMs
   * @param {boolean} [params.success=true]
   */
  recordRequest({ durationMs = 0, success = true }) {
    this.totalRequests++;
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
    this.totalLatencyMs += Math.max(0, durationMs);
  }

  /**
   * Record a tool execution
   * @param {string} toolName
   * @param {boolean} [success=true]
   */
  recordToolCall(toolName, success = true) {
    if (!toolName || typeof toolName !== 'string') return;
    this.toolCalls[toolName] = (this.toolCalls[toolName] || 0) + 1;

    if (!success) {
      this.toolFailures[toolName] = (this.toolFailures[toolName] || 0) + 1;
    }

    // Category aggregations
    if (toolName === 'search_web') {
      this.categories.webSearches++;
    } else if (toolName === 'search_knowledge') {
      this.categories.ragSearches++;
    } else if (toolName.includes('practice')) {
      this.categories.practiceSessions++;
    } else if (toolName.includes('placement') || toolName.includes('readiness') || toolName.includes('gap')) {
      this.categories.placementAnalyses++;
    }
  }

  /**
   * Record an automated agent evaluation run
   * @param {Object} summary
   */
  recordEvaluationRun(summary = {}) {
    this.evaluationsRun++;
    this.lastEvaluationSummary = summary;
  }

  /**
   * Get formatted metrics snapshot
   * @returns {Object}
   */
  getMetricsSnapshot() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const averageLatencyMs = this.totalRequests > 0
      ? Math.round(this.totalLatencyMs / this.totalRequests)
      : 0;
    const successRate = this.totalRequests > 0
      ? Math.round((this.successfulRequests / this.totalRequests) * 100) / 100
      : 1.0;

    return {
      requests: {
        total: this.totalRequests,
        successful: this.successfulRequests,
        failed: this.failedRequests,
        successRate,
      },
      averageLatencyMs,
      toolCalls: { ...this.toolCalls },
      toolFailures: { ...this.toolFailures },
      categories: { ...this.categories },
      evaluationsRun: this.evaluationsRun,
      lastEvaluation: this.lastEvaluationSummary,
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    };
  }
}

export const metricsService = new MetricsService();
