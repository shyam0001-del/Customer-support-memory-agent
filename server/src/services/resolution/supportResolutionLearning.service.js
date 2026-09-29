/**
 * CloudDesk Support Resolution Learning Service (Phase 6)
 * Deterministically derives customer-specific troubleshooting intelligence
 * from accumulated Hindsight memories and adapts solution prioritization.
 *
 * Prioritization order:
 * A. Customer-specific previously successful approach
 * B. Environment-specific previously successful approach
 * C. Known support-knowledge solutions (excluding known failures)
 * D. New / untried troubleshooting approaches
 *
 * Avoids repeating known failed approaches for the customer.
 */

import { TROUBLESHOOTING_STEPS } from '../support/supportOutcome.service.js';

export class SupportResolutionLearningService {
  /**
   * Normalizes a troubleshooting step into its canonical form
   * @param {string} stepText
   * @returns {string}
   */
  normalizeStep(stepText = '') {
    if (!stepText || typeof stepText !== 'string') return '';
    const clean = stepText.toLowerCase().trim();

    for (const step of TROUBLESHOOTING_STEPS) {
      if (clean === step.canonical.toLowerCase()) {
        return step.canonical;
      }
      for (const kw of step.keywords) {
        if (clean.includes(kw.toLowerCase())) {
          return step.canonical;
        }
      }
    }

    if (clean.includes('cache') || clean.includes('site data')) {
      return 'clearing browser cache';
    }
    if (clean.includes('extension')) {
      return 'disabling browser extensions';
    }
    if (clean.includes('incognito') || clean.includes('private')) {
      return 'testing in private/incognito window';
    }
    if (clean.includes('hardware acceleration') || clean.includes('gpu')) {
      return 'enabling hardware acceleration';
    }
    if (clean.includes('date filter') || clean.includes('date range') || clean.includes('30 days')) {
      return 'reducing report date range filter';
    }
    if (clean.includes('restart') && clean.includes('service')) {
      return 'restarting backend aggregation service';
    }

    return stepText.trim();
  }

  /**
   * Extracts structured troubleshooting intelligence from a customer's Hindsight memories
   * @param {Array<Object|string>} memories
   * @returns {Object}
   */
  extractLearningFromMemories(memories = []) {
    if (!Array.isArray(memories)) {
      memories = [];
    }

    const approachStats = new Map();
    const successfulResolutions = [];
    const failedAttempts = [];
    const environmentFacts = new Set();

    // Chronological order processing if timestamps exist
    const sortedMemories = [...memories].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp || a.metadata?.timestamp || 0).getTime();
      const timeB = new Date(b.createdAt || b.timestamp || b.metadata?.timestamp || 0).getTime();
      return timeA - timeB;
    });

    for (const mem of sortedMemories) {
      const text = typeof mem === 'string' ? mem : mem.text || mem.content || '';
      const textLower = text.toLowerCase();
      const metadata = (typeof mem === 'object' && mem.metadata) ? mem.metadata : {};
      const tags = (typeof mem === 'object' && Array.isArray(mem.tags)) ? mem.tags : [];

      // Detect environment facts
      if (textLower.includes('windows 11') || textLower.includes('windows 10') || textLower.includes('macos') || textLower.includes('linux')) {
        const osMatch = text.match(/(Windows\s+11|Windows\s+10|macOS|Linux)/i);
        if (osMatch) environmentFacts.add(osMatch[0]);
      }
      if (textLower.includes('chrome') || textLower.includes('firefox') || textLower.includes('edge') || textLower.includes('safari')) {
        const browserMatch = text.match(/(Chrome|Firefox|Edge|Safari)/i);
        if (browserMatch) environmentFacts.add(browserMatch[0]);
      }

      // Check for successful resolution
      const isSuccess =
        metadata.type === 'successful_resolution' ||
        metadata.result === 'resolved' ||
        tags.includes('successful_resolution') ||
        textLower.includes('successfully resolved by') ||
        textLower.includes('worked') ||
        textLower.includes('fixed by');

      // Check for failed resolution
      const isFailed =
        metadata.type === 'failed_resolution' ||
        metadata.result === 'failed' ||
        tags.includes('failed_resolution') ||
        tags.includes('failed_attempt') ||
        textLower.includes('did not resolve') ||
        textLower.includes('didn\'t fix it') ||
        textLower.includes('didn\'t resolve') ||
        textLower.includes('failed to resolve');

      let rawStep = metadata.attemptedStep || '';
      if (!rawStep) {
        // Extract step from text
        for (const step of TROUBLESHOOTING_STEPS) {
          if (step.keywords.some((kw) => textLower.includes(kw.toLowerCase()))) {
            rawStep = step.canonical;
            break;
          }
        }
      }

      const canonicalStep = this.normalizeStep(rawStep);
      const issue = metadata.issue || (textLower.includes('report') ? 'reports loading failure' : textLower.includes('login') ? 'login crash' : 'support issue');

      if (canonicalStep) {
        if (!approachStats.has(canonicalStep)) {
          approachStats.set(canonicalStep, {
            approach: canonicalStep,
            successCount: 0,
            failureCount: 0,
            latestOutcome: null,
            issues: new Set(),
            environments: new Set(),
          });
        }
        const stat = approachStats.get(canonicalStep);
        stat.issues.add(issue);
        if (metadata.environment) stat.environments.add(metadata.environment);

        if (isSuccess && !isFailed) {
          stat.successCount += 1;
          stat.latestOutcome = 'resolved';
          successfulResolutions.push({
            approach: canonicalStep,
            issue,
            environment: metadata.environment || '',
            content: text,
          });
        } else if (isFailed) {
          stat.failureCount += 1;
          stat.latestOutcome = 'failed';
          failedAttempts.push({
            approach: canonicalStep,
            issue,
            environment: metadata.environment || '',
            content: text,
          });
        }
      }
    }

    const successfulApproaches = [];
    const failedApproaches = [];

    for (const [approach, stat] of approachStats.entries()) {
      // If latest outcome is resolved, or successes > failures, mark as successful approach
      if (stat.latestOutcome === 'resolved' || (stat.successCount > 0 && stat.failureCount === 0)) {
        successfulApproaches.push({
          approach,
          successCount: stat.successCount,
          failureCount: stat.failureCount,
          latestOutcome: stat.latestOutcome,
        });
      } else if (stat.latestOutcome === 'failed' || stat.failureCount > 0) {
        failedApproaches.push({
          approach,
          successCount: stat.successCount,
          failureCount: stat.failureCount,
          latestOutcome: stat.latestOutcome,
        });
      }
    }

    return {
      totalMemories: memories.length,
      environment: Array.from(environmentFacts).join(' · ') || 'Not specified',
      approachStats: Array.from(approachStats.values()).map((s) => ({
        ...s,
        issues: Array.from(s.issues),
        environments: Array.from(s.environments),
      })),
      successfulApproaches,
      failedApproaches,
      successfulResolutions,
      failedAttempts,
    };
  }

  /**
   * Adaptive solution prioritization based on customer Hindsight intelligence
   * @param {Object} params
   * @param {string} params.issue
   * @param {string} [params.environment]
   * @param {Array<Object>} [params.knowledgeDocs=[]]
   * @param {Array<Object|string>} [params.memories=[]]
   * @returns {Object}
   */
  prioritizeSolutions({ issue = '', environment = '', knowledgeDocs = [], memories = [] }) {
    const learned = this.extractLearningFromMemories(memories);
    const cleanIssue = (issue || '').toLowerCase();
    const cleanEnv = (environment || '').toLowerCase();

    // 1. Approaches to strictly avoid (known failed attempts for this customer)
    const avoidedSteps = [];
    for (const fa of learned.failedApproaches) {
      avoidedSteps.push(fa.approach);
    }

    // 2. Previously successful approaches for this customer
    // Must NOT be in the avoided list (handles cases where a step later failed: TEST 9 & 10)
    const candidateSuccessful = learned.successfulApproaches.filter(
      (sa) => !avoidedSteps.includes(sa.approach) && sa.latestOutcome !== 'failed'
    );

    let customerSuccessApproach = null;
    let envSuccessApproach = null;

    for (const sa of candidateSuccessful) {
      const stat = learned.approachStats.find((s) => s.approach === sa.approach);
      const matchesIssue = !cleanIssue || stat?.issues?.some((i) => i.toLowerCase().includes(cleanIssue) || cleanIssue.includes(i.toLowerCase()));
      const matchesEnv = cleanEnv && stat?.environments?.some((e) => cleanEnv.includes(e.toLowerCase()) || e.toLowerCase().includes(cleanEnv));

      if (matchesIssue && matchesEnv) {
        envSuccessApproach = sa.approach;
        break;
      }
      if (matchesIssue && !customerSuccessApproach) {
        customerSuccessApproach = sa.approach;
      }
    }

    if (!customerSuccessApproach && candidateSuccessful.length > 0) {
      customerSuccessApproach = candidateSuccessful[0].approach;
    }

    // 3. Extract solutions from Support Knowledge docs, excluding avoided steps
    const knowledgeSteps = [];
    for (const doc of knowledgeDocs) {
      const content = (doc.content || '').toLowerCase();
      for (const step of TROUBLESHOOTING_STEPS) {
        const canonical = step.canonical;
        if (
          step.keywords.some((kw) => content.includes(kw.toLowerCase())) &&
          !avoidedSteps.includes(canonical) &&
          !knowledgeSteps.includes(canonical)
        ) {
          knowledgeSteps.push(canonical);
        }
      }
    }

    // 4. Assemble prioritized steps order
    const prioritizedSteps = [];
    let priorityOrder = 'new_attempt';
    let primaryRecommendation = null;
    let rationale = '';

    if (envSuccessApproach) {
      prioritizedSteps.push(envSuccessApproach);
      primaryRecommendation = envSuccessApproach;
      priorityOrder = 'environment_success';
      rationale = `Previously resolved ${issue || 'this issue'} for this customer in ${environment}.`;
    } else if (customerSuccessApproach) {
      prioritizedSteps.push(customerSuccessApproach);
      primaryRecommendation = customerSuccessApproach;
      priorityOrder = 'customer_success';
      rationale = `Previously successful for this customer on ${issue || 'similar issues'}.`;
    } else if (knowledgeSteps.length > 0) {
      prioritizedSteps.push(...knowledgeSteps);
      primaryRecommendation = knowledgeSteps[0];
      priorityOrder = 'knowledge_base';
      rationale = avoidedSteps.length > 0
        ? `Official CloudDesk procedure selected because prior attempt (${avoidedSteps.join(', ')}) failed.`
        : 'Official CloudDesk verified troubleshooting procedure.';
    } else {
      // Fallback untried standard steps
      const fallbackDefaults = [
        'reducing report date range filter',
        'enabling hardware acceleration',
        'testing in private/incognito window',
        'clearing browser cache',
      ];
      for (const fb of fallbackDefaults) {
        if (!avoidedSteps.includes(fb) && !prioritizedSteps.includes(fb)) {
          prioritizedSteps.push(fb);
        }
      }
      primaryRecommendation = prioritizedSteps[0] || 'contacting engineering tier 2';
      priorityOrder = 'new_attempt';
      rationale = 'Standard verified procedure; avoids all known customer failure attempts.';
    }

    // Ensure remaining knowledge steps are appended
    for (const ks of knowledgeSteps) {
      if (!prioritizedSteps.includes(ks)) {
        prioritizedSteps.push(ks);
      }
    }

    return {
      primaryRecommendation,
      priorityOrder,
      prioritizedSteps,
      avoidedSteps,
      rationale,
      learnedIntelligence: learned,
    };
  }

  /**
   * Formulates deterministic adaptive prompt directives for the LLM agent
   * @param {Object} prioritization
   * @returns {string}
   */
  generateAdaptiveDirective(prioritization) {
    if (!prioritization) return '';

    const lines = ['[ADAPTIVE TROUBLESHOOTING INTELLIGENCE & SOLUTION PRIORITIZATION]:'];

    if (prioritization.primaryRecommendation) {
      lines.push(
        `- Primary Recommended Approach: "${prioritization.primaryRecommendation}" (Priority: ${prioritization.priorityOrder.toUpperCase()})`
      );
      lines.push(`- Decision Rationale: ${prioritization.rationale}`);
    }

    if (prioritization.avoidedSteps && prioritization.avoidedSteps.length > 0) {
      lines.push(
        `- STRICTLY AVOID Previously Failed Approaches: ${prioritization.avoidedSteps.map((s) => `"${s}"`).join(', ')}`
      );
      lines.push(
        `  (CRITICAL: The customer's memory indicates these steps failed in previous sessions. Do NOT suggest or recommend them again.)`
      );
    }

    if (prioritization.prioritizedSteps && prioritization.prioritizedSteps.length > 1) {
      lines.push(
        `- Next Untried Fallback Steps: ${prioritization.prioritizedSteps.slice(1).map((s) => `"${s}"`).join(' -> ')}`
      );
    }

    lines.push(
      'DIRECTIVE: Lead with the Primary Recommended Approach. Explain why this approach is recommended based on prior verified success or why prior failed steps are skipped.'
    );

    return lines.join('\n');
  }

  /**
   * Formats compact learned behavior data for API responses and frontend panel
   * @param {Array<Object|string>} memories
   * @returns {Object}
   */
  deriveLearnedBehavior(memories = []) {
    const learned = this.extractLearningFromMemories(memories);

    const successfulSummary = learned.successfulApproaches.map((sa) => ({
      approach: sa.approach,
      count: sa.successCount,
      text: `${sa.approach} worked ${sa.successCount} time${sa.successCount > 1 ? 's' : ''}`,
    }));

    const failedSummary = learned.failedApproaches.map((fa) => ({
      approach: fa.approach,
      count: fa.failureCount,
      text: `${fa.approach} failed ${fa.failureCount} time${fa.failureCount > 1 ? 's' : ''}`,
    }));

    const adaptationRules = [];
    if (successfulSummary.length > 0) {
      adaptationRules.push('Prioritizes previously successful solutions');
    }
    if (failedSummary.length > 0) {
      adaptationRules.push('Avoids repeated failed attempts');
    }
    if (adaptationRules.length === 0) {
      adaptationRules.push('Adapts recommendations based on ongoing interaction feedback');
    }

    return {
      hasLearning: successfulSummary.length > 0 || failedSummary.length > 0,
      successfulApproaches: successfulSummary,
      failedApproaches: failedSummary,
      environment: learned.environment,
      adaptationSummary: adaptationRules,
    };
  }
}

export const supportResolutionLearningService = new SupportResolutionLearningService();
