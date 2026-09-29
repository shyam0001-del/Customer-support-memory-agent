#!/usr/bin/env node
/**
 * CLI Runner for Phase 9 Agent Evaluation Benchmark
 * Usage: npm run evaluate:agent
 */

import { evaluationService } from '../src/services/evaluation/evaluation.service.js';

async function main() {
  console.log('\n[Phase 9] Starting Automated AI Placement Agent Evaluation Suite...');
  const startTime = Date.now();

  try {
    const { summary, results } = await evaluationService.runEvaluation();
    const report = evaluationService.formatReport(summary, results);

    console.log('\n' + report);
    console.log(`\nEvaluation completed in ${Date.now() - startTime}ms.\n`);

    if (summary.failedCases > 0) {
      console.warn(`[Evaluation Notice] ${summary.failedCases} case(s) failed evaluation criteria.`);
      process.exit(1);
    } else {
      console.log('✅ All evaluation test cases PASSED successfully!\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during evaluation run:', err);
    process.exit(1);
  }
}

main();
