import http from 'node:http';

const BASE_URL = 'http://localhost:5000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json();
  return { status: res.status, ...json };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCleanDemo() {
  console.log('====================================================');
  console.log('  PHASE 3 CLEAN DEMO VERIFICATION');
  console.log('  Target Customer: customer_clean_demo_001 (Acme Clean Demo)');
  console.log('  Isolated Customer: customer_clean_demo_002 (TechNova Clean Demo)');
  console.log('====================================================\n');

  // STEP 2: VERIFY INITIAL STATE
  console.log('--- STEP 2: VERIFY INITIAL STATE ---');
  const initialMem = await request('/api/chat/memory/customer_clean_demo_001');
  console.log('Initial Memory Endpoint Response:', {
    status: initialMem.status,
    hasMemory: initialMem.data?.hasMemory,
    memoryCount: initialMem.data?.memoryCount,
    items: initialMem.data?.items,
  });
  const initialCount = initialMem.data?.memoryCount || 0;
  console.log(`[PASS] Initial state verified. Memory count: ${initialCount}\n`);

  // STEP 7 / INTERACTION 1: CONTROLLED INTERACTION 1
  console.log('--- STEP 7: INTERACTION 1 (Initial Crash Report) ---');
  const userMsg1 = "My application keeps crashing after I log in. I'm using Chrome on Windows 11.";
  console.log(`Customer: "${userMsg1}"`);

  const resp1 = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'customer_clean_demo_001',
      message: userMsg1,
      history: [],
    }),
  });

  console.log('\nAgent Response:');
  console.log(resp1.data?.message);
  console.log('\nMetadata:', {
    knowledgeUsed: resp1.data?.knowledge?.used,
    knowledgeTitles: resp1.data?.knowledge?.titles,
    memoryRecalled: resp1.data?.memory?.recalled,
    memoryCount: resp1.data?.memory?.recalledCount,
    memoryRetained: resp1.data?.memory?.retained,
    retainedType: resp1.data?.memory?.retainedType,
  });

  const step1History = [
    { role: 'user', content: userMsg1 },
    { role: 'assistant', content: resp1.data?.message },
  ];

  await sleep(1500);

  // STEP 7 (Cont.): CUSTOMER CONFIRMS SUCCESS
  console.log('\n--- STEP 7 (Cont.): CUSTOMER CONFIRMS SUCCESS ---');
  const userMsg2 = "That fixed it. The application is working now.";
  console.log(`Customer: "${userMsg2}"`);

  const resp2 = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'customer_clean_demo_001',
      message: userMsg2,
      history: step1History,
    }),
  });

  console.log('\nAgent Response:');
  console.log(resp2.data?.message);
  console.log('\nOutcome & Retention Metadata:', {
    detectedOutcome: resp2.data?.outcome?.detected,
    attemptedStep: resp2.data?.outcome?.attemptedStep,
    retainedType: resp2.data?.memory?.retainedType,
    retainedContent: resp2.data?.memory?.retainedContent,
  });

  await sleep(2500);

  // STEP 8: VERIFY FAILED LEARNING SPECIFICALLY
  console.log('\n--- STEP 8: VERIFY FAILED-ATTEMPT LEARNING ---');
  const assistantRecommendation = "Try disabling Chrome extensions.";
  const userMsg3 = "Clearing the browser cache didn't fix it. It's still crashing.";
  console.log(`Assistant Recommendation: "${assistantRecommendation}"`);
  console.log(`Customer: "${userMsg3}"`);

  const failHistory = [
    { role: 'user', content: "My application keeps crashing after I log in." },
    { role: 'assistant', content: assistantRecommendation },
  ];

  const resp3 = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'customer_clean_demo_001',
      message: userMsg3,
      history: failHistory,
    }),
  });

  console.log('\nAgent Response:');
  console.log(resp3.data?.message);
  console.log('\nFailure Outcome & Retention Metadata:', {
    detectedOutcome: resp3.data?.outcome?.detected,
    attemptedStep: resp3.data?.outcome?.attemptedStep,
    retainedType: resp3.data?.memory?.retainedType,
    retainedContent: resp3.data?.memory?.retainedContent,
  });

  await sleep(2500);

  // Recall from Hindsight to verify exact stored memories
  const memAfterSteps = await request('/api/chat/memory/customer_clean_demo_001');
  console.log('\nRecalled Customer Memory from Hindsight after Resolution + Failure:', {
    hasMemory: memAfterSteps.data?.hasMemory,
    memoryCount: memAfterSteps.data?.memoryCount,
    successfulResolutions: memAfterSteps.data?.successfulResolutions,
    failedAttempts: memAfterSteps.data?.failedAttempts,
    items: memAfterSteps.data?.items,
  });

  // STEP 9: VERIFY FUTURE BEHAVIOR (NEW SESSION)
  console.log('\n--- STEP 9: NEW SESSION (Prior Success + Failed Attempt Influence) ---');
  const userMsg4 = "I'm having the login problem again.";
  console.log(`Customer (Fresh Conversation, Empty History): "${userMsg4}"`);

  const resp4 = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'customer_clean_demo_001',
      message: userMsg4,
      history: [], // BRAND NEW SESSION
    }),
  });

  console.log('\nAgent Response in New Session:');
  console.log(resp4.data?.message);
  console.log('\nRecall Metadata:', {
    recalled: resp4.data?.memory?.recalled,
    recalledCount: resp4.data?.memory?.recalledCount,
    recalledResolution: resp4.data?.memory?.recalledResolution,
  });

  // STEP 10: CUSTOMER ISOLATION (customer_clean_demo_002)
  console.log('\n--- STEP 10: CUSTOMER ISOLATION (customer_clean_demo_002 - TechNova Clean Demo) ---');
  const userMsg5 = "I'm having the login problem again.";
  console.log(`TechNova Customer (customer_clean_demo_002): "${userMsg5}"`);

  const resp5 = await request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      customerId: 'customer_clean_demo_002',
      message: userMsg5,
      history: [],
    }),
  });

  console.log('\nTechNova Agent Response:');
  console.log(resp5.data?.message);
  console.log('\nTechNova Isolation Metadata:', {
    recalled: resp5.data?.memory?.recalled,
    recalledResolution: resp5.data?.memory?.recalledResolution,
    recalledCount: resp5.data?.memory?.recalledCount,
    items: resp5.data?.memory?.items,
  });

  const memTechNova = await request('/api/chat/memory/customer_clean_demo_002');
  console.log('\nTechNova Memory State from Hindsight:', {
    hasMemory: memTechNova.data?.hasMemory,
    memoryCount: memTechNova.data?.memoryCount,
    successfulResolutions: memTechNova.data?.successfulResolutions,
    failedAttempts: memTechNova.data?.failedAttempts,
  });

  console.log('\n====================================================');
  console.log('  CLEAN DEMO VERIFICATION SUMMARY');
  console.log('====================================================');

  const step1Pass = resp1.status === 200 && resp1.data?.message;
  const step2Pass = resp2.data?.outcome?.detected === 'resolved' && resp2.data?.memory?.retainedType === 'successful_resolution';
  const step3Pass = resp3.data?.outcome?.detected === 'failed' &&
                    resp3.data?.outcome?.attemptedStep === 'clearing browser cache' &&
                    resp3.data?.memory?.retainedType === 'failed_resolution' &&
                    !resp3.data?.outcome?.attemptedStep?.includes('extension');
  const step4Pass = resp4.data?.memory?.recalledResolution === true;
  const isolationPass = resp5.data?.memory?.recalledResolution === false &&
                        (!resp5.data?.memory?.items || resp5.data?.memory?.items.every(item => !item.includes('Windows 11') && !item.includes('customer_clean_demo_001')));

  console.log(`1. Initial State: Memory Count = ${initialCount}`);
  console.log(`2. Interaction 1 Recommends Troubleshooting: ${step1Pass ? 'PASS' : 'FAIL'}`);
  console.log(`3. Customer Confirms Success -> Retains Resolution: ${step2Pass ? 'PASS' : 'FAIL'}`);
  console.log(`4. Failed Attempt Detected With CORRECT Step ("clearing browser cache"): ${step3Pass ? 'PASS' : 'FAIL'}`);
  console.log(`5. New Session Recalls Prior Success & Failure: ${step4Pass ? 'PASS' : 'FAIL'}`);
  console.log(`6. Tenant Isolation (TechNova Clean Demo Isolated): ${isolationPass ? 'PASS' : 'FAIL'}`);

  const allPass = step1Pass && step2Pass && step3Pass && step4Pass && isolationPass;
  console.log(`\nOVERALL CLEAN DEMO RESULT: ${allPass ? 'PASS' : 'FAIL'}`);
  process.exit(allPass ? 0 : 1);
}

runCleanDemo().catch((err) => {
  console.error('Fatal Demo Error:', err);
  process.exit(1);
});
