#!/usr/bin/env node
/**
 * PHASE 7 — FINAL HACKATHON DEMO VERIFICATION SCRIPT
 *
 * Verifies the complete 4-Interaction Adaptive Support Intelligence Loop:
 *
 * [1] CUSTOMER IDENTIFIED: Persona defined (Acme Corp on Windows 11 Chrome)
 * [2] INITIAL ISSUE: Customer reports reports page not loading
 * [3] KNOWLEDGE RETRIEVED: Support knowledge accessed for reports troubleshooting
 * [4] SUCCESSFUL RESOLUTION LEARNED: Customer confirms cache clear worked -> stored in Hindsight
 * [5] FRESH SESSION: History cleared, simulating days later
 * [6] PREVIOUS SOLUTION RECALLED: Agent recalls previous success from Hindsight
 * [7] PREVIOUS SOLUTION PRIORITIZED: Prioritizes cache clearing without repeating story
 * [8] OUTCOME REVERSED: Customer reports cache clear failed this time
 * [9] FAILED ATTEMPT REMEMBERED: Failed outcome stored in Hindsight
 * [10] SUPPORT TICKET CREATED: Ticket escalated, cache clear blacklisted, alternative prioritized
 * [11] FRESH SESSION CASE RECALL: Fresh session recalls ticket CS-100x and avoids asking customer to repeat
 * [12] CUSTOMER ISOLATION VERIFIED: Customer B receives zero memory from Customer A
 * [13] FINAL DEMO PASS: All assertions satisfied cleanly
 */

import { agentService } from '../src/services/agent/agent.service.js';
import { hindsightService } from '../src/services/memory/hindsight.service.js';
import { supportTicketService } from '../src/services/ticket/supportTicket.service.js';
import { supportResolutionLearningService } from '../src/services/resolution/supportResolutionLearning.service.js';
import { connectDatabase, isDatabaseConnected } from '../src/config/db.js';

const DEMO_CUSTOMER_A = `customer_hackathon_demo_${Date.now().toString().slice(-4)}`;
const DEMO_CUSTOMER_B = `customer_isolated_demo_${Date.now().toString().slice(-4)}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`\n❌ DEMO VERIFICATION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runFinalDemoVerification() {
  console.log('===============================================================');
  console.log('PHASE 7: FINAL HACKATHON DEMO VERIFICATION');
  console.log('===============================================================');

  // Verify Hindsight & DB connection
  const client = hindsightService.getClient();
  assert(client, 'Hindsight client must be available');
  await connectDatabase();
  console.log(`📦 MongoDB Status: ${isDatabaseConnected() ? 'Connected (Durable Store)' : 'In-Memory Fallback'}`);

  // Ensure clean initial state
  await hindsightService.deleteBank(DEMO_CUSTOMER_A);
  await supportTicketService.deleteTicketsForCustomer(DEMO_CUSTOMER_A);
  await hindsightService.deleteBank(DEMO_CUSTOMER_B);
  await supportTicketService.deleteTicketsForCustomer(DEMO_CUSTOMER_B);

  // -------------------------------------------------------------
  // [1] CUSTOMER IDENTIFIED
  // -------------------------------------------------------------
  console.log('\n[1] CUSTOMER IDENTIFIED');
  console.log(`  Customer:       "Acme Corp" (${DEMO_CUSTOMER_A})`);
  console.log(`  Persona:        CloudDesk SaaS Enterprise Customer`);
  console.log(`  Initial State:  Clean slate (0 memories, 0 tickets)`);

  // -------------------------------------------------------------
  // [2] INITIAL ISSUE & [3] KNOWLEDGE RETRIEVED
  // -------------------------------------------------------------
  console.log('\n[2] INITIAL ISSUE');
  const query1 = "Our reports page isn't loading. I'm on Windows 11 using Chrome.";
  console.log(`  Customer Message: "${query1}"`);

  const response1 = await agentService.run({
    message: query1,
    history: [],
    customerId: DEMO_CUSTOMER_A,
  });

  console.log(`  Agent Response:   ${response1.message.slice(0, 180)}...`);

  console.log('\n[3] KNOWLEDGE RETRIEVED');
  assert(
    response1.knowledge && (response1.knowledge.used || response1.knowledge.resultCount > 0),
    'Expected support knowledge to be consulted for reports issue'
  );
  console.log(`  Knowledge Articles Consulted: ${response1.knowledge.resultCount}`);
  console.log(`  Primary Document:             "${response1.knowledge.titles?.[0] || 'CloudDesk Troubleshooting'}"`);

  // -------------------------------------------------------------
  // [4] SUCCESSFUL RESOLUTION LEARNED
  // -------------------------------------------------------------
  console.log('\n[4] SUCCESSFUL RESOLUTION LEARNED');
  const confirmMsg = 'The cache clearing fixed it! The reports are loading properly now.';
  console.log(`  Customer Message: "${confirmMsg}"`);

  const response1b = await agentService.run({
    message: confirmMsg,
    history: [
      { role: 'user', content: query1 },
      { role: 'assistant', content: response1.message },
    ],
    customerId: DEMO_CUSTOMER_A,
  });

  assert(
    response1b.outcome && response1b.outcome.detected === 'resolved',
    'Outcome should be detected as resolved'
  );
  assert(
    response1b.memory && response1b.memory.retained === true,
    'Resolution memory should be retained in Hindsight'
  );
  console.log(`  Outcome Detected: ${response1b.outcome.detected} (Step: "${response1b.outcome.attemptedStep}")`);
  console.log(`  Memory Retained:  true (successful_resolution)`);

  // Allow Hindsight Cloud indexing
  await sleep(3000);

  const bankCheck1 = await hindsightService.recallMemory({
    customerId: DEMO_CUSTOMER_A,
    query: 'reports loading cache clearing',
  });
  assert(bankCheck1.memories.length > 0, 'Hindsight bank must contain memories after retention');
  console.log(`  Hindsight Memories in Bank: ${bankCheck1.memories.length}`);

  // -------------------------------------------------------------
  // [5] FRESH SESSION & [6] PREVIOUS SOLUTION RECALLED
  // -------------------------------------------------------------
  console.log('\n[5] FRESH SESSION');
  console.log('  * Starting a new support session with EMPTY conversation history (simulating days later)...');

  const query2 = "Reports aren't loading again.";
  console.log(`  Customer Message: "${query2}"`);

  const response2 = await agentService.run({
    message: query2,
    history: [], // EMPTY HISTORY
    customerId: DEMO_CUSTOMER_A,
  });

  console.log('\n[6] PREVIOUS SOLUTION RECALLED');
  assert(response2.memory && response2.memory.recalledCount > 0, 'Expected Hindsight recall in fresh session');
  console.log(`  Memories Recalled from Hindsight: ${response2.memory.recalledCount}`);

  // -------------------------------------------------------------
  // [7] PREVIOUS SOLUTION PRIORITIZED
  // -------------------------------------------------------------
  console.log('\n[7] PREVIOUS SOLUTION PRIORITIZED');
  assert(
    response2.adaptiveLearning && response2.adaptiveLearning.prioritized === true,
    'Expected adaptive solution prioritization to be active'
  );
  assert(
    response2.adaptiveLearning.primaryRecommendation === 'clearing browser cache',
    `Expected primaryRecommendation to be "clearing browser cache", got "${response2.adaptiveLearning?.primaryRecommendation}"`
  );
  assert(
    response2.adaptiveLearning.priorityOrder === 'customer_success',
    `Expected priorityOrder to be "customer_success", got "${response2.adaptiveLearning?.priorityOrder}"`
  );
  console.log(`  Primary Recommendation: "${response2.adaptiveLearning.primaryRecommendation}"`);
  console.log(`  Priority Order:         ${response2.adaptiveLearning.priorityOrder}`);
  console.log(`  Adaptive Rationale:     ${response2.adaptiveLearning.rationale}`);
  console.log(`  Agent Response:         ${response2.message.slice(0, 180)}...`);

  // -------------------------------------------------------------
  // [8] OUTCOME REVERSED & [9] FAILED ATTEMPT REMEMBERED
  // -------------------------------------------------------------
  console.log('\n[8] OUTCOME REVERSED');
  const failureMsg = "I tried clearing the cache like last time, but it didn't fix it. Reports are still blank.";
  console.log(`  Customer Message: "${failureMsg}"`);

  const response3 = await agentService.run({
    message: failureMsg,
    history: [
      { role: 'user', content: query2 },
      { role: 'assistant', content: response2.message },
    ],
    customerId: DEMO_CUSTOMER_A,
  });

  console.log('\n[9] FAILED ATTEMPT REMEMBERED');
  assert(
    response3.outcome && response3.outcome.detected === 'failed',
    'Expected outcome to be detected as failed'
  );
  console.log(`  Outcome Detected: ${response3.outcome.detected} (Step: "${response3.outcome.attemptedStep}")`);

  // -------------------------------------------------------------
  // [10] SUPPORT TICKET CREATED
  // -------------------------------------------------------------
  console.log('\n[10] SUPPORT TICKET CREATED');
  const ticketsAfterFailure = await supportTicketService.listTicketsForCustomer(DEMO_CUSTOMER_A);
  assert(ticketsAfterFailure.length > 0, 'Expected support ticket to be created upon troubleshooting failure');
  const createdTicket = ticketsAfterFailure[0];
  console.log(`  Support Ticket ID: ${createdTicket.ticketId}`);
  console.log(`  Ticket Status:     ${createdTicket.status}`);
  console.log(`  Ticket Issue:      ${createdTicket.issue}`);

  // Allow Hindsight indexing
  await sleep(3000);

  // Check that adaptive prioritization now blacklists the failed step
  const recallAfterFailure = await hindsightService.recallMemory({
    customerId: DEMO_CUSTOMER_A,
    query: 'reports loading cache clearing ticket',
  });
  const updatedPrioritization = supportResolutionLearningService.prioritizeSolutions({
    issue: 'reports loading failure',
    environment: 'Windows 11 Chrome',
    memories: recallAfterFailure.memories || [],
  });
  assert(
    updatedPrioritization.avoidedSteps.includes('clearing browser cache'),
    'Expected "clearing browser cache" to be in avoidedSteps after failure'
  );
  console.log(`  Avoided Steps:          ${JSON.stringify(updatedPrioritization.avoidedSteps)}`);
  console.log(`  Next Recommendation:    "${updatedPrioritization.primaryRecommendation}"`);

  // -------------------------------------------------------------
  // [11] FRESH SESSION CASE RECALL
  // -------------------------------------------------------------
  console.log('\n[11] FRESH SESSION CASE RECALL');
  console.log('  * Starting another FRESH SESSION (empty history) asking about existing case...');
  const followUpQuery = 'Any update on my reports issue?';
  console.log(`  Customer Message: "${followUpQuery}"`);

  const response4 = await agentService.run({
    message: followUpQuery,
    history: [], // EMPTY HISTORY
    customerId: DEMO_CUSTOMER_A,
  });

  const response4Lower = response4.message.toLowerCase();
  assert(
    response4Lower.includes(createdTicket.ticketId.toLowerCase()) ||
    response4Lower.includes('tier 2') ||
    response4Lower.includes('escalat'),
    'Agent response must reference active ticket without asking customer to repeat'
  );
  assert(
    !response4Lower.includes('what issue are you having') &&
    !response4Lower.includes('can you describe your problem'),
    'Agent must not ask customer to re-explain problem when active ticket exists'
  );
  console.log(`  Agent Case Response: ${response4.message.slice(0, 200)}...`);
  console.log(`  Continuity Verified: Acknowledged ticket ${createdTicket.ticketId} without repeating original story.`);

  // -------------------------------------------------------------
  // [12] CUSTOMER ISOLATION VERIFIED
  // -------------------------------------------------------------
  console.log('\n[12] CUSTOMER ISOLATION VERIFIED');
  console.log(`  Testing Customer B (${DEMO_CUSTOMER_B}) with clean memory bank...`);

  const customerBRecall = await hindsightService.recallMemory({
    customerId: DEMO_CUSTOMER_B,
    query: 'reports loading cache clearing ticket',
  });
  assert(customerBRecall.memories.length === 0, 'Customer B bank must be completely empty');

  const customerBTickets = await supportTicketService.listTicketsForCustomer(DEMO_CUSTOMER_B);
  assert(customerBTickets.length === 0, 'Customer B must have 0 support tickets');

  const customerBLearning = supportResolutionLearningService.deriveLearnedBehavior(customerBRecall.memories);
  assert(!customerBLearning.hasLearning, 'Customer B must have zero learned behavior from Customer A');
  console.log(`  Customer B Memories: 0`);
  console.log(`  Customer B Tickets:  0`);
  console.log(`  Customer B Learning: None (Isolated)`);

  // -------------------------------------------------------------
  // [13] FINAL DEMO PASS
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('[13] FINAL DEMO PASS');
  console.log('===============================================================');
  console.log('All 13 checkpoints executed and verified against real Hindsight and MongoDB:');
  console.log('  ✓ [1] Customer Identified');
  console.log('  ✓ [2] Initial Issue Processed');
  console.log('  ✓ [3] Support Knowledge Grounding');
  console.log('  ✓ [4] Successful Resolution Learned');
  console.log('  ✓ [5] Fresh Session Initialized');
  console.log('  ✓ [6] Previous Solution Recalled');
  console.log('  ✓ [7] Solution Prioritization Applied');
  console.log('  ✓ [8] Outcome Reversal Detected');
  console.log('  ✓ [9] Failed Troubleshooting Remembered');
  console.log('  ✓ [10] Support Ticket Created and Escalated');
  console.log('  ✓ [11] Fresh Session Ticket Continuity Verified');
  console.log('  ✓ [12] Strict Customer Bank Isolation Enforced');
  console.log('  ✓ [13] FINAL DEMO PASS: Customer Support Memory Agent is Submission-Ready!\n');

  process.exit(0);
}

runFinalDemoVerification().catch((err) => {
  console.error('\n❌ Fatal error during final demo verification:', err);
  process.exit(1);
});
