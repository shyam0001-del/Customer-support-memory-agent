import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { supportKnowledgeService } from '../src/services/knowledge/supportKnowledge.service.js';
import { searchSupportKnowledgeTool } from '../src/services/tools/searchSupportKnowledge.tool.js';
import {
  supportOutcomeService,
  extractAttemptedStep,
  extractIssue,
} from '../src/services/support/supportOutcome.service.js';
import { hindsightService } from '../src/services/memory/hindsight.service.js';

describe('Phase 3: Support Knowledge + Resolution Learning Test Suite', () => {
  // 1. Support Knowledge Search
  describe('1. Support Knowledge Search', () => {
    it('returns login troubleshooting doc for login crash query', () => {
      const results = supportKnowledgeService.search('application keeps crashing after login');
      assert.ok(results.length > 0);
      assert.strictEqual(results[0].title, 'CloudDesk Login Troubleshooting');
      assert.strictEqual(results[0].source, 'CloudDesk Support Knowledge');
      assert.ok(results[0].content.includes('disable third-party browser extensions') || results[0].content.includes('extensions'));
    });

    it('returns dashboard troubleshooting doc for dashboard loading issues', () => {
      const results = supportKnowledgeService.search('dashboard widgets not loading');
      assert.ok(results.length > 0);
      assert.strictEqual(results[0].title, 'CloudDesk Dashboard Troubleshooting');
      assert.strictEqual(results[0].source, 'CloudDesk Support Knowledge');
    });

    it('returns reports troubleshooting doc for export timeout issues', () => {
      const results = supportKnowledgeService.search('reports export timeout analytics');
      assert.ok(results.length > 0);
      assert.strictEqual(results[0].title, 'CloudDesk Reports Troubleshooting');
    });

    it('returns empty array for empty or whitespace query', () => {
      assert.deepStrictEqual(supportKnowledgeService.search(''), []);
      assert.deepStrictEqual(supportKnowledgeService.search('   '), []);
    });

    it('formats knowledge context block with clear company reference boundaries', () => {
      const results = supportKnowledgeService.search('login crash');
      const block = supportKnowledgeService.formatKnowledgeContext(results);
      assert.ok(block.includes('=== CloudDesk Support Knowledge (Company Reference) ==='));
      assert.ok(block.includes('CloudDesk Login Troubleshooting'));
      assert.ok(block.includes('=== End Support Knowledge ==='));
    });
  });

  // 2. Knowledge Search Tool
  describe('2. search_support_knowledge Tool', () => {
    it('executes tool and returns normalized safe knowledge output', async () => {
      const result = await searchSupportKnowledgeTool.execute({
        query: 'login crash',
        limit: 2,
      });

      assert.strictEqual(result.query, 'login crash');
      assert.ok(result.total > 0);
      assert.ok(Array.isArray(result.results));
      assert.strictEqual(result.results[0].source, 'CloudDesk Support Knowledge');
      assert.ok(result.results[0].title);
      assert.ok(result.results[0].content);
      // Ensure no raw filesystem paths or credentials
      assert.strictEqual(result.results[0].path, undefined);
    });

    it('rejects invalid or blank query with validation error', async () => {
      assert.throws(
        () => searchSupportKnowledgeTool.validate({ query: '' }),
        /query.*is required/i
      );
      assert.throws(
        () => searchSupportKnowledgeTool.validate(null),
        /must be an object/i
      );
    });
  });

  // 3. Outcome Detection
  describe('3. Outcome Detection (supportOutcome.service)', () => {
    it('detects successful outcomes with high confidence', () => {
      const phrases = [
        'That fixed it. Thanks!',
        "It's working now, the dashboard loads.",
        'That solved the problem completely.',
        'Works now, thank you.',
        'The problem is gone.',
        'Issue is resolved.',
      ];

      for (const phrase of phrases) {
        const res = supportOutcomeService.detectOutcome({ userMessage: phrase });
        assert.strictEqual(res.outcome, 'resolved', `Failed on phrase: "${phrase}"`);
        assert.strictEqual(res.confidence, 'high');
      }
    });

    it('detects failed outcomes with high confidence', () => {
      const phrases = [
        "Still broken after trying that.",
        "That didn't work at all.",
        "Still crashing right after login.",
        "Same problem persists.",
        "That didn't fix it.",
        "Still having the issue.",
      ];

      for (const phrase of phrases) {
        const res = supportOutcomeService.detectOutcome({ userMessage: phrase });
        assert.strictEqual(res.outcome, 'failed', `Failed on phrase: "${phrase}"`);
        assert.strictEqual(res.confidence, 'high');
      }
    });

    it('returns unknown outcome for ambiguous or conversational phrases', () => {
      const ambiguous = [
        'Can you help me with this?',
        'I see what you mean.',
        'What should I do next?',
        'Hello there',
        'Okay, let me check.',
      ];

      for (const phrase of ambiguous) {
        const res = supportOutcomeService.detectOutcome({ userMessage: phrase });
        assert.strictEqual(res.outcome, 'unknown', `Failed on phrase: "${phrase}"`);
        assert.strictEqual(res.confidence, 'none');
      }
    });

    it('extracts attempted troubleshooting step accurately from conversation history', () => {
      const history = [
        { role: 'user', content: 'My app crashes after login' },
        { role: 'assistant', content: 'Please try disabling your Chrome extensions and re-test.' },
      ];

      const step = extractAttemptedStep('That fixed it', history, 'resolved');
      assert.strictEqual(step, 'disabling browser extensions');
    });

    it('extracts cache step when cache troubleshooting is mentioned', () => {
      const step = extractAttemptedStep("Clearing the cache didn't fix it.", []);
      assert.strictEqual(step, 'clearing browser cache');
    });

    it('extracts issue accurately from conversation context', () => {
      const issue = extractIssue('I have a login crash on Windows 11', []);
      assert.strictEqual(issue, 'login crash');
    });

    // Explicit Regression Tests for Failed-Resolution Extraction Bug
    it('TEST 1: Customer explicit step takes priority over assistant recommendation', () => {
      const history = [
        { role: 'user', content: 'My app crashes after login' },
        { role: 'assistant', content: 'Please try disabling your Chrome extensions and re-test.' },
      ];
      const res = supportOutcomeService.detectOutcome({
        userMessage: "Clearing the browser cache didn't fix it. It's still crashing.",
        history,
      });
      assert.strictEqual(res.outcome, 'failed');
      assert.strictEqual(res.attemptedStep, 'clearing browser cache');
      assert.notStrictEqual(res.attemptedStep, 'disabling browser extensions');
    });

    it('TEST 2: Customer explicitly states Chrome extensions failed', () => {
      const res = supportOutcomeService.detectOutcome({
        userMessage: "Disabling Chrome extensions didn't work.",
        history: [],
      });
      assert.strictEqual(res.outcome, 'failed');
      assert.strictEqual(res.attemptedStep, 'disabling Chrome extensions');
    });

    it('TEST 3: Customer confirms success and resolves using assistant recommendation', () => {
      const history = [
        { role: 'user', content: 'My app crashes after login' },
        { role: 'assistant', content: 'Please try disabling your Chrome extensions and re-test.' },
      ];
      const res = supportOutcomeService.detectOutcome({
        userMessage: 'That fixed it. The application is working now.',
        history,
      });
      assert.strictEqual(res.outcome, 'resolved');
      assert.strictEqual(res.attemptedStep, 'disabling browser extensions');
    });

    it('TEST 4: Resolves correctly when message contains both failure and conclusive resolution', () => {
      const res = supportOutcomeService.detectOutcome({
        userMessage: "Clearing the cache didn't fix it, but disabling extensions fixed the problem.",
        history: [],
      });
      assert.strictEqual(res.outcome, 'resolved');
      assert.strictEqual(res.attemptedStep, 'disabling browser extensions');
    });

    it('TEST 5: Sets attemptedStep to null when customer states no explicit action on failure', () => {
      const history = [
        { role: 'user', content: 'My app crashes after login' },
        { role: 'assistant', content: 'Please try disabling your Chrome extensions and re-test.' },
      ];
      const res = supportOutcomeService.detectOutcome({
        userMessage: 'Still broken.',
        history,
      });
      assert.strictEqual(res.outcome, 'failed');
      assert.strictEqual(res.attemptedStep, null);
    });
  });

  // 4. Resolution Memory Formatting & Hindsight Integration
  describe('4. Resolution Memory Formatting', () => {
    it('formats successful resolution memory with tags and metadata', () => {
      const res = supportOutcomeService.formatResolutionMemory({
        outcome: 'resolved',
        issue: 'login crash',
        attemptedStep: 'disabling browser extensions',
        environment: { browser: 'Google Chrome', os: 'Windows 11' },
      });

      assert.strictEqual(res.shouldRetain, true);
      assert.strictEqual(res.type, 'successful_resolution');
      assert.ok(res.content.includes('Previous login crash was successfully resolved by disabling browser extensions.'));
      assert.ok(res.tags.includes('successful_resolution'));
      assert.strictEqual(res.metadata.result, 'resolved');
      assert.ok(res.metadata.environment.includes('Google Chrome'));
    });

    it('formats failed resolution memory with tags and metadata', () => {
      const res = supportOutcomeService.formatResolutionMemory({
        outcome: 'failed',
        issue: 'login crash',
        attemptedStep: 'clearing browser cache',
      });

      assert.strictEqual(res.shouldRetain, true);
      assert.strictEqual(res.type, 'failed_resolution');
      assert.ok(res.content.includes('did not resolve login crash'));
      assert.ok(res.tags.includes('failed_resolution'));
      assert.strictEqual(res.metadata.result, 'failed');
    });
  });

  // 5. Memory Context Prioritization
  describe('5. Memory Context Prioritization', () => {
    it('prioritizes successful resolutions and flags failed attempts in system prompt context', () => {
      const recallResult = {
        memories: [
          { text: 'Customer is using Chrome on Windows 11' },
          { text: 'Previous login crash was successfully resolved by disabling browser extensions.' },
          { text: 'Troubleshooting step "clearing browser cache" did not resolve login crash.' },
        ],
      };

      const block = hindsightService.formatMemoryContext('customer_001', recallResult);
      assert.ok(block.includes('PRIOR SUCCESSFUL RESOLUTIONS'));
      assert.ok(block.includes('✓ [Successful Resolution]'));
      assert.ok(block.includes('PRIOR FAILED ATTEMPTS'));
      assert.ok(block.includes('✕ [Failed Troubleshooting Attempt]'));
      assert.ok(block.includes('CUSTOMER ENVIRONMENT & SUPPORT HISTORY'));

      // Ensure successful resolution is placed before general facts
      const successPos = block.indexOf('PRIOR SUCCESSFUL RESOLUTIONS');
      const failPos = block.indexOf('PRIOR FAILED ATTEMPTS');
      const envPos = block.indexOf('CUSTOMER ENVIRONMENT & SUPPORT HISTORY');

      assert.ok(successPos < failPos);
      assert.ok(failPos < envPos);
    });
  });

  // 6. Support Knowledge & Customer Memory Coexistence
  describe('6. Support Knowledge & Hindsight Coexistence', () => {
    it('verifies support knowledge does not contain customer-specific information', () => {
      for (const doc of supportKnowledgeService.documents) {
        assert.ok(!doc.content.includes('Acme Corp'));
        assert.ok(!doc.content.includes('TechNova'));
        assert.ok(!doc.content.includes('customer_001'));
      }
    });

    it('verifies customer memory bank isolation does not cross tenants', () => {
      const bank1 = hindsightService.getBankId('customer_001');
      const bank2 = hindsightService.getBankId('customer_002');
      assert.notStrictEqual(bank1, bank2);
      assert.strictEqual(bank1, 'customer_001');
      assert.strictEqual(bank2, 'customer_002');
    });
  });

  // 7. API Metadata & Endpoints
  describe('7. API Metadata & Endpoints', () => {
    let server;
    let testPort;

    before(async () => {
      const app = (await import('../src/app.js')).default;
      await new Promise((resolve) => {
        server = app.listen(0, () => {
          testPort = server.address().port;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    it('POST /api/chat returns knowledge metadata when support documentation is consulted', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer_001',
          message: "My application keeps crashing after login on Chrome.",
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.knowledge);
      assert.strictEqual(json.data.knowledge.used, true);
      assert.ok(json.data.knowledge.titles.includes('CloudDesk Login Troubleshooting'));
    });

    it('POST /api/chat detects resolved outcome on confirmation', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer_001',
          message: "That fixed it. The application is working now.",
          history: [
            { role: 'user', content: 'Application crashes after login' },
            { role: 'assistant', content: 'Please try disabling your Chrome extensions.' },
          ],
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.outcome);
      assert.strictEqual(json.data.outcome.detected, 'resolved');
      assert.strictEqual(json.data.memory.retainedType, 'successful_resolution');
    });

    it('POST /api/chat detects failed outcome on negative feedback', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'customer_001',
          message: "Clearing the cache didn't fix it. Still crashing.",
          history: [
            { role: 'user', content: 'Application crashes after login' },
            { role: 'assistant', content: 'Please clear your browser cache.' },
          ],
        }),
      });

      const json = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.outcome);
      assert.strictEqual(json.data.outcome.detected, 'failed');
      assert.strictEqual(json.data.outcome.attemptedStep, 'clearing browser cache');
      assert.strictEqual(json.data.memory.retainedType, 'failed_resolution');
    });

    it('GET /api/chat/memory/:customerId returns categorized resolution facts', async () => {
      const res = await fetch(`http://127.0.0.1:${testPort}/api/chat/memory/customer_001`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data.successfulResolutions));
      assert.ok(Array.isArray(json.data.failedAttempts));
      assert.ok(Array.isArray(json.data.environmentFacts));
    });
  });
});
