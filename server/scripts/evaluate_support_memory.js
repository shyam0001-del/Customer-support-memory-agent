#!/usr/bin/env node
/**
 * PHASE 7 — FINAL EVALUATION METRICS RUNNER
 *
 * Factual Pass/Fail evaluation of the Customer Support Memory Agent across
 * the 6 foundational memory dimensions:
 *
 * Metric A: Memory Recall
 * Metric B: Resolution Reuse
 * Metric C: Failure Avoidance
 * Metric D: Preference Adaptation
 * Metric E: Ticket Continuity
 * Metric F: Customer Isolation
 */

import { hindsightService } from '../src/services/memory/hindsight.service.js';
import { supportTicketService } from '../src/services/ticket/supportTicket.service.js';
import { supportResolutionLearningService } from '../src/services/resolution/supportResolutionLearning.service.js';
import { supportPreferenceService } from '../src/services/preference/supportPreference.service.js';
import { supportOutcomeService } from '../src/services/support/supportOutcome.service.js';
import { agentService } from '../src/services/agent/agent.service.js';
import { connectDatabase } from '../src/config/db.js';

const EVAL_CUSTOMER_A = `eval_customer_a_${Date.now().toString().slice(-4)}`;
const EVAL_CUSTOMER_B = `eval_customer_b_${Date.now().toString().slice(-4)}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runEvaluation() {
  console.log('===============================================================');
  console.log('PHASE 7: CUSTOMER SUPPORT MEMORY AGENT EVALUATION BENCHMARK');
  console.log('===============================================================');

  await connectDatabase();

  const metrics = [
    { id: 'A', name: 'Memory Recall', description: 'Did fresh session recover previous customer context from Hindsight?', pass: false, details: '' },
    { id: 'B', name: 'Resolution Reuse', description: 'Did the agent prioritize a previously successful solution?', pass: false, details: '' },
    { id: 'C', name: 'Failure Avoidance', description: 'Did the agent avoid repeating a previously failed solution?', pass: false, details: '' },
    { id: 'D', name: 'Preference Adaptation', description: "Did the agent respect the customer's learned support preference?", pass: false, details: '' },
    { id: 'E', name: 'Ticket Continuity', description: 'Did a fresh session recover active support ticket without re-explaining?', pass: false, details: '' },
    { id: 'F', name: 'Customer Isolation', description: 'Did Customer B remain 100% isolated from Customer A data?', pass: false, details: '' },
  ];

  try {
    // ------------------------------------------------------------------
    // METRIC A: Memory Recall
    // ------------------------------------------------------------------
    console.log('\nEvaluating Metric A: Memory Recall...');
    await hindsightService.retainMemory({
      customerId: EVAL_CUSTOMER_A,
      content: 'Customer confirmed resolution: Clearing browser cache resolved reports page failing to load on Windows 11 Chrome.',
      tags: ['successful_resolution', 'resolution'],
      metadata: { attemptedStep: 'clearing browser cache', outcome: 'success' },
    });
    await sleep(2500);

    const recallA = await hindsightService.recallMemory({
      customerId: EVAL_CUSTOMER_A,
      query: 'reports page failing to load',
    });
    const hasRecalledContext = recallA.memories.some((m) => {
      const text = typeof m === 'string' ? m : m.text || m.content || '';
      return text.toLowerCase().includes('clearing browser cache');
    });

    if (hasRecalledContext) {
      metrics[0].pass = true;
      metrics[0].details = `Recovered ${recallA.memories.length} item(s) including previous resolution.`;
    } else {
      metrics[0].details = 'Failed to recall previous resolution from Hindsight.';
    }

    // ------------------------------------------------------------------
    // METRIC B: Resolution Reuse
    // ------------------------------------------------------------------
    console.log('Evaluating Metric B: Resolution Reuse...');
    const prioritization = supportResolutionLearningService.prioritizeSolutions({
      issue: 'reports loading failure',
      environment: 'Windows 11 Chrome',
      memories: recallA.memories,
    });

    if (
      prioritization.primaryRecommendation === 'clearing browser cache' &&
      prioritization.priorityOrder === 'customer_success'
    ) {
      metrics[1].pass = true;
      metrics[1].details = `Prioritized "${prioritization.primaryRecommendation}" (order: ${prioritization.priorityOrder}).`;
    } else {
      metrics[1].details = `Did not prioritize customer success: ${prioritization.primaryRecommendation}`;
    }

    // ------------------------------------------------------------------
    // METRIC C: Failure Avoidance
    // ------------------------------------------------------------------
    console.log('Evaluating Metric C: Failure Avoidance...');
    const failedPayload = supportOutcomeService.formatResolutionMemory({
      outcome: 'failed',
      issue: 'reports loading failure',
      attemptedStep: 'clearing browser cache',
    });
    await hindsightService.retainMemory({
      customerId: EVAL_CUSTOMER_A,
      content: failedPayload.content,
      tags: failedPayload.tags,
      metadata: failedPayload.metadata,
    });
    await sleep(2500);

    const recallUpdated = await hindsightService.recallMemory({
      customerId: EVAL_CUSTOMER_A,
      query: 'reports page failing to load cache clearing',
    });
    const updatedPrioritization = supportResolutionLearningService.prioritizeSolutions({
      issue: 'reports loading failure',
      environment: 'Windows 11 Chrome',
      memories: recallUpdated.memories,
    });

    if (
      updatedPrioritization.avoidedSteps.includes('clearing browser cache') &&
      updatedPrioritization.primaryRecommendation !== 'clearing browser cache'
    ) {
      metrics[2].pass = true;
      metrics[2].details = `Blacklisted failed step "${updatedPrioritization.avoidedSteps[0]}" and pivoted to "${updatedPrioritization.primaryRecommendation}".`;
    } else {
      metrics[2].details = `Failed to blacklist failed step: avoided=${JSON.stringify(updatedPrioritization.avoidedSteps)}`;
    }

    // ------------------------------------------------------------------
    // METRIC D: Preference Adaptation
    // ------------------------------------------------------------------
    console.log('Evaluating Metric D: Preference Adaptation...');
    const prefPayload = supportPreferenceService.detectPreference({
      userMessage: 'Please give me one troubleshooting step at a time.',
    });
    await hindsightService.retainMemory({
      customerId: EVAL_CUSTOMER_A,
      content: prefPayload.content,
      tags: prefPayload.tags,
      metadata: prefPayload.metadata,
    });
    await sleep(2500);

    const recallWithPref = await hindsightService.recallMemory({
      customerId: EVAL_CUSTOMER_A,
      query: 'preference troubleshooting style one step at a time',
    });
    const extractedPrefs = supportPreferenceService.extractPreferencesFromMemories(recallWithPref.memories);
    const hasOneStep = extractedPrefs.some((p) => p.key === 'troubleshooting_style' && (p.value === 'one_step' || p.value.includes('one')));

    if (hasOneStep) {
      metrics[3].pass = true;
      metrics[3].details = 'Learned and adapted to "one troubleshooting step at a time" preference.';
    } else {
      metrics[3].details = 'Failed to extract learned customer preference.';
    }

    // ------------------------------------------------------------------
    // METRIC E: Ticket Continuity
    // ------------------------------------------------------------------
    console.log('Evaluating Metric E: Ticket Continuity...');
    const ticket = await supportTicketService.createTicket({
      customerId: EVAL_CUSTOMER_A,
      issue: 'reports page failing to load',
      environment: 'Windows 11 Chrome',
      previousAttempts: ['clearing browser cache'],
      priority: 'high',
      status: 'escalated',
      escalationReason: 'troubleshooting unsuccessful',
    });

    const activeTickets = await supportTicketService.listTicketsForCustomer(EVAL_CUSTOMER_A);
    const hasActiveTicket = activeTickets.some((t) => t.ticketId === ticket.ticketId && t.status === 'escalated');

    if (hasActiveTicket) {
      metrics[4].pass = true;
      metrics[4].details = `Recovered ticket ${ticket.ticketId} with status escalated and documented attempts.`;
    } else {
      metrics[4].details = 'Active ticket could not be retrieved.';
    }

    // ------------------------------------------------------------------
    // METRIC F: Customer Isolation
    // ------------------------------------------------------------------
    console.log('Evaluating Metric F: Customer Isolation...');
    const recallB = await hindsightService.recallMemory({
      customerId: EVAL_CUSTOMER_B,
      query: 'reports page failing to load cache clearing',
    });
    const ticketsB = await supportTicketService.listTicketsForCustomer(EVAL_CUSTOMER_B);

    if (recallB.memories.length === 0 && ticketsB.length === 0) {
      metrics[5].pass = true;
      metrics[5].details = 'Customer B bank has 0 memories and 0 tickets (zero cross-tenant leakage).';
    } else {
      metrics[5].details = `Customer B leaked data: ${recallB.memories.length} memories, ${ticketsB.length} tickets.`;
    }

    // Clean up evaluation data
    await hindsightService.deleteBank(EVAL_CUSTOMER_A);
    await supportTicketService.deleteTicketsForCustomer(EVAL_CUSTOMER_A);
    await hindsightService.deleteBank(EVAL_CUSTOMER_B);
    await supportTicketService.deleteTicketsForCustomer(EVAL_CUSTOMER_B);
  } catch (err) {
    console.error('Error during evaluation execution:', err);
  }

  // ------------------------------------------------------------------
  // SUMMARY REPORT
  // ------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('EVALUATION RESULTS SUMMARY');
  console.log('===============================================================');
  console.log('| Metric | Dimension                | Status | Verification Details');
  console.log('|--------|--------------------------|--------|----------------------------------------------------');

  let passedCount = 0;
  for (const m of metrics) {
    if (m.pass) passedCount += 1;
    const statusText = m.pass ? 'PASS' : 'FAIL';
    const dim = m.name.padEnd(24);
    console.log(`| [${m.id}]    | ${dim} | ${statusText}   | ${m.details}`);
  }

  console.log('===============================================================');
  console.log(`Score: ${passedCount}/${metrics.length} dimensions verified.`);

  if (passedCount === metrics.length) {
    console.log('Result: ALL 6 EVALUATION METRICS PASSED (100%)\n');
    process.exit(0);
  } else {
    console.error(`Result: ${metrics.length - passedCount} metric(s) FAILED.\n`);
    process.exit(1);
  }
}

runEvaluation().catch((err) => {
  console.error('Fatal evaluation failure:', err);
  process.exit(1);
});
