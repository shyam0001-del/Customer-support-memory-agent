import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  supportResolutionLearningService,
  SupportResolutionLearningService,
} from '../src/services/resolution/supportResolutionLearning.service.js';
import { supportOutcomeService } from '../src/services/support/supportOutcome.service.js';
import { supportKnowledgeService } from '../src/services/knowledge/supportKnowledge.service.js';
import { supportPreferenceService } from '../src/services/preference/supportPreference.service.js';
import { hindsightService } from '../src/services/memory/hindsight.service.js';
import { agentService } from '../src/services/agent/agent.service.js';
import { aiService } from '../src/services/ai/ai.service.js';

describe('Phase 6: Adaptive Support Intelligence Test Suite', () => {
  let originalRetain;
  let originalRecall;
  let originalGenerate;
  let retainedCalls = [];
  let simulatedMemoriesByCustomer = new Map();

  before(() => {
    originalRetain = hindsightService.retainMemory;
    originalRecall = hindsightService.recallMemory;
    originalGenerate = aiService.generateChatResponse;

    hindsightService.retainMemory = async ({ customerId, content, tags, metadata, context }) => {
      retainedCalls.push({ customerId, content, tags, metadata, context });
      if (!simulatedMemoriesByCustomer.has(customerId)) {
        simulatedMemoriesByCustomer.set(customerId, []);
      }
      simulatedMemoriesByCustomer.get(customerId).push({
        id: `mem-${Date.now()}-${Math.random()}`,
        content,
        text: content,
        tags: tags || [],
        metadata: metadata || {},
        context: context || '',
        createdAt: new Date().toISOString(),
      });
      return { success: true, memoryId: 'test-mem-id', content };
    };

    hindsightService.recallMemory = async ({ customerId }) => {
      const list = simulatedMemoriesByCustomer.get(customerId) || [];
      return {
        success: true,
        memories: [...list],
        contextSummary: list.map((m) => m.content).join(' | '),
      };
    };

    aiService.generateChatResponse = async (messages) => {
      const userMsg = messages[messages.length - 1]?.content || '';
      const sysMsg = messages.find((m) => m.role === 'system')?.content || '';

      if (sysMsg.includes('Prioritizes previously successful solutions') || sysMsg.includes('clearing browser cache')) {
        return {
          message: 'Based on your previous success, I recommend clearing your browser cache as the first step.',
          model: 'gemini-test',
          usage: { promptTokens: 40, completionTokens: 20, totalTokens: 60 },
        };
      }

      return {
        message: 'Let us troubleshoot this issue step by step.',
        model: 'gemini-test',
        usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 },
      };
    };
  });

  after(() => {
    hindsightService.retainMemory = originalRetain;
    hindsightService.recallMemory = originalRecall;
    aiService.generateChatResponse = originalGenerate;
  });

  beforeEach(() => {
    retainedCalls = [];
    simulatedMemoriesByCustomer.clear();
  });

  // ==========================================
  // TEST 1 — Successful troubleshooting outcome is learned
  // ==========================================
  describe('TEST 1 — Successful troubleshooting outcome is learned', () => {
    it('detects and stores successful resolution when customer confirms cache clearing fixed it', async () => {
      const customerId = 'cust_p6_test1';
      const history = [
        { role: 'user', content: 'The analytics dashboard reports are failing to load.' },
        { role: 'assistant', content: 'Please try clearing your browser cache and cookies.' },
      ];

      const outcome = supportOutcomeService.detectOutcome({
        userMessage: 'The cache clearing fixed it! Everything is working now.',
        history,
      });

      assert.strictEqual(outcome.outcome, 'resolved');
      assert.strictEqual(outcome.attemptedStep, 'clearing browser cache');

      const response = await agentService.run({
        message: 'The cache clearing fixed it! Everything is working now.',
        customerId,
        history,
      });

      assert.strictEqual(response.outcome.detected, 'resolved');
      assert.strictEqual(response.outcome.attemptedStep, 'clearing browser cache');
      assert.strictEqual(response.memory.retained, true);

      // Verify retained memory content and metadata
      const retained = retainedCalls.find((r) => r.customerId === customerId);
      assert.ok(retained, 'Expected memory to be retained in Hindsight');
      assert.strictEqual(retained.metadata.type, 'successful_resolution');
      assert.strictEqual(retained.metadata.result, 'resolved');

      // Verify resolution learning extraction
      const customerMems = simulatedMemoriesByCustomer.get(customerId) || [];
      const learned = supportResolutionLearningService.extractLearningFromMemories(customerMems);
      assert.strictEqual(learned.successfulApproaches.length, 1);
      assert.strictEqual(learned.successfulApproaches[0].approach, 'clearing browser cache');
      assert.strictEqual(learned.successfulApproaches[0].successCount, 1);
    });
  });

  // ==========================================
  // TEST 2 — Fresh session retrieves the learned successful approach
  // ==========================================
  describe('TEST 2 — Fresh session retrieves the learned successful approach', () => {
    it('recalls learned successful approach on a fresh session with empty history', async () => {
      const customerId = 'cust_p6_test2';

      // Seed previous successful resolution memory
      simulatedMemoriesByCustomer.set(customerId, [
        {
          id: 'mem-101',
          content: 'Reports loading issue was successfully resolved by clearing browser cache on Windows 11 Chrome.',
          text: 'Reports loading issue was successfully resolved by clearing browser cache on Windows 11 Chrome.',
          tags: ['support_resolution', 'successful_resolution'],
          metadata: {
            type: 'successful_resolution',
            result: 'resolved',
            attemptedStep: 'clearing browser cache',
            issue: 'reports loading failure',
            environment: 'Windows 11 Chrome',
          },
          createdAt: new Date().toISOString(),
        },
      ]);

      // Fresh session: empty conversation history
      const response = await agentService.run({
        message: 'Hi, my reports page is having trouble loading again.',
        customerId,
        history: [],
      });

      assert.strictEqual(response.memory.recalled, true);
      assert.ok(response.adaptiveLearning);
      assert.strictEqual(response.adaptiveLearning.prioritized, true);
      assert.strictEqual(response.adaptiveLearning.primaryRecommendation, 'clearing browser cache');
      assert.strictEqual(response.adaptiveLearning.priorityOrder, 'customer_success');
    });
  });

  // ==========================================
  // TEST 3 — Previously successful approach is prioritized for the same/similar issue
  // ==========================================
  describe('TEST 3 — Previously successful approach is prioritized for the same/similar issue', () => {
    it('prioritizes customer-specific successful approach over generic defaults', () => {
      const memories = [
        {
          content: 'Customer issue reports loading failure was successfully resolved by clearing browser cache.',
          text: 'Customer issue reports loading failure was successfully resolved by clearing browser cache.',
          metadata: {
            type: 'successful_resolution',
            result: 'resolved',
            attemptedStep: 'clearing browser cache',
            issue: 'reports loading failure',
          },
        },
      ];

      const knowledgeDocs = supportKnowledgeService.search('reports not loading');
      const prioritization = supportResolutionLearningService.prioritizeSolutions({
        issue: 'reports loading failure',
        knowledgeDocs,
        memories,
      });

      assert.strictEqual(prioritization.priorityOrder, 'customer_success');
      assert.strictEqual(prioritization.primaryRecommendation, 'clearing browser cache');
      assert.strictEqual(prioritization.prioritizedSteps[0], 'clearing browser cache');
      assert.ok(prioritization.rationale.includes('Previously successful'));
    });

    it('prioritizes environment-specific successful approach when environment matches', () => {
      const memories = [
        {
          content: 'Resolved by clearing browser cache on Windows 11 Chrome.',
          text: 'Resolved by clearing browser cache on Windows 11 Chrome.',
          metadata: {
            type: 'successful_resolution',
            result: 'resolved',
            attemptedStep: 'clearing browser cache',
            environment: 'Windows 11 Chrome',
            issue: 'reports loading failure',
          },
        },
      ];

      const prioritization = supportResolutionLearningService.prioritizeSolutions({
        issue: 'reports loading failure',
        environment: 'Windows 11 Chrome',
        knowledgeDocs: [],
        memories,
      });

      assert.strictEqual(prioritization.priorityOrder, 'environment_success');
      assert.strictEqual(prioritization.primaryRecommendation, 'clearing browser cache');
      assert.ok(prioritization.rationale.includes('Windows 11 Chrome'));
    });
  });

  // ==========================================
  // TEST 4 — Previously failed approach is avoided when a valid alternative exists
  // ==========================================
  describe('TEST 4 — Previously failed approach is avoided when a valid alternative exists', () => {
    it('identifies previously failed step and avoids recommending it', () => {
      const memories = [
        {
          content: 'Troubleshooting attempt failed: disabling browser extensions did not resolve reports loading failure.',
          text: 'Troubleshooting attempt failed: disabling browser extensions did not resolve reports loading failure.',
          metadata: {
            type: 'failed_resolution',
            result: 'failed',
            attemptedStep: 'disabling browser extensions',
            issue: 'reports loading failure',
          },
        },
      ];

      const knowledgeDocs = [
        {
          title: 'Reports Troubleshooting Guide',
          content: 'First step: disabling browser extensions. Alternative step: clearing browser cache or reducing report date range.',
        },
      ];

      const prioritization = supportResolutionLearningService.prioritizeSolutions({
        issue: 'reports loading failure',
        knowledgeDocs,
        memories,
      });

      // Disabling extensions MUST be avoided
      assert.ok(prioritization.avoidedSteps.includes('disabling browser extensions'));
      assert.notStrictEqual(prioritization.primaryRecommendation, 'disabling browser extensions');
      // Alternative approach from knowledge / fallback selected
      assert.ok(
        prioritization.primaryRecommendation === 'clearing browser cache' ||
        prioritization.primaryRecommendation === 'reducing report date range'
      );
      assert.ok(!prioritization.prioritizedSteps.includes('disabling browser extensions'));
    });
  });

  // ==========================================
  // TEST 5 — Successful and failed approaches coexist correctly
  // ==========================================
  describe('TEST 5 — Successful and failed approaches coexist correctly', () => {
    it('accurately maintains multiple successful and failed approaches for the same customer', () => {
      const memories = [
        {
          content: 'Clearing browser cache worked.',
          metadata: { type: 'successful_resolution', result: 'resolved', attemptedStep: 'clearing browser cache' },
        },
        {
          content: 'Clearing browser cache worked.',
          metadata: { type: 'successful_resolution', result: 'resolved', attemptedStep: 'clearing browser cache' },
        },
        {
          content: 'Disabling browser extensions did not resolve the problem.',
          metadata: { type: 'failed_resolution', result: 'failed', attemptedStep: 'disabling browser extensions' },
        },
      ];

      const learned = supportResolutionLearningService.extractLearningFromMemories(memories);
      assert.strictEqual(learned.successfulApproaches.length, 1);
      assert.strictEqual(learned.successfulApproaches[0].approach, 'clearing browser cache');
      assert.strictEqual(learned.successfulApproaches[0].successCount, 2);

      assert.strictEqual(learned.failedApproaches.length, 1);
      assert.strictEqual(learned.failedApproaches[0].approach, 'disabling browser extensions');
      assert.strictEqual(learned.failedApproaches[0].failureCount, 1);

      const behavior = supportResolutionLearningService.deriveLearnedBehavior(memories);
      assert.strictEqual(behavior.hasLearning, true);
      assert.strictEqual(behavior.successfulApproaches[0].text, 'clearing browser cache worked 2 times');
      assert.strictEqual(behavior.failedApproaches[0].text, 'disabling browser extensions failed 1 time');
      assert.ok(behavior.adaptationSummary.includes('Prioritizes previously successful solutions'));
      assert.ok(behavior.adaptationSummary.includes('Avoids repeated failed attempts'));
    });
  });

  // ==========================================
  // TEST 6 — Customer-specific learning does not leak to another customer
  // ==========================================
  describe('TEST 6 — Customer-specific learning does not leak to another customer', () => {
    it('ensures Customer B does not inherit Customer A learned resolutions or avoided steps', async () => {
      const customerA = 'cust_A_isolated';
      const customerB = 'cust_B_isolated';

      // Customer A has learned memory: clearing cache succeeded, disabling extensions failed
      simulatedMemoriesByCustomer.set(customerA, [
        {
          id: 'mem-A-1',
          content: 'Issue resolved by clearing browser cache.',
          text: 'Issue resolved by clearing browser cache.',
          metadata: { type: 'successful_resolution', result: 'resolved', attemptedStep: 'clearing browser cache' },
        },
        {
          id: 'mem-A-2',
          content: 'Disabling browser extensions did not resolve.',
          text: 'Disabling browser extensions did not resolve.',
          metadata: { type: 'failed_resolution', result: 'failed', attemptedStep: 'disabling browser extensions' },
        },
      ]);

      // Customer B is a fresh customer with no memories
      simulatedMemoriesByCustomer.set(customerB, []);

      const recalledB = await hindsightService.recallMemory({ customerId: customerB });
      assert.strictEqual(recalledB.memories.length, 0);

      const learnedB = supportResolutionLearningService.extractLearningFromMemories(recalledB.memories);
      assert.strictEqual(learnedB.successfulApproaches.length, 0);
      assert.strictEqual(learnedB.failedApproaches.length, 0);

      const prioritizationB = supportResolutionLearningService.prioritizeSolutions({
        issue: 'reports loading failure',
        knowledgeDocs: [{ content: 'disabling browser extensions' }],
        memories: recalledB.memories,
      });

      // Customer B does NOT avoid disabling extensions because Customer B has no failed memory
      assert.strictEqual(prioritizationB.avoidedSteps.length, 0);
      assert.notStrictEqual(prioritizationB.priorityOrder, 'customer_success');
    });
  });

  // ==========================================
  // TEST 7 — Existing Phase 4 preference still influences behavior
  // ==========================================
  describe('TEST 7 — Existing Phase 4 preference still influences behavior', () => {
    it('applies stored preference directive alongside adaptive troubleshooting prioritization', async () => {
      const customerId = 'cust_p6_test7';

      // Customer has both a stored preference and a successful resolution
      simulatedMemoriesByCustomer.set(customerId, [
        {
          id: 'mem-pref-1',
          content: 'Customer preference: prefers one troubleshooting step at a time.',
          text: 'Customer preference: prefers one troubleshooting step at a time.',
          metadata: {
            type: 'preference',
            key: 'troubleshooting_style',
            value: 'prefers one troubleshooting step at a time',
          },
        },
        {
          id: 'mem-res-1',
          content: 'Reports issue successfully resolved by clearing browser cache.',
          text: 'Reports issue successfully resolved by clearing browser cache.',
          metadata: {
            type: 'successful_resolution',
            result: 'resolved',
            attemptedStep: 'clearing browser cache',
          },
        },
      ]);

      const response = await agentService.run({
        message: 'The reports are failing to load again.',
        customerId,
        history: [],
      });

      assert.strictEqual(response.memory.recalledPreference, true);
      assert.strictEqual(response.memory.preferences.length, 1);
      assert.strictEqual(response.memory.preferences[0].key, 'troubleshooting_style');
      assert.strictEqual(response.adaptiveLearning.prioritized, true);
      assert.strictEqual(response.adaptiveLearning.primaryRecommendation, 'clearing browser cache');
    });
  });

  // ==========================================
  // TEST 8 — Current explicit customer request overrides historical preference
  // ==========================================
  describe('TEST 8 — Current explicit customer request overrides historical preference', () => {
    it('allows explicit current request to override historical one-step preference', async () => {
      const customerId = 'cust_p6_test8';

      // Stored preference: one step at a time
      simulatedMemoriesByCustomer.set(customerId, [
        {
          id: 'mem-pref-2',
          content: 'Customer preference: prefers one troubleshooting step at a time.',
          text: 'Customer preference: prefers one troubleshooting step at a time.',
          metadata: {
            type: 'preference',
            key: 'troubleshooting_style',
            value: 'prefers one troubleshooting step at a time',
          },
        },
      ]);

      const currentMessage = 'Actually, give me all the steps at once.';
      const overrideCheck = supportPreferenceService.detectCurrentRequestOverride({
        userMessage: currentMessage,
      });

      assert.strictEqual(overrideCheck.hasOverride, true);
      assert.strictEqual(overrideCheck.overrideType, 'all_steps_requested');

      // Agent run handles override cleanly
      const response = await agentService.run({
        message: currentMessage,
        customerId,
        history: [],
      });

      assert.ok(response.message);
    });
  });

  // ==========================================
  // TEST 9 — A previously successful approach that later fails creates a new failed outcome
  // ==========================================
  describe('TEST 9 — A previously successful approach that later fails creates a new failed outcome', () => {
    it('records a failed outcome when an approach that worked before no longer resolves the problem', async () => {
      const customerId = 'cust_p6_test9';
      const history = [
        { role: 'user', content: 'The analytics report is blank again.' },
        { role: 'assistant', content: 'Try clearing your browser cache as we did last time.' },
      ];

      const outcome = supportOutcomeService.detectOutcome({
        userMessage: 'I cleared the browser cache like before, but this time it did not resolve the issue.',
        history,
      });

      assert.strictEqual(outcome.outcome, 'failed');
      assert.strictEqual(outcome.attemptedStep, 'clearing browser cache');

      const response = await agentService.run({
        message: 'I cleared the browser cache like before, but this time it did not resolve the issue.',
        customerId,
        history,
      });

      assert.strictEqual(response.outcome.detected, 'failed');
      assert.strictEqual(response.outcome.attemptedStep, 'clearing browser cache');

      // Verify failed resolution memory was retained
      const failedRetained = retainedCalls.find(
        (r) => r.customerId === customerId && r.metadata?.type === 'failed_resolution'
      );
      assert.ok(failedRetained, 'Expected failed_resolution memory to be retained');
      assert.strictEqual(failedRetained.metadata.result, 'failed');
      assert.strictEqual(failedRetained.metadata.attemptedStep, 'clearing browser cache');
    });
  });

  // ==========================================
  // TEST 10 — Future reasoning accounts for the updated outcome
  // ==========================================
  describe('TEST 10 — Future reasoning accounts for the updated outcome', () => {
    it('pivots away from previously successful approach once it is recorded as failed', () => {
      // Timeline:
      // 1. Session 1: clearing cache succeeded
      // 2. Session 2: clearing cache failed
      const chronologicalMemories = [
        {
          id: 'mem-time-1',
          content: 'Reports issue was successfully resolved by clearing browser cache.',
          text: 'Reports issue was successfully resolved by clearing browser cache.',
          metadata: {
            type: 'successful_resolution',
            result: 'resolved',
            attemptedStep: 'clearing browser cache',
          },
          createdAt: new Date('2026-09-01T10:00:00Z').toISOString(),
        },
        {
          id: 'mem-time-2',
          content: 'Troubleshooting attempt failed: clearing browser cache did not resolve reports loading failure.',
          text: 'Troubleshooting attempt failed: clearing browser cache did not resolve reports loading failure.',
          metadata: {
            type: 'failed_resolution',
            result: 'failed',
            attemptedStep: 'clearing browser cache',
          },
          createdAt: new Date('2026-09-02T10:00:00Z').toISOString(),
        },
      ];

      const learned = supportResolutionLearningService.extractLearningFromMemories(chronologicalMemories);
      // Because latest outcome was 'failed', it is placed into failed approaches
      assert.ok(learned.failedApproaches.some((f) => f.approach === 'clearing browser cache'));

      const knowledgeDocs = [
        {
          title: 'Reports Procedure',
          content: 'First step: clearing browser cache. Next step: reducing report date range to under 30 days.',
        },
      ];

      const prioritization = supportResolutionLearningService.prioritizeSolutions({
        issue: 'reports loading failure',
        knowledgeDocs,
        memories: chronologicalMemories,
      });

      // Must avoid clearing browser cache now!
      assert.ok(prioritization.avoidedSteps.includes('clearing browser cache'));
      assert.notStrictEqual(prioritization.primaryRecommendation, 'clearing browser cache');
      assert.strictEqual(prioritization.primaryRecommendation, 'reducing report date range filter');
    });
  });
});
