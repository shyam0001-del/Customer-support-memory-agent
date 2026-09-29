/**
 * CloudDesk Support Outcome Detection & Resolution Learning Service (Phase 3)
 * Deterministically analyzes customer feedback to identify troubleshooting outcomes
 * and format durable resolution memories for Hindsight.
 */

export const RESOLVED_PHRASES = [
  'that fixed it',
  'its working now',
  'that solved the problem',
  'that solved it',
  'works now',
  'working now',
  'problem is gone',
  'resolved',
  'that did the trick',
  'it works now',
  'fixed it',
  'that worked',
  'issue is resolved',
  'problem is resolved',
  'all good now',
  'working perfectly now',
  'fixed the problem',
  'fixed the issue',
];

export const FAILED_PHRASES = [
  'still broken',
  'didnt work',
  'did not work',
  'still crashing',
  'same problem',
  'that didnt fix it',
  'that did not fix it',
  'still having the issue',
  'didnt help',
  'did not help',
  'still not working',
  'didnt fix it',
  'did not fix it',
  'still failing',
  'no luck',
  'crash continues',
];

export const TROUBLESHOOTING_STEPS = [
  {
    canonical: 'clearing browser cache',
    keywords: [
      'clearing the browser cache',
      'clear the browser cache',
      'clearing browser cache',
      'clear browser cache',
      'cleared browser cache',
      'clearing the cache',
      'clear the cache',
      'clearing cache',
      'clear cache',
      'cleared cache',
      'browser cache',
      'cache',
      'site data',
      'local storage',
      'cookies',
      'cookie',
    ],
  },
  {
    canonical: 'disabling Chrome extensions',
    keywords: [
      'disabling chrome extensions',
      'disable chrome extensions',
      'disabled chrome extensions',
      'chrome extensions',
      'chrome extension',
    ],
  },
  {
    canonical: 'disabling browser extensions',
    keywords: [
      'disabling browser extensions',
      'disable browser extensions',
      'disabled browser extensions',
      'disabling extensions',
      'disable extensions',
      'disabled extensions',
      'browser extensions',
      'browser extension',
      'extensions',
      'extension',
      'ad blocker',
      'adblocker',
      'ad-blocker',
      'plugin',
      'plugins',
    ],
  },
  {
    canonical: 'testing in private/incognito window',
    keywords: [
      'private window',
      'incognito window',
      'incognito',
      'private browsing',
      'inprivate',
    ],
  },
  {
    canonical: 'disabling hardware acceleration',
    keywords: [
      'hardware acceleration',
      'gpu acceleration',
    ],
  },
  {
    canonical: 'checking browser compatibility',
    keywords: [
      'check browser compatibility',
      'checking browser compatibility',
      'browser compatibility',
      'supported browser',
      'unsupported browser',
      'browser version',
    ],
  },
  {
    canonical: 'updating browser',
    keywords: [
      'update browser',
      'updating browser',
      'upgrade browser',
      'browser update',
    ],
  },
  {
    canonical: 'refreshing application',
    keywords: [
      'refresh page',
      'refreshing page',
      'hard refresh',
      'refresh application',
      'refreshing application',
      'page reload',
      'reload',
    ],
  },
  {
    canonical: 'restarting application',
    keywords: [
      'restart application',
      'restarting application',
      'restart',
      'reboot',
    ],
  },
  {
    canonical: 'retrying login',
    keywords: [
      'retry login',
      'retrying login',
      're-login',
      'log in again',
      'logging in again',
    ],
  },
  {
    canonical: 'reducing report date range filter',
    keywords: [
      'date range',
      'filter',
      'report filter',
    ],
  },
];

/**
 * Normalizes text for phrase matching
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matches a troubleshooting step inside arbitrary text
 * @param {string} text
 * @returns {string|null}
 */
export function matchStepInText(text = '') {
  const clean = normalizeText(text);
  if (!clean) return null;

  for (const step of TROUBLESHOOTING_STEPS) {
    for (const kw of step.keywords) {
      const cleanKw = normalizeText(kw);
      if (!cleanKw) continue;
      if (clean.includes(cleanKw)) {
        return step.canonical;
      }
    }
  }
  return null;
}

/**
 * Extracts attempted troubleshooting step with strict customer-priority:
 * 1. Customer's explicit statement in userMessage takes top priority.
 * 2. If outcome is failed and customer did NOT state an explicit step, returns null (never invents a step from assistant history).
 * 3. If outcome is resolved and customer used a confirmation phrase ("That fixed it"), looks at assistant's recent recommendation in history.
 *
 * @param {string} userMessage
 * @param {Array<Object>} [history=[]]
 * @param {string|null} [outcome=null]
 * @returns {string|null}
 */
export function extractAttemptedStep(userMessage = '', history = [], outcome = null) {
  // 1. Customer's explicit statement takes top priority
  const customerStep = matchStepInText(userMessage);
  if (customerStep) {
    return customerStep;
  }

  // 2. If the outcome is failed, and customer did not explicitly state a step in userMessage,
  // do NOT invent a step from an earlier assistant recommendation.
  if (outcome === 'failed') {
    return null;
  }

  // 3. For successful resolution confirmations without an explicit step (e.g. "That fixed it"),
  // look at the assistant's previous troubleshooting recommendation in history.
  if (outcome === 'resolved' || !outcome) {
    const assistantHistory = history
      .filter((m) => m.role === 'assistant')
      .slice(-2)
      .map((m) => m.content)
      .join(' ');

    const assistantStep = matchStepInText(assistantHistory);
    if (assistantStep) {
      if (assistantStep === 'disabling Chrome extensions') {
        return 'disabling browser extensions';
      }
      return assistantStep;
    }

    if (outcome === 'resolved') {
      return 'recommended troubleshooting step';
    }
  }

  return null;
}

/**
 * Extracts target issue from conversation
 * @param {string} userMessage
 * @param {Array<Object>} history
 * @returns {string}
 */
export function extractIssue(userMessage = '', history = []) {
  const combined = (
    userMessage +
    ' ' +
    (history.map((m) => m.content).join(' ') || '')
  ).toLowerCase();

  if (combined.includes('login') || combined.includes('crash')) {
    return 'login crash';
  }
  if (combined.includes('dashboard') || combined.includes('widget')) {
    return 'dashboard loading failure';
  }
  if (combined.includes('report') || combined.includes('analytics') || combined.includes('export')) {
    return 'reports loading failure';
  }

  return 'technical application issue';
}

export class SupportOutcomeService {
  /**
   * Deterministically detect outcome from user feedback
   * @param {Object} params
   * @param {string} params.userMessage
   * @param {Array<Object>} [params.history]
   * @returns {{outcome: 'resolved' | 'failed' | 'unknown', confidence: 'high' | 'none', matchedPhrase: string | null, attemptedStep: string | null, issue: string}}
   */
  detectOutcome({ userMessage = '', history = [] }) {
    const clean = normalizeText(userMessage);

    if (!clean) {
      return {
        outcome: 'unknown',
        confidence: 'none',
        matchedPhrase: null,
        attemptedStep: null,
        issue: extractIssue(userMessage, history),
      };
    }

    // Check for matching failure phrases
    let bestFail = null;
    let failIndex = -1;
    for (const phrase of FAILED_PHRASES) {
      const idx = clean.indexOf(phrase);
      if (idx !== -1 && (failIndex === -1 || idx < failIndex)) {
        bestFail = phrase;
        failIndex = idx;
      }
    }

    // Check for matching resolution phrases
    let bestResolved = null;
    let resolvedIndex = -1;
    for (const phrase of RESOLVED_PHRASES) {
      const idx = clean.indexOf(phrase);
      if (idx !== -1 && (resolvedIndex === -1 || idx < resolvedIndex)) {
        bestResolved = phrase;
        resolvedIndex = idx;
      }
    }

    let outcome = 'unknown';
    let matchedPhrase = null;
    let confidence = 'none';

    if (bestFail && bestResolved) {
      // Both present (e.g. "Clearing the cache didn't fix it, but disabling extensions fixed the problem")
      // The later phrase represents the final conclusive outcome
      if (resolvedIndex > failIndex) {
        outcome = 'resolved';
        matchedPhrase = bestResolved;
        confidence = 'high';
      } else {
        outcome = 'failed';
        matchedPhrase = bestFail;
        confidence = 'high';
      }
    } else if (bestFail) {
      outcome = 'failed';
      matchedPhrase = bestFail;
      confidence = 'high';
    } else if (bestResolved) {
      outcome = 'resolved';
      matchedPhrase = bestResolved;
      confidence = 'high';
    }

    // If message is contrastive and final outcome is resolved, extract step from the resolution clause
    let stepTargetText = userMessage;
    if (bestFail && bestResolved && outcome === 'resolved') {
      const butIdx = userMessage.toLowerCase().indexOf('but');
      if (butIdx !== -1) {
        stepTargetText = userMessage.slice(butIdx);
      }
    }

    const attemptedStep = extractAttemptedStep(stepTargetText, history, outcome);
    const issue = extractIssue(userMessage, history);

    return {
      outcome,
      confidence,
      matchedPhrase,
      attemptedStep,
      issue,
    };
  }

  /**
   * Formulates a durable Hindsight memory payload for resolution learning
   * @param {Object} params
   * @param {string} params.outcome - 'resolved' | 'failed'
   * @param {string} params.issue
   * @param {string|null} params.attemptedStep
   * @param {Object} [params.environment]
   * @returns {{shouldRetain: boolean, type: string, content: string, tags: string[], metadata: Object} | null}
   */
  formatResolutionMemory({ outcome, issue, attemptedStep, environment = {} }) {
    if (!attemptedStep || attemptedStep === 'unknown') {
      return null;
    }

    const issueTag = (issue || 'support')
      .toLowerCase()
      .replace(/[^\w]/g, '_')
      .slice(0, 25);

    if (outcome === 'resolved') {
      const content = `Previous ${issue} was successfully resolved by ${attemptedStep}.`;
      const envStr =
        typeof environment === 'string'
          ? environment
          : environment && typeof environment === 'object'
          ? [environment.os, environment.browser].filter(Boolean).join(' ') || undefined
          : undefined;

      return {
        shouldRetain: true,
        type: 'successful_resolution',
        content,
        tags: ['successful_resolution', 'resolution', issueTag],
        metadata: {
          type: 'successful_resolution',
          issue: String(issue),
          attemptedStep: String(attemptedStep),
          result: 'resolved',
          ...(envStr ? { environment: envStr } : {}),
        },
      };
    }

    if (outcome === 'failed') {
      const content = `Troubleshooting step "${attemptedStep}" did not resolve ${issue}.`;
      return {
        shouldRetain: true,
        type: 'failed_resolution',
        content,
        tags: ['failed_resolution', 'failed_attempt', issueTag],
        metadata: {
          type: 'failed_resolution',
          issue,
          attemptedStep,
          result: 'failed',
        },
      };
    }

    return null;
  }
}

export const supportOutcomeService = new SupportOutcomeService();
