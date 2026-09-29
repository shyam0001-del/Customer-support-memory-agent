/**
 * CloudDesk Customer Support Preference Service (Phase 4)
 * Deterministically detects, extracts, formats, and manages customer-specific
 * support preferences (e.g. troubleshooting style, communication style, technical level).
 */

import { normalizeText } from '../support/supportOutcome.service.js';

export const PREFERENCE_RULES = [
  {
    key: 'troubleshooting_style',
    value: 'prefers one troubleshooting step at a time',
    display: 'One troubleshooting step at a time',
    directive:
      'Customer prefers one troubleshooting step at a time. Provide exactly ONE single next troubleshooting step and wait for customer feedback. Do NOT provide a numbered list or multiple steps at once.',
    patterns: [
      /\b(one\s+troubleshooting\s+step\s+at\s+a\s+time|one\s+step\s+at\s+a\s+time|give\s+me\s+one\s+step|dont\s+give\s+me\s+(too\s+many|multiple|five|5|all\s+the)\s+steps|one\s+at\s+a\s+time|step\s+by\s+step\s+and\s+wait|one\s+step\s+and\s+wait|don'?t\s+want\s+a\s+long\s+list)\b/i,
    ],
  },
  {
    key: 'communication_style',
    value: 'prefers concise instructions',
    display: 'Prefers concise instructions',
    directive:
      'Customer prefers concise instructions. Keep response brief, direct, and free of unnecessary filler or pleasantries.',
    patterns: [
      /\b(prefer\s+concise|keep\s+the\s+instructions\s+short|keep\s+instructions\s+short|keep\s+it\s+short|keep\s+it\s+brief|be\s+brief|be\s+concise|short\s+explanations|brief\s+instructions)\b/i,
    ],
  },
  {
    key: 'technical_level',
    value: 'advanced / skip basic explanations',
    display: 'Advanced technical background',
    directive:
      'Customer has an advanced technical background. Skip basic fundamental explanations and provide direct technical diagnostic actions.',
    patterns: [
      /\b(i'?m\s+technical|i\s+am\s+technical|skip\s+the\s+basics|skip\s+basic\s+explanations|skip\s+the\s+basic\s+steps|software\s+engineer|developer|technical\s+background)\b/i,
    ],
  },
  {
    key: 'technical_level',
    value: 'detailed explanations',
    display: 'Needs detailed explanations',
    directive:
      'Customer prefers thorough, detailed explanations for every troubleshooting step.',
    patterns: [
      /\b(need\s+detailed\s+explanations|explain\s+in\s+detail|detailed\s+explanations|walk\s+me\s+through\s+in\s+detail)\b/i,
    ],
  },
];

const NON_PREFERENCE_PATTERNS = [
  /^(i\s+don'?t\s+understand|what\s+does\s+this\s+mean|can\s+you\s+explain\s+what|clarify\s+this)\b/i,
  /\bi\s+don'?t\s+understand\s+(this|the)\s+(particular\s+)?step\b/i,
];

const OVERRIDE_PATTERNS = [
  /\b(give\s+me\s+all\s+(the\s+)?(troubleshooting\s+)?steps|all\s+at\s+once|all\s+steps\s+at\s+once|give\s+me\s+five\s+steps|in\s+a\s+hurry|list\s+all\s+steps|all\s+steps\s+because\s+i'?m\s+in\s+a\s+hurry)\b/i,
];

export class SupportPreferenceService {
  /**
   * Deterministically detects if a user message expresses an explicit customer support preference
   * @param {Object} params
   * @param {string} params.userMessage
   * @param {Array<Object|string>} [params.recalledMemories=[]]
   * @returns {{
   *   isPreference: boolean,
   *   shouldRetain: boolean,
   *   isDuplicate: boolean,
   *   key: string|null,
   *   value: string|null,
   *   display: string|null,
   *   directive: string|null,
   *   content: string|null,
   *   tags: string[],
   *   metadata: Object|null
   * }}
   */
  detectPreference({ userMessage = '', recalledMemories = [] }) {
    if (!userMessage || typeof userMessage !== 'string') {
      return {
        isPreference: false,
        shouldRetain: false,
        isDuplicate: false,
        key: null,
        value: null,
        display: null,
        directive: null,
        content: null,
        tags: [],
        metadata: null,
      };
    }

    const trimmed = userMessage.trim();

    // Check negative filters: questions or confusion about a single step must NOT become durable preferences
    for (const pattern of NON_PREFERENCE_PATTERNS) {
      if (pattern.test(trimmed)) {
        return {
          isPreference: false,
          shouldRetain: false,
          isDuplicate: false,
          key: null,
          value: null,
          display: null,
          directive: null,
          content: null,
          tags: [],
          metadata: null,
        };
      }
    }

    // Match against known preference rules
    for (const rule of PREFERENCE_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          // Check for duplicate memory prevention:
          // If the customer's recalled memories already contain this exact preference key and value,
          // do NOT retain a duplicate memory entry.
          const isDuplicate = this.isDuplicatePreference(rule.key, rule.value, recalledMemories);

          const content = `Customer preference: ${rule.key} is ${rule.value}.`;

          return {
            isPreference: true,
            shouldRetain: !isDuplicate,
            isDuplicate,
            key: rule.key,
            value: rule.value,
            display: rule.display,
            directive: rule.directive,
            content,
            tags: ['preference', rule.key],
            metadata: {
              type: 'preference',
              key: rule.key,
              value: rule.value,
              confidence: 'high',
            },
          };
        }
      }
    }

    return {
      isPreference: false,
      shouldRetain: false,
      isDuplicate: false,
      key: null,
      value: null,
      display: null,
      directive: null,
      content: null,
      tags: [],
      metadata: null,
    };
  }

  /**
   * Checks whether the preference already exists in recalled memories
   * @param {string} key
   * @param {string} value
   * @param {Array<Object|string>} recalledMemories
   * @returns {boolean}
   */
  isDuplicatePreference(key, value, recalledMemories = []) {
    if (!Array.isArray(recalledMemories) || recalledMemories.length === 0) {
      return false;
    }

    const targetKey = (key || '').toLowerCase();
    const targetVal = (value || '').toLowerCase();

    for (const item of recalledMemories) {
      if (typeof item === 'object' && item !== null) {
        if (item.metadata?.type === 'preference') {
          if (
            (item.metadata.key || '').toLowerCase() === targetKey &&
            (item.metadata.value || '').toLowerCase() === targetVal
          ) {
            return true;
          }
        }
      }

      const text = typeof item === 'string' ? item : item.text || item.content || '';
      const lower = text.toLowerCase();
      if (lower.includes('preference:') && lower.includes(targetKey) && lower.includes(targetVal)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks whether the current user message explicitly overrides a stored preference
   * (e.g. customer stored 'one step at a time', but currently says "give me all the steps at once")
   * @param {string} userMessage
   * @returns {{hasOverride: boolean, overrideType: string|null}}
   */
  detectOverride(userMessage = '') {
    if (!userMessage || typeof userMessage !== 'string') {
      return { hasOverride: false, overrideType: null };
    }

    for (const pattern of OVERRIDE_PATTERNS) {
      if (pattern.test(userMessage.trim())) {
        return {
          hasOverride: true,
          overrideType: 'all_steps_requested',
        };
      }
    }

    return { hasOverride: false, overrideType: null };
  }

  /**
   * Helper alias accepting { userMessage } or string directly
   */
  detectCurrentRequestOverride(params = {}) {
    const msg = typeof params === 'string' ? params : params?.userMessage || '';
    return this.detectOverride(msg);
  }

  /**
   * Extracts clean structured preferences from recalled memories
   * @param {Array<Object|string>} memories
   * @returns {Array<{key: string, value: string, display: string, directive: string}>}
   */
  extractPreferencesFromMemories(memories = []) {
    if (!Array.isArray(memories) || memories.length === 0) {
      return [];
    }

    const seen = new Set();
    const result = [];

    for (const item of memories) {
      const text = typeof item === 'string' ? item : item.text || item.content || '';
      const lower = text.toLowerCase();

      // Check metadata first
      if (typeof item === 'object' && item?.metadata?.type === 'preference') {
        const k = item.metadata.key;
        const v = item.metadata.value;
        const dedupeId = `${k}:${v}`;
        if (!seen.has(dedupeId)) {
          seen.add(dedupeId);
          const matchedRule = PREFERENCE_RULES.find((r) => r.key === k && r.value === v);
          result.push({
            key: k,
            value: v,
            display: matchedRule ? matchedRule.display : v,
            directive: matchedRule ? matchedRule.directive : `Customer prefers ${v}.`,
          });
        }
        continue;
      }

      // Check text-based representation
      if (lower.includes('preference:') || lower.includes('customer preference')) {
        for (const rule of PREFERENCE_RULES) {
          if (lower.includes(rule.key.toLowerCase()) && lower.includes(rule.value.toLowerCase())) {
            const dedupeId = `${rule.key}:${rule.value}`;
            if (!seen.has(dedupeId)) {
              seen.add(dedupeId);
              result.push({
                key: rule.key,
                value: rule.value,
                display: rule.display,
                directive: rule.directive,
              });
            }
          }
        }
      }
    }

    return result;
  }
}

export const supportPreferenceService = new SupportPreferenceService();
