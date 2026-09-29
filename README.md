# Customer Support Memory Agent

> **"A customer-support agent that remembers what happened before, learns what works for each customer, and uses that memory to resolve future issues faster."**

Built for the Hindsight Hackathon, the **Customer Support Memory Agent** transforms technical customer support from a forgetful, repetitive back-and-forth into an adaptive, personalized resolution engine.

---

## 1. Problem: Why Support Today Fails Customers

Traditional customer support bots and helpdesks suffer from severe contextual amnesia:
- **Repetitive Questioning:** Every time a customer starts a new session or reaches out days later, they are asked the same questions: *"What operating system are you using?", "What browser are you on?", "Have you tried restarting?"*
- **Repeated Ineffective Steps:** When a troubleshooting step fails, the next agent or fresh chat session often blindly recommends the exact same failed step again.
- **Lost Preferences:** Customers who explicitly ask for *"one troubleshooting step at a time"* or *"concise technical instructions"* have to repeat their preferences in every single interaction.
- **Broken Escalation Context:** Escalated support tickets become isolated records disconnected from the customer's live chat experience.

---

## 2. Solution: Customer-Specific Long-Term Memory with Hindsight

The **Customer Support Memory Agent** makes **Hindsight persistent memory the central star** of the system:
1. **Durable Customer Knowledge:** Retains customer environment details (OS, browser, app versions) and preferences across sessions.
2. **Outcome-Driven Learning:** Detects whether troubleshooting recommendations succeeded or failed and records verified resolution memories.
3. **Adaptive Solution Prioritization:** Before deciding what to suggest, the agent prioritizes customer-specific and environment-specific past successes while strictly blacklisting previously failed steps.
4. **Ticket Lifecycle Continuity:** Automatically escalates unresolved cases into durable support tickets, records escalation context in Hindsight, and recognizes active cases in future fresh sessions without asking the customer to repeat their story.
5. **Strict Tenant Isolation:** Each customer's memory is cryptographically scoped to an isolated Hindsight bank ID (`bankId: customer_${cleanId}`).

---

## 3. Architecture & Data Flow

```
                      +-----------------------------+
                      |       Customer Query        |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    Customer Support Agent   |
                      +--------------+--------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
         v                           v                           v
+------------------+       +-------------------+       +-------------------+
| Hindsight Cloud  |       | Support Knowledge |       |  MongoDB Store    |
| (Customer Banks) |       | (Grounding Base)  |       | (Support Tickets) |
+--------+---------+       +---------+---------+       +---------+---------+
         |                           |                           |
         +---------------------------+---------------------------+
                                     |
                                     v
                      +-----------------------------+
                      | Adaptive Learning Engine    |
                      | - Priority A: Past Success  |
                      | - Priority B: Env Match     |
                      | - Priority C: Knowledge Doc |
                      | - Priority D: New Untried   |
                      | - Filter: Blacklist Failed  |
                      | - Precedence: Current Msg   |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Personalized Agent Response |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |      Outcome Detection      |
                      | (Success / Failure / Ticket)|
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | Hindsight Memory Retention  |
                      | (Future Context Updated)    |
                      +-----------------------------+
```

---

## 4. The Core Learning Loop

```
Previous Interaction
       ↓
Troubleshooting Attempt
       ↓
Outcome Detection (Resolved vs. Failed)
       ↓
Hindsight Memory Retention (successful_resolution / failed_resolution)
       ↓
Future Retrieval (Fresh Session)
       ↓
Adaptive Troubleshooting Prioritization
```

---

## 5. Technology Stack

- **Persistent Memory:** [Hindsight Client](https://github.com/vectorize-io/hindsight-client) (`@vectorize-io/hindsight-client`) connecting to Hindsight Cloud.
- **AI / LLM Orchestration:** Google Gen AI SDK (`@google/genai`) running `gemini-3.1-flash-lite` with zero-latency thinking budget and exponential retry backoff.
- **Backend API:** Node.js, Express.js (ES Modules), CORS, Rate Limiting.
- **Durable Persistence:** MongoDB & Mongoose (with in-memory fallback for headless offline test execution).
- **Frontend Dashboard:** React 19, Vite, Tailwind CSS, Lucide Icons.
- **Testing & Verification:** Node.js native test runner (`node --test`), Oxlint.

---

## 6. The 60-Second Demo Story

Persona: **Acme Corp (`customer_001` or `customer_hackathon_demo`)** on CloudDesk SaaS.

### Interaction 1 — Learn (0–20s)
1. Customer reports: *"Our reports page isn't loading. I'm on Windows 11 using Chrome."*
2. Agent consults Support Knowledge and recommends: *"Clearing your browser cache."*
3. Customer confirms: *"The cache clearing fixed it!"*
4. **Result:** Agent detects `resolved`, retains `successful_resolution` in Hindsight bank `customer_customer_001`.

### Interaction 2 — Remember & Prioritize (20–40s)
1. Presenter clicks **Fresh Session** (empty conversation history simulating days later).
2. Customer reports: *"Reports aren't loading again."*
3. Agent recalls prior resolution from Hindsight.
4. **Result:** Agent immediately prioritizes clearing the browser cache (`order: customer_success`). The customer is **never asked to repeat their OS, browser, or past experience**.

### Interaction 3 — Learn Again & Outcome Reversal (40–50s)
1. Customer says: *"I tried clearing the cache like last time, but it didn't fix it. Reports are still blank."*
2. Agent detects `failed` for cache clearing.
3. **Result:** Agent creates/escalates Support Ticket **CS-100x**, blacklists cache clearing from future recommendations, and pivots to the next best alternative (*"reducing report date range filter"*).

### Interaction 4 — Case Continuity Across Sessions (50–60s)
1. Presenter clicks **Fresh Session** again.
2. Customer asks: *"Any update on my reports issue?"*
3. **Result:** Agent recalls active ticket **CS-100x**, notes Tier 2 escalation, references past failed attempts, and **does not ask the customer to describe their issue again**.

---

## 7. Quickstart & Verification

### Prerequisites
- Node.js >= 20
- MongoDB running locally or via connection URI (falls back to in-memory store if offline)
- `HINDSIGHT_API_KEY` and `GEMINI_API_KEY` in `server/.env`

### Installation
```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### Running the Full Test Suite (253 Tests)
```bash
npm test --prefix server
```

### Running Phase-Specific Tests
```bash
npm run test:phase6 --prefix server  # Adaptive Support Intelligence (11 tests)
npm run test:phase5 --prefix server  # Ticket Lifecycle & Escalation (17 tests)
npm run test:phase4 --prefix server  # Customer Preference Learning (17 tests)
npm run test:phase3 --prefix server  # Support Knowledge & Outcomes (27 tests)
```

### Running the Live Hindsight Verification Script
```bash
# Executes the full 13-checkpoint demo against real Hindsight Cloud
npm run verify:final --prefix server
```

### Running the Evaluation Benchmark
```bash
# Evaluates Recall, Reuse, Avoidance, Preference, Continuity, and Isolation
npm run evaluate:support --prefix server
```

### Running Locally
```bash
# Start backend server (port 5000)
npm run dev --prefix server

# Start frontend application (port 5173)
npm run dev --prefix client
```

Open `http://localhost:5173` in your browser.

---

## 8. Customer Privacy & Tenant Isolation

- Customer memory banks are strictly partitioned by customer identifier.
- Customer B cannot access or recall Customer A's memory, preferences, resolutions, or tickets.
- Zero cross-tenant data leakage is verified in both regression tests and live verification benchmarks.
