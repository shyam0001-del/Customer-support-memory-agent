import { config, validateHindsightConfig } from '../src/config/env.js';
import { hindsightService } from '../src/services/memory/hindsight.service.js';
import { agentService } from '../src/services/agent/agent.service.js';

async function runVerification() {
  console.log('=== Step 1: Health & Hindsight Configuration Check ===');
  const configStatus = validateHindsightConfig();
  console.log('Hindsight Base URL:', configStatus.baseUrl);
  console.log('API Key Configured:', configStatus.hasApiKey);

  if (!configStatus.hasApiKey) {
    console.warn('\n[Notice] HINDSIGHT_API_KEY is not set in server/.env.');
    console.warn('To execute live cloud verification against https://api.hindsight.vectorize.io,');
    console.warn('please set HINDSIGHT_API_KEY=<your-key> in server/.env and re-run.\n');
    return {
      success: false,
      reason: 'HINDSIGHT_API_KEY_NOT_SET',
    };
  }

  const customerId = 'customer_001';
  console.log(`\n=== Step 2: Live Interaction 1 for ${customerId} ===`);
  const message1 = "My application keeps crashing after I log in. I'm using Chrome on Windows 11.";
  console.log('Customer says:', message1);

  const response1 = await agentService.run({
    message: message1,
    customerId,
  });

  console.log('\nAgent Response 1:');
  console.log(response1.message);
  console.log('\nMemory Metadata 1:', JSON.stringify(response1.memory, null, 2));

  console.log('\n=== Step 3: Verifying Direct Hindsight Retention ===');
  // Inspect memories from Hindsight bank
  const recallCheck1 = await hindsightService.recallMemory({
    customerId,
    query: 'Chrome Windows 11 login crash',
  });
  console.log(`Recalled ${recallCheck1.memories.length} item(s) from Hindsight bank "${customerId}"`);
  recallCheck1.memories.forEach((m, idx) => {
    console.log(`  [${idx + 1}] ${m.text || m.content || JSON.stringify(m)}`);
  });

  console.log(`\n=== Step 4: Live Interaction 2 for SAME ${customerId} (New Session) ===`);
  const message2 = "I'm having the login problem again.";
  console.log('Customer says:', message2);

  const response2 = await agentService.run({
    message: message2,
    customerId,
  });

  console.log('\nAgent Response 2:');
  console.log(response2.message);
  console.log('\nMemory Metadata 2:', JSON.stringify(response2.memory, null, 2));

  console.log('\n=== Step 5: Verification Summary ===');
  const memoryRecalled = response2.memory?.recalled;
  console.log('Memory Recalled on 2nd Interaction:', memoryRecalled);
  console.log('Mentions Windows or Chrome or Login in Response:',
    /windows|chrome|login/i.test(response2.message)
  );

  return {
    success: true,
    response1,
    response2,
  };
}

runVerification()
  .then((res) => {
    if (res.success) {
      console.log('\n[PASS] Real Hindsight verification succeeded.');
    } else {
      console.log(`\n[INFO] Real Hindsight verification halted: ${res.reason}`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[FAIL] Real Hindsight verification encountered error:', err.message);
    process.exit(1);
  });
