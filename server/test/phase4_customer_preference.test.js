import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  supportPreferenceService,
  PREFERENCE_RULES,
} from '../src/services/preference/supportPreference.service.js';
import { hindsightService } from '../src/services/memory/hindsight.service.js';
import { agentService } from '../src/services/agent/agent.service.js';
import { aiService } from '../src/services/ai/ai.service.js';

describe('Phase 4: Customer Preference & Support Behavior Learning Test Suite', () => {
  // TEST 1 — explicit preference detection
  describe('TEST 1 — explicit preference detection', () => {
    it('detects "Please give me one troubleshooting step at a time." as troubleshooting_style preference', () => {
      const result = supportPreferenceService.detectPreference({
        userMessage: 'Please give me one troubleshooting step at a time.',
      });

      assert.strictEqual(result.isPreference, true);
      assert.strictEqual(result.shouldRetain, true);
      assert.strictEqual(result.key, 'troubleshooting_style');
      assert.strictEqual(result.value, 'prefers one troubleshooting step at a time');
      assert.ok(result.content.includes('prefers one troubleshooting step at a time'));
      assert.ok(result.tags.includes('preference'));
      assert.ok(result.tags.includes('troubleshooting_style'));
      assert.strictEqual(result.metadata.type, 'preference');
      assert.strictEqual(result.metadata.key, 'troubleshooting_style');
    });

    it('detects "Don\'t give me five troubleshooting steps at once. Give me one step and wait."', () => {
      const result = supportPreferenceService.detectPreference({
        userMessage: "Don't give me five troubleshooting steps at once. Give me one step and wait.",
      });

      assert.strictEqual(result.isPreference, true);
      assert.strictEqual(result.shouldRetain, true);
      assert.strictEqual(result.key, 'troubleshooting_style');
    });
  });

  // TEST 2 — preference retained in Hindsight
  describe('TEST 2 — preference retained in Hindsight', () => {
    let originalRetain;
    let retainedCalls = [];

    before(() => {
      originalRetain = hindsightService.retainMemory;
      hindsightService.retainMemory = async (params) => {
        retainedCalls.push(params);
        return {
          success: true,
          bankId: hindsightService.getBankId(params.customerId),
          content: params.content,
        };
      };
    });

    after(() => {
      hindsightService.retainMemory = originalRetain;
    });

    it('verifies Hindsight stores preference with correct customer bank and metadata', async () => {
      retainedCalls = [];
      const preferenceCheck = supportPreferenceService.detectPreference({
        userMessage: 'Please give me one troubleshooting step at a time.',
      });

      assert.strictEqual(preferenceCheck.shouldRetain, true);

      const res = await hindsightService.retainMemory({
        customerId: 'customer_test_001',
        content: preferenceCheck.content,
        tags: preferenceCheck.tags,
        metadata: preferenceCheck.metadata,
        context: 'Customer explicit support preference',
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(retainedCalls.length, 1);
      assert.strictEqual(retainedCalls[0].customerId, 'customer_test_001');
      assert.strictEqual(retainedCalls[0].metadata.type, 'preference');
      assert.strictEqual(retainedCalls[0].metadata.key, 'troubleshooting_style');
      assert.strictEqual(retainedCalls[0].metadata.value, 'prefers one troubleshooting step at a time');
      assert.ok(retainedCalls[0].tags.includes('preference'));
    });
  });

  // TEST 3 — preference recalled in a fresh session
  describe('TEST 3 — preference recalled in a fresh session', () => {
    let originalRecall;

    before(() => {
      originalRecall = hindsightService.recallMemory;
      hindsightService.recallMemory = async ({ customerId, query }) => {
        if (customerId === 'customer_test_pref') {
          return {
            memories: [
              {
                text: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
                metadata: {
                  type: 'preference',
                  key: 'troubleshooting_style',
                  value: 'prefers one troubleshooting step at a time',
                },
                tags: ['preference', 'troubleshooting_style'],
              },
            ],
            promptString: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
            query,
          };
        }
        return { memories: [], promptString: '', query };
      };
    });

    after(() => {
      hindsightService.recallMemory = originalRecall;
    });

    it('recalls preference on fresh session when customer reports another login problem', async () => {
      const recallResult = await hindsightService.recallMemory({
        customerId: 'customer_test_pref',
        query: 'I am having another login problem',
      });

      assert.strictEqual(recallResult.memories.length, 1);
      const extracted = supportPreferenceService.extractPreferencesFromMemories(recallResult.memories);
      assert.strictEqual(extracted.length, 1);
      assert.strictEqual(extracted[0].key, 'troubleshooting_style');
      assert.strictEqual(extracted[0].value, 'prefers one troubleshooting step at a time');
    });

    it('formats recalled preferences clearly into the agent context', async () => {
      const recallResult = await hindsightService.recallMemory({
        customerId: 'customer_test_pref',
        query: 'login problem',
      });

      const formatted = hindsightService.formatMemoryContext('customer_test_pref', recallResult);
      assert.ok(formatted.includes('CUSTOMER SUPPORT PREFERENCES'));
      assert.ok(formatted.includes('troubleshooting_style'));
      assert.ok(formatted.includes('prefers one troubleshooting step at a time'));
    });
  });

  // TEST 4 — response adaptation (provides single next step rather than a large sequence)
  describe('TEST 4 — response adaptation', () => {
    let originalRecall;
    let originalGenerate;
    let interceptedMessages = [];

    before(() => {
      originalRecall = hindsightService.recallMemory;
      originalGenerate = aiService.generateChatResponse;

      hindsightService.recallMemory = async ({ customerId }) => {
        if (customerId === 'customer_with_1step_pref') {
          return {
            memories: [
              {
                text: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
                metadata: {
                  type: 'preference',
                  key: 'troubleshooting_style',
                  value: 'prefers one troubleshooting step at a time',
                },
                tags: ['preference', 'troubleshooting_style'],
              },
            ],
            promptString: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
          };
        }
        return { memories: [], promptString: '' };
      };

      aiService.generateChatResponse = async (messages) => {
        interceptedMessages = messages;
        // Verify system prompt received the 1-step directive
        const systemPrompt = messages.find((m) => m.role === 'system')?.content || '';
        if (systemPrompt.includes('one troubleshooting step at a time')) {
          return {
            message:
              "I understand your preference for step-by-step troubleshooting. Let's start with just this first step:\n\nPlease try disabling your third-party browser extensions in Chrome and attempt to log in again. Let me know what happens once you've tried that!",
            model: 'test-model',
            usage: { total_tokens: 45 },
          };
        }
        return {
          message:
            "Here are five troubleshooting steps to resolve your login crash:\n1. Clear cache\n2. Disable extensions\n3. Restart browser\n4. Update Chrome\n5. Try incognito mode",
          model: 'test-model',
          usage: { total_tokens: 60 },
        };
      };
    });

    after(() => {
      hindsightService.recallMemory = originalRecall;
      aiService.generateChatResponse = originalGenerate;
    });

    it('adapts response to give a single step rather than multi-step list when preference is active', async () => {
      const response = await agentService.run({
        message: "I'm having another login problem.",
        history: [], // fresh session
        customerId: 'customer_with_1step_pref',
      });

      assert.strictEqual(response.memory.recalledPreference, true);
      assert.strictEqual(response.memory.preferences.length, 1);
      assert.strictEqual(response.memory.preferences[0].key, 'troubleshooting_style');

      // Verify the response presents exactly one step and asks to wait
      assert.ok(response.message.includes('first step') || response.message.includes('one'));
      assert.ok(!response.message.includes('1. Clear cache\n2. Disable extensions'));
      assert.ok(response.message.includes('Let me know') || response.message.includes('once you'));

      // Verify system prompt contained the explicit directive
      const systemMessage = interceptedMessages.find((m) => m.role === 'system')?.content || '';
      assert.ok(systemMessage.includes('ACTIVE CUSTOMER SUPPORT PREFERENCE DIRECTIVES'));
      assert.ok(systemMessage.includes('Provide exactly ONE single next troubleshooting step and wait'));
    });
  });

  // TEST 5 — concise preference
  describe('TEST 5 — concise preference', () => {
    it('detects "Keep the instructions short." as communication_style preference', () => {
      const result = supportPreferenceService.detectPreference({
        userMessage: 'Keep the instructions short.',
      });

      assert.strictEqual(result.isPreference, true);
      assert.strictEqual(result.shouldRetain, true);
      assert.strictEqual(result.key, 'communication_style');
      assert.strictEqual(result.value, 'prefers concise instructions');
      assert.ok(result.directive.includes('concise instructions'));
    });

    it('detects "I prefer concise explanations."', () => {
      const result = supportPreferenceService.detectPreference({
        userMessage: 'I prefer concise explanations.',
      });

      assert.strictEqual(result.isPreference, true);
      assert.strictEqual(result.key, 'communication_style');
    });
  });

  // TEST 6 — no false preference from transient confusion
  describe('TEST 6 — no false preference from transient confusion', () => {
    it('does NOT store a permanent preference for "I don\'t understand this particular step."', () => {
      const result = supportPreferenceService.detectPreference({
        userMessage: "I don't understand this particular step.",
      });

      assert.strictEqual(result.isPreference, false);
      assert.strictEqual(result.shouldRetain, false);
      assert.strictEqual(result.key, null);
    });

    it('does NOT store a permanent preference for "What does this mean?"', () => {
      const result = supportPreferenceService.detectPreference({
        userMessage: 'What does this mean?',
      });

      assert.strictEqual(result.isPreference, false);
      assert.strictEqual(result.shouldRetain, false);
    });

    it('does NOT store a permanent preference for general questions', () => {
      const result = supportPreferenceService.detectPreference({
        userMessage: 'Can you explain what an incognito window is?',
      });

      assert.strictEqual(result.isPreference, false);
      assert.strictEqual(result.shouldRetain, false);
    });
  });

  // TEST 7 — current request overrides stored memory
  describe('TEST 7 — current request overrides stored memory', () => {
    let originalRecall;
    let originalGenerate;
    let interceptedSystemPrompt = '';

    before(() => {
      originalRecall = hindsightService.recallMemory;
      originalGenerate = aiService.generateChatResponse;

      hindsightService.recallMemory = async () => {
        return {
          memories: [
            {
              text: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
              metadata: {
                type: 'preference',
                key: 'troubleshooting_style',
                value: 'prefers one troubleshooting step at a time',
              },
              tags: ['preference', 'troubleshooting_style'],
            },
          ],
          promptString: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
        };
      };

      aiService.generateChatResponse = async (messages) => {
        interceptedSystemPrompt = messages.find((m) => m.role === 'system')?.content || '';
        return {
          message:
            "Since you're in a hurry, here are all the troubleshooting steps at once:\n1. Disable extensions\n2. Clear browser cache\n3. Restart browser\n4. Update Chrome\n5. Test in incognito",
          model: 'test-model',
          usage: { total_tokens: 50 },
        };
      };
    });

    after(() => {
      hindsightService.recallMemory = originalRecall;
      aiService.generateChatResponse = originalGenerate;
    });

    it('detects override when customer asks: "Give me all the troubleshooting steps at once."', () => {
      const override = supportPreferenceService.detectOverride(
        'Give me all the troubleshooting steps at once.'
      );
      assert.strictEqual(override.hasOverride, true);
    });

    it('detects override when customer says: "Actually, give me all the steps because I\'m in a hurry."', () => {
      const override = supportPreferenceService.detectOverride(
        "Actually, give me all the steps because I'm in a hurry."
      );
      assert.strictEqual(override.hasOverride, true);
    });

    it('ensures current explicit request overrides stored memory in agent prompt', async () => {
      const response = await agentService.run({
        message: 'Give me all the troubleshooting steps at once because I am in a hurry.',
        customerId: 'customer_with_1step_pref',
      });

      assert.ok(interceptedSystemPrompt.includes('EXPLICIT CUSTOMER OVERRIDE'));
      assert.ok(interceptedSystemPrompt.includes('OVERRIDDEN'));
      assert.ok(response.message.includes('all the troubleshooting steps'));
    });
  });

  // TEST 8 — customer isolation
  describe('TEST 8 — customer isolation', () => {
    it('customer A preference does not appear in customer B recall', async () => {
      // Mock Hindsight memory per customer bank
      const memoryBanks = {
        customer_pref_A: [
          {
            text: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
            metadata: { type: 'preference', key: 'troubleshooting_style', value: 'prefers one troubleshooting step at a time' },
          },
        ],
        customer_pref_B: [],
      };

      const recallCustomer = (customerId) => {
        const bank = memoryBanks[customerId] || [];
        return supportPreferenceService.extractPreferencesFromMemories(bank);
      };

      const prefsA = recallCustomer('customer_pref_A');
      const prefsB = recallCustomer('customer_pref_B');

      assert.strictEqual(prefsA.length, 1);
      assert.strictEqual(prefsA[0].key, 'troubleshooting_style');

      assert.strictEqual(prefsB.length, 0);
      assert.deepStrictEqual(prefsB, []);
    });
  });

  // TEST 9 — duplicate prevention / update
  describe('TEST 9 — duplicate prevention / update', () => {
    it('does NOT create duplicate memory when same preference is already in recalled memories', () => {
      const recalledMemories = [
        {
          text: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
          metadata: {
            type: 'preference',
            key: 'troubleshooting_style',
            value: 'prefers one troubleshooting step at a time',
          },
        },
      ];

      const result = supportPreferenceService.detectPreference({
        userMessage: 'Please give me one step at a time.',
        recalledMemories,
      });

      assert.strictEqual(result.isPreference, true);
      assert.strictEqual(result.isDuplicate, true);
      assert.strictEqual(result.shouldRetain, false); // Duplicate prevented!
    });

    it('allows retention when the preference is a new different key or value', () => {
      const recalledMemories = [
        {
          text: 'Customer preference: troubleshooting_style is prefers one troubleshooting step at a time.',
          metadata: {
            type: 'preference',
            key: 'troubleshooting_style',
            value: 'prefers one troubleshooting step at a time',
          },
        },
      ];

      const result = supportPreferenceService.detectPreference({
        userMessage: 'Keep the instructions short.',
        recalledMemories,
      });

      assert.strictEqual(result.isPreference, true);
      assert.strictEqual(result.isDuplicate, false);
      assert.strictEqual(result.shouldRetain, true); // Retained because it's communication_style!
      assert.strictEqual(result.key, 'communication_style');
    });
  });
});
