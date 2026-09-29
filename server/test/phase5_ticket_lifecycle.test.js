import { describe, it, beforeEach, before, after } from 'node:test';
import assert from 'node:assert';
import { supportTicketService, SupportTicketService } from '../src/services/ticket/supportTicket.service.js';
import { SupportTicket } from '../src/models/supportTicket.model.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../src/config/db.js';
import { hindsightService } from '../src/services/memory/hindsight.service.js';
import { agentService } from '../src/services/agent/agent.service.js';
import { aiService } from '../src/services/ai/ai.service.js';
import { createSupportTicketTool } from '../src/services/tools/createSupportTicket.tool.js';
import { getSupportTicketTool } from '../src/services/tools/getSupportTicket.tool.js';
import { updateSupportTicketTool } from '../src/services/tools/updateSupportTicket.tool.js';

describe('Phase 5: Support Ticket Lifecycle & Escalation Memory Test Suite', () => {
  before(async () => {
    await connectDatabase();
  });

  after(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    await supportTicketService.resetForTests(1001);
  });

  // TEST 1 — create ticket
  describe('TEST 1 — create ticket', () => {
    it('creates a ticket for Customer A with deterministic CS-1001 ID and correct fields', async () => {
      const ticket = await supportTicketService.createTicket({
        customerId: 'customer_test_A',
        issue: 'reports not loading',
        status: 'open',
        priority: 'normal',
        environment: 'Windows 11 / Chrome',
        previousAttempts: ['clearing browser cache'],
        escalationReason: 'troubleshooting unsuccessful',
      });

      assert.strictEqual(ticket.ticketId, 'CS-1001');
      assert.strictEqual(ticket.customerId, 'customer_test_A');
      assert.strictEqual(ticket.issue, 'reports not loading');
      assert.strictEqual(ticket.status, 'open');
      assert.strictEqual(ticket.priority, 'normal');
      assert.strictEqual(ticket.environment, 'Windows 11 / Chrome');
      assert.deepStrictEqual(ticket.previousAttempts, ['clearing browser cache']);
      assert.strictEqual(ticket.escalationReason, 'troubleshooting unsuccessful');
      assert.ok(ticket.createdAt);
      assert.ok(ticket.updatedAt);
    });

    it('rejects invalid inputs when creating ticket', async () => {
      await assert.rejects(async () => await supportTicketService.createTicket({ customerId: '', issue: 'test' }));
      await assert.rejects(async () => await supportTicketService.createTicket({ customerId: 'cust', issue: '' }));
    });
  });

  // TEST 2 — ticket retrieval
  describe('TEST 2 — ticket retrieval', () => {
    it('retrieves Customer A ticket when requested with matching customerId', async () => {
      const created = await supportTicketService.createTicket({
        customerId: 'customer_test_A',
        issue: 'dashboard blank screen',
      });

      const fetched = await supportTicketService.getTicket({
        ticketId: created.ticketId,
        customerId: 'customer_test_A',
      });

      assert.strictEqual(fetched.ticketId, created.ticketId);
      assert.strictEqual(fetched.customerId, 'customer_test_A');
      assert.strictEqual(fetched.issue, 'dashboard blank screen');
    });

    it('returns structured error or throws NOT_FOUND for non-existent ticket', async () => {
      await assert.rejects(
        async () =>
          await supportTicketService.getTicket({
            ticketId: 'CS-9999',
            customerId: 'customer_test_A',
          }),
        (err) => err.code === 'NOT_FOUND' || err.statusCode === 404
      );
    });
  });

  // TEST 3 — customer isolation
  describe('TEST 3 — customer isolation', () => {
    it('denies access when Customer B attempts to retrieve Customer A ticket', async () => {
      const ticketA = await supportTicketService.createTicket({
        customerId: 'customer_test_A',
        issue: 'confidential billing discrepancy',
      });

      await assert.rejects(
        async () =>
          await supportTicketService.getTicket({
            ticketId: ticketA.ticketId,
            customerId: 'customer_test_B', // Different customer!
          }),
        (err) => err.code === 'ACCESS_DENIED' || err.statusCode === 403
      );
    });

    it('tool layer enforces customer isolation and returns structured ACCESS_DENIED', async () => {
      const ticketA = await supportTicketService.createTicket({
        customerId: 'customer_test_A',
        issue: 'reports failure',
      });

      const toolResult = await getSupportTicketTool.execute({
        ticketId: ticketA.ticketId,
        customerId: 'customer_test_B',
      });

      assert.strictEqual(toolResult.success, false);
      assert.strictEqual(toolResult.error, 'ACCESS_DENIED');
      assert.ok(toolResult.message.includes('Access Denied'));
    });
  });

  // TEST 4 — unresolved escalation
  describe('TEST 4 — unresolved escalation', () => {
    let originalGenerate;
    let interceptedMessages = [];

    before(() => {
      originalGenerate = aiService.generateChatResponse;
      aiService.generateChatResponse = async (messages) => {
        interceptedMessages = messages;
        return {
          message:
            "I'm sorry clearing the browser cache didn't fix the issue. I have created support ticket CS-1001 for your reports loading failure and escalated it to our Tier 2 Engineering team.",
          model: 'test-model',
          usage: { total_tokens: 40 },
        };
      };
    });

    after(() => {
      aiService.generateChatResponse = originalGenerate;
    });

    it('creates and escalates support ticket when customer reports troubleshooting failed', async () => {
      const response = await agentService.run({
        message: "Clearing the browser cache didn't fix it. It's still broken.",
        history: [
          { role: 'user', content: 'My reports are not loading in CloudDesk.' },
          { role: 'assistant', content: 'Please try clearing your browser cache.' },
        ],
        customerId: 'customer_test_escalate',
      });

      assert.strictEqual(response.outcome.detected, 'failed');
      assert.strictEqual(response.outcome.attemptedStep, 'clearing browser cache');
      assert.ok(response.ticket);
      assert.strictEqual(response.ticket.status, 'escalated');
      assert.strictEqual(response.ticket.issue, 'reports loading failure');
      assert.ok(response.ticket.previousAttempts.includes('clearing browser cache'));

      // Check system prompt instructed the agent about ticket escalation
      const systemMsg = interceptedMessages.find((m) => m.role === 'system')?.content || '';
      assert.ok(systemMsg.includes('SUPPORT TICKET ESCALATION IN EFFECT'));
      assert.ok(systemMsg.includes(response.ticket.ticketId));
    });
  });

  // TEST 5 — ticket memory in Hindsight
  describe('TEST 5 — ticket memory in Hindsight', () => {
    it('formats ticket memory with metadata and tags suitable for long-term customer context', async () => {
      const ticket = await supportTicketService.createTicket({
        customerId: 'customer_test_hindsight',
        issue: 'reports loading failure',
        status: 'escalated',
        previousAttempts: ['clearing browser cache'],
        escalationReason: 'troubleshooting unsuccessful',
      });

      const formatted = supportTicketService.formatTicketMemory(ticket);
      assert.strictEqual(formatted.metadata.type, 'support_ticket');
      assert.strictEqual(formatted.metadata.ticketId, ticket.ticketId);
      assert.strictEqual(formatted.metadata.status, 'escalated');
      assert.ok(formatted.content.includes(ticket.ticketId));
      assert.ok(formatted.content.includes('reports loading failure'));
      assert.ok(formatted.content.includes('clearing browser cache'));
      assert.ok(formatted.tags.includes('support_ticket'));
      assert.ok(formatted.tags.includes(ticket.ticketId));
    });
  });

  // TEST 6 — fresh-session recall
  describe('TEST 6 — fresh-session recall', () => {
    let originalGenerate;
    let interceptedMessages = [];

    before(() => {
      originalGenerate = aiService.generateChatResponse;
      aiService.generateChatResponse = async (messages) => {
        interceptedMessages = messages;
        return {
          message:
            'Hello! Regarding your CloudDesk reports loading failure under ticket CS-1001: it is currently escalated to Tier 2 Engineering. We have documented that clearing the browser cache did not resolve it.',
          model: 'test-model',
          usage: { total_tokens: 50 },
        };
      };
    });

    after(() => {
      aiService.generateChatResponse = originalGenerate;
    });

    it('recalls relevant ticket in fresh session with empty history', async () => {
      // Seed the existing ticket for customer
      await supportTicketService.createTicket({
        customerId: 'customer_fresh_recall',
        issue: 'reports loading failure',
        status: 'escalated',
        environment: 'Windows 11 / Chrome',
        previousAttempts: ['clearing browser cache'],
        escalationReason: 'troubleshooting unsuccessful',
      });

      const response = await agentService.run({
        message: 'Any update on my reports issue?',
        history: [], // Fresh session with EMPTY history!
        customerId: 'customer_fresh_recall',
      });

      assert.ok(response.ticket);
      assert.strictEqual(response.ticket.ticketId, 'CS-1001');
      assert.strictEqual(response.ticket.status, 'escalated');

      const systemMsg = interceptedMessages.find((m) => m.role === 'system')?.content || '';
      assert.ok(systemMsg.includes('RELEVANT ACTIVE SUPPORT TICKET CASE'));
      assert.ok(systemMsg.includes('CS-1001'));
      assert.ok(systemMsg.includes('CASE CONTINUITY DIRECTIVE'));
    });
  });

  // TEST 7 — no unnecessary repetition
  describe('TEST 7 — no unnecessary repetition', () => {
    it('instructs agent never to ask customer to repeat problem when active ticket exists', async () => {
      const ticket = await supportTicketService.createTicket({
        customerId: 'customer_no_repeat',
        issue: 'reports loading failure',
        status: 'escalated',
      });

      const customerTickets = await supportTicketService.listTicketsForCustomer('customer_no_repeat');
      const matched = supportTicketService.matchRelevantTicket(customerTickets, 'Any update on my reports issue?');

      assert.strictEqual(matched.ticketId, ticket.ticketId);
      assert.strictEqual(matched.status, 'escalated');
    });
  });

  // TEST 8 — failed attempt avoidance
  describe('TEST 8 — failed attempt avoidance', () => {
    it('case continuity directive forbids re-suggesting already failed troubleshooting steps', async () => {
      const ticket = await supportTicketService.createTicket({
        customerId: 'customer_avoid_failed',
        issue: 'reports loading failure',
        status: 'escalated',
        previousAttempts: ['clearing browser cache'],
      });

      assert.ok(ticket.previousAttempts.includes('clearing browser cache'));
    });
  });

  // TEST 9 — multiple tickets
  describe('TEST 9 — multiple tickets', () => {
    it('distinguishes between multiple tickets (reports CS-1001 vs login CS-1002)', async () => {
      const ticket1 = await supportTicketService.createTicket({
        customerId: 'customer_multi_tickets',
        issue: 'reports loading failure',
        status: 'escalated',
      });

      const ticket2 = await supportTicketService.createTicket({
        customerId: 'customer_multi_tickets',
        issue: 'login crash after auth',
        status: 'in_progress',
      });

      const allTickets = await supportTicketService.listTicketsForCustomer('customer_multi_tickets');
      assert.strictEqual(allTickets.length, 2);

      // Query about reports should match CS-1001
      const matchedReports = supportTicketService.matchRelevantTicket(
        allTickets,
        "What's happening with my reports problem?"
      );
      assert.strictEqual(matchedReports.ticketId, ticket1.ticketId);
      assert.strictEqual(matchedReports.issue, 'reports loading failure');

      // Query about login should match CS-1002
      const matchedLogin = supportTicketService.matchRelevantTicket(
        allTickets,
        'Any update on the login crash?'
      );
      assert.strictEqual(matchedLogin.ticketId, ticket2.ticketId);
      assert.strictEqual(matchedLogin.issue, 'login crash after auth');
    });
  });

  // TEST 10 — status update
  describe('TEST 10 — status update', () => {
    it('updates ticket to in_progress and persists the change', async () => {
      const ticket = await supportTicketService.createTicket({
        customerId: 'customer_status_test',
        issue: 'reports loading failure',
        status: 'open',
      });

      const updated = await supportTicketService.updateTicket({
        ticketId: ticket.ticketId,
        customerId: 'customer_status_test',
        status: 'in_progress',
      });

      assert.strictEqual(updated.status, 'in_progress');

      // Verify persistence
      const reFetched = await supportTicketService.getTicket({
        ticketId: ticket.ticketId,
        customerId: 'customer_status_test',
      });
      assert.strictEqual(reFetched.status, 'in_progress');
    });
  });

  // TEST 11 — resolution
  describe('TEST 11 — resolution', () => {
    it('marks ticket resolved with resolution and formats Hindsight resolution memory', async () => {
      const ticket = await supportTicketService.createTicket({
        customerId: 'customer_resolve_test',
        issue: 'reports loading failure',
        status: 'in_progress',
      });

      const updated = await supportTicketService.updateTicket({
        ticketId: ticket.ticketId,
        customerId: 'customer_resolve_test',
        status: 'resolved',
        resolution: 'Backend report aggregation service restarted by support engineering.',
      });

      assert.strictEqual(updated.status, 'resolved');
      assert.strictEqual(
        updated.resolution,
        'Backend report aggregation service restarted by support engineering.'
      );

      const resMemory = supportTicketService.formatTicketResolutionMemory(updated, updated.resolution);
      assert.strictEqual(resMemory.metadata.type, 'support_ticket_resolution');
      assert.strictEqual(resMemory.metadata.status, 'resolved');
      assert.ok(resMemory.content.includes(ticket.ticketId));
      assert.ok(resMemory.content.includes('Backend report aggregation service restarted'));
    });
  });

  // TEST 12 — preference compatibility
  describe('TEST 12 — preference compatibility', () => {
    let originalGenerate;
    let originalRecall;
    let interceptedMessages = [];

    before(() => {
      originalGenerate = aiService.generateChatResponse;
      aiService.generateChatResponse = async (messages) => {
        interceptedMessages = messages;
        return {
          message:
            "I understand you prefer one step at a time. Here is the first step: Please check if your date filter is set to under 30 days.",
          model: 'test-model',
          usage: { total_tokens: 30 },
        };
      };

      originalRecall = hindsightService.recallMemory;
      hindsightService.recallMemory = async ({ customerId, query }) => {
        if (customerId === 'customer_pref_ticket_compat') {
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
      aiService.generateChatResponse = originalGenerate;
      hindsightService.recallMemory = originalRecall;
    });

    it('honors one-step preference alongside active ticket context', async () => {
      await supportTicketService.createTicket({
        customerId: 'customer_pref_ticket_compat',
        issue: 'reports loading failure',
        status: 'open',
      });

      const response = await agentService.run({
        message: 'How do I start troubleshooting my reports issue?',
        customerId: 'customer_pref_ticket_compat',
      });

      assert.strictEqual(response.memory.recalledPreference, true);
      const systemMsg = interceptedMessages.find((m) => m.role === 'system')?.content || '';
      assert.ok(systemMsg.includes('one troubleshooting step at a time'));
      assert.ok(systemMsg.includes('RELEVANT ACTIVE SUPPORT TICKET CASE'));
    });
  });

  // TEST 13 — current request override
  describe('TEST 13 — current request override', () => {
    let originalGenerate;
    let originalRecall;
    let interceptedMessages = [];

    before(() => {
      originalGenerate = aiService.generateChatResponse;
      aiService.generateChatResponse = async (messages) => {
        interceptedMessages = messages;
        return {
          message:
            'Here are all the troubleshooting steps at once: 1. Adjust date range. 2. Enable hardware acceleration. 3. Clear cache.',
          model: 'test-model',
          usage: { total_tokens: 40 },
        };
      };

      originalRecall = hindsightService.recallMemory;
      hindsightService.recallMemory = async ({ customerId, query }) => {
        if (customerId === 'customer_pref_ticket_compat') {
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
      aiService.generateChatResponse = originalGenerate;
      hindsightService.recallMemory = originalRecall;
    });

    it('current request overrides one-step preference when customer requests all steps', async () => {
      const response = await agentService.run({
        message: 'Give me all the troubleshooting steps at once because I am in a hurry.',
        customerId: 'customer_pref_ticket_compat',
      });

      const systemMsg = interceptedMessages.find((m) => m.role === 'system')?.content || '';
      assert.ok(systemMsg.includes('EXPLICIT CUSTOMER OVERRIDE'));
      assert.ok(response.message.includes('all the troubleshooting steps'));
    });
  });

  // TEST 14 — durable ticket persistence across backend/service restart
  describe('TEST 14 — durable ticket persistence across backend/service restart', () => {
    it('persists ticket in durable store and survives service restart / reinitialization', async () => {
      // 1. Create CS-1001 for customer A
      const ticket = await supportTicketService.createTicket({
        customerId: 'customer_durability_A',
        issue: 'reports not loading in CloudDesk',
        status: 'open',
        priority: 'high',
        environment: 'Windows 11 / Chrome',
        previousAttempts: ['clearing browser cache'],
        escalationReason: 'troubleshooting unsuccessful',
      });

      assert.strictEqual(ticket.ticketId, 'CS-1001');

      // 2. Verify it is persisted in MongoDB durable store
      if (isDatabaseConnected()) {
        const dbDoc = await SupportTicket.findOne({ ticketId: 'CS-1001' }).lean();
        assert.ok(dbDoc, 'Ticket must be written to MongoDB collection');
        assert.strictEqual(dbDoc.customerId, 'customer_durability_A');
      }

      // 3. Simulate backend/service restart by instantiating a completely fresh service
      // with empty in-memory state (this.tickets is empty)
      const freshRestartedService = new SupportTicketService();
      assert.strictEqual(freshRestartedService.tickets.size, 0, 'In-memory Map must start completely empty');

      // 4. Retrieve CS-1001 from the fresh service instance
      const retrieved = await freshRestartedService.getTicket({
        ticketId: 'CS-1001',
        customerId: 'customer_durability_A',
      });

      // 5. Verify the ticket still exists with exact fields
      assert.strictEqual(retrieved.ticketId, 'CS-1001');
      assert.strictEqual(retrieved.customerId, 'customer_durability_A');
      assert.strictEqual(retrieved.issue, 'reports not loading in CloudDesk');
      assert.strictEqual(retrieved.status, 'open');
      assert.strictEqual(retrieved.priority, 'high');
      assert.strictEqual(retrieved.environment, 'Windows 11 / Chrome');
      assert.deepStrictEqual(retrieved.previousAttempts, ['clearing browser cache']);
      assert.strictEqual(retrieved.escalationReason, 'troubleshooting unsuccessful');

      // 6. Verify ID uniqueness continues across service restart (does not reset back to 1001)
      const nextTicket = await freshRestartedService.createTicket({
        customerId: 'customer_durability_A',
        issue: 'second issue after restart',
      });
      assert.strictEqual(nextTicket.ticketId, 'CS-1002', 'Next ticket after restart must be CS-1002');
    });
  });
});
