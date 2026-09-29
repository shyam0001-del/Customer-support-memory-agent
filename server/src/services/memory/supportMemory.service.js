/**
 * Support Memory Extraction Service (Phase 1)
 * Deterministic extraction and filtering of durable customer support knowledge.
 * Filters out filler, greetings, and secrets, retaining only high-value customer facts:
 * - Environment (OS, browser, app version)
 * - Specific issue / problem descriptions
 * - Troubleshooting steps and confirmed resolutions
 */

const FILLER_PATTERNS = [
  /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b/i,
  /^(thanks|thank\s+you|thx|ok|okay|cool|got\s+it|bye|goodbye|see\s+ya)\b/i,
  /^(help|can\s+you\s+help\s+me|i\s+need\s+help)\b/i,
  /^(test|testing|ping)\b/i,
];

const SECRET_PATTERNS = [
  /(password|passwd|pwd)\s*(is|[:=])\s*[^\s,]+/gi,
  /(api[_-]?key|secret[_-]?key|auth[_-]?token|bearer)\s*(is|[:=])\s*[^\s,]+/gi,
  /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,
  /\b[A-Za-z0-9_-]{32,}\b/g,
];

/**
 * Remove sensitive credentials from text
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

/**
 * Determine if a user message is temporary conversational filler
 * @param {string} text
 * @returns {boolean}
 */
export function isConversationalFiller(text) {
  const trimmed = text.trim();
  if (trimmed.length < 4) return true;
  for (const pattern of FILLER_PATTERNS) {
    if (pattern.test(trimmed) && trimmed.split(/\s+/).length <= 4) {
      return true;
    }
  }
  return false;
}

/**
 * Extract structured customer facts from conversation turn
 * @param {Object} params
 * @param {string} params.userMessage
 * @param {string} params.assistantResponse
 * @returns {{ shouldRetain: boolean, content?: string, tags?: string[], metadata?: Object }}
 */
export function extractSupportMemory({ userMessage, assistantResponse = '' }) {
  if (!userMessage || typeof userMessage !== 'string') {
    return { shouldRetain: false };
  }

  const cleanUserMessage = sanitizeText(userMessage.trim());

  if (isConversationalFiller(cleanUserMessage)) {
    return { shouldRetain: false };
  }

  const detectedEnvironment = [];
  const detectedIssues = [];
  const detectedResolutions = [];
  const tags = new Set();

  // OS detection
  if (/\bwindows\s*11\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('Windows 11');
    tags.add('os');
  } else if (/\bwindows\s*10\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('Windows 10');
    tags.add('os');
  } else if (/\b(macos|mac\s*os|macbook|mac)\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('macOS');
    tags.add('os');
  } else if (/\b(ubuntu|linux)\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('Linux');
    tags.add('os');
  }

  // Browser detection
  if (/\bchrome\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('Google Chrome');
    tags.add('browser');
  } else if (/\bfirefox\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('Mozilla Firefox');
    tags.add('browser');
  } else if (/\bsafari\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('Safari');
    tags.add('browser');
  } else if (/\bedge\b/i.test(cleanUserMessage)) {
    detectedEnvironment.push('Microsoft Edge');
    tags.add('browser');
  }

  // Issue signals
  if (/crash(ing|ed|es)?\s*(after|on|during)?\s*(login|logging\s*in)?/i.test(cleanUserMessage)) {
    detectedIssues.push('Application crashes after user login');
    tags.add('issue');
    tags.add('login');
  } else if (/login\s*(problem|issue|error|fails)/i.test(cleanUserMessage)) {
    detectedIssues.push('Login authentication / failure issue');
    tags.add('issue');
    tags.add('login');
  } else if (/slow|lag|freez(e|ing)|unresponsive/i.test(cleanUserMessage)) {
    detectedIssues.push('Performance lag / freezing');
    tags.add('issue');
    tags.add('performance');
  } else if (/blank\s*screen|white\s*screen|black\s*screen/i.test(cleanUserMessage)) {
    detectedIssues.push('Blank screen on launch');
    tags.add('issue');
  }

  // Resolution signals
  if (/(fixed|resolved|works\s+now|solved|working\s+now)/i.test(cleanUserMessage)) {
    detectedResolutions.push(`Resolution confirmed by customer: "${cleanUserMessage}"`);
    tags.add('resolution');
  }

  // If environment, issues, or resolutions were detected
  if (detectedEnvironment.length > 0 || detectedIssues.length > 0 || detectedResolutions.length > 0) {
    const parts = [];
    if (detectedEnvironment.length > 0) {
      parts.push(`Customer Environment: ${detectedEnvironment.join(', ')}`);
    }
    if (detectedIssues.length > 0) {
      parts.push(`Reported Issue: ${detectedIssues.join('; ')}`);
    }
    if (detectedResolutions.length > 0) {
      parts.push(`Resolution Status: ${detectedResolutions.join('; ')}`);
    }

    // Include sanitized original customer context summary
    parts.push(`Customer statement: "${cleanUserMessage}"`);

    return {
      shouldRetain: true,
      content: parts.join('. '),
      tags: Array.from(tags),
      metadata: {
        environment: detectedEnvironment.join(', ') || 'unspecified',
        hasResolution: detectedResolutions.length > 0 ? 'true' : 'false',
      },
    };
  }

  // Fallback: If message contains substantive technical context (>= 8 words)
  const words = cleanUserMessage.split(/\s+/);
  if (words.length >= 8 && /(error|failed|issue|problem|bug|device|version|install|account)/i.test(cleanUserMessage)) {
    return {
      shouldRetain: true,
      content: `Customer support note: "${cleanUserMessage}"`,
      tags: ['support_note'],
      metadata: {
        environment: 'unspecified',
      },
    };
  }

  return { shouldRetain: false };
}
