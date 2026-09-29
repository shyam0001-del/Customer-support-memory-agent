import { aiService } from '../ai/ai.service.js';
import { validateAiConfig } from '../../config/env.js';
import { QUESTION_TYPES, QUESTION_DIFFICULTIES } from '../../models/practiceSession.model.js';

// Curated bank of placement interview questions for deterministic fallback and test reliability
const QUESTION_BANK = [
  // SQL
  {
    topic: 'SQL',
    type: 'sql',
    difficulty: 'easy',
    question: 'Explain the difference between WHERE and HAVING clauses in SQL with a simple example.',
    expectedConcepts: ['filtering rows before aggregation', 'filtering aggregated groups', 'GROUP BY clause', 'aggregate functions (COUNT, SUM)'],
  },
  {
    topic: 'SQL',
    type: 'sql',
    difficulty: 'medium',
    question: 'How do window functions differ from aggregate functions with GROUP BY? Explain the purpose of PARTITION BY and OVER().',
    expectedConcepts: ['preserves individual row identity', 'OVER clause', 'PARTITION BY division of rows', 'ORDER BY window frame', 'ranking functions (ROW_NUMBER, RANK, DENSE_RANK)'],
  },
  {
    topic: 'SQL',
    type: 'sql',
    difficulty: 'hard',
    question: 'Explain how you would identify and eliminate duplicate records in a large table without a primary key using CTEs and ROW_NUMBER().',
    expectedConcepts: ['Common Table Expressions (WITH)', 'ROW_NUMBER() OVER(PARTITION BY)', 'DELETE filtering row_num > 1', 'performance implications on large datasets'],
  },

  // DSA / Coding
  {
    topic: 'Data Structures & Algorithms',
    type: 'coding',
    difficulty: 'easy',
    question: 'Describe an optimal approach to determine if an array contains duplicate elements. What are the time and space trade-offs?',
    expectedConcepts: ['HashSet / HashMap lookup', 'O(N) time complexity', 'O(N) space complexity', 'sorting approach trade-off O(N log N) with O(1) space'],
  },
  {
    topic: 'Data Structures & Algorithms',
    type: 'coding',
    difficulty: 'medium',
    question: 'Explain the Two-Pointer approach versus Sliding Window for subarray sum problems. When is each applicable?',
    expectedConcepts: ['two pointers on sorted arrays', 'sliding window on contiguous subsegments', 'expanding and shrinking window bounds', 'O(N) amortized time complexity'],
  },
  {
    topic: 'Data Structures & Algorithms',
    type: 'coding',
    difficulty: 'hard',
    question: 'Explain how topological sort works using Kahn’s Algorithm (BFS) and how it detects cycles in a directed graph.',
    expectedConcepts: ['indegree array calculation', 'queue of zero-indegree vertices', 'decrementing neighbor indegrees', 'cycle detection if visited count < total vertices'],
  },

  // Backend / Node.js
  {
    topic: 'Backend Development',
    type: 'conceptual',
    difficulty: 'easy',
    question: 'What is the Node.js Event Loop and how does non-blocking I/O allow single-threaded concurrency?',
    expectedConcepts: ['call stack and callback queue', 'libuv threadpool for async operations', 'event loop phases (timers, poll, check)', 'non-blocking system calls'],
  },
  {
    topic: 'Backend Development',
    type: 'conceptual',
    difficulty: 'medium',
    question: 'Explain how database indexing works (B-Trees) and what trade-offs indexes introduce for read versus write workloads.',
    expectedConcepts: ['B-Tree balanced tree structure', 'fast logarithmic read lookups O(log N)', 'write amplification on INSERT/UPDATE/DELETE', 'index overhead and storage cost'],
  },
  {
    topic: 'Backend Development',
    type: 'scenario',
    difficulty: 'hard',
    question: 'Design a distributed rate-limiting strategy for high-throughput APIs. Discuss Token Bucket versus Leaky Bucket using Redis.',
    expectedConcepts: ['Token Bucket algorithm', 'sliding window counter', 'atomic Redis operations (INCR, MULTI/EXEC or Lua scripts)', 'handling distributed concurrency and clock drift'],
  },

  // Frontend / React
  {
    topic: 'Frontend Development',
    type: 'conceptual',
    difficulty: 'easy',
    question: 'Explain the difference between state and props in React, and why state mutations must be immutable.',
    expectedConcepts: ['props are read-only inputs passed by parent', 'state is internal mutable component memory', 'shallow reference comparison for re-rendering', 'immutability guarantees predictable UI updates'],
  },
  {
    topic: 'Frontend Development',
    type: 'conceptual',
    difficulty: 'medium',
    question: 'What is the React Virtual DOM diffing algorithm and how do unique keys optimize list reconciliation?',
    expectedConcepts: ['Virtual DOM in-memory representation', 'reconciliation algorithm (O(N) heuristics)', 'keys provide stable identity across renders', 'preventing unnecessary DOM subtree re-creations'],
  },

  // Behavioral / HR
  {
    topic: 'Behavioral',
    type: 'behavioral',
    difficulty: 'easy',
    question: 'Tell me about a technical project you built recently. What was your technical stack, and what was the main engineering challenge?',
    expectedConcepts: ['clear project scope & stack rationale', 'specific technical challenge encountered', 'problem-solving methodology', 'quantifiable outcomes or lessons learned'],
  },
  {
    topic: 'Behavioral',
    type: 'behavioral',
    difficulty: 'medium',
    question: 'Describe a situation where you had a disagreement with a teammate or peer regarding code architecture or design. How did you resolve it?',
    expectedConcepts: ['constructive objective communication', 'focusing on engineering data/benchmarks rather than ego', 'collaborative consensus or prototyping solutions', 'team alignment and reflection'],
  },

  // Data Science & ML
  {
    topic: 'Data Science & Machine Learning',
    type: 'conceptual',
    difficulty: 'medium',
    question: 'Explain the bias-variance tradeoff in machine learning and how regularization techniques (L1 vs L2) mitigate overfitting.',
    expectedConcepts: ['bias as underfitting / model assumptions', 'variance as overfitting / sensitivity to training noise', 'L1 Lasso driving weights to zero (feature selection)', 'L2 Ridge penalizing large weight magnitudes'],
  },
  {
    topic: 'Statistics & Probability',
    type: 'conceptual',
    difficulty: 'medium',
    question: 'What is the Central Limit Theorem and how is it utilized in A/B testing hypothesis evaluation?',
    expectedConcepts: ['distribution of sample means approximates normal distribution regardless of underlying distribution', 'standard error calculation', 'p-value and significance threshold alpha', 'confidence interval estimation'],
  },
];

export class QuestionGeneratorService {
  /**
   * Generate a structured practice or interview question
   * @param {Object} options
   * @param {string} [options.role]
   * @param {string} [options.topic]
   * @param {string} [options.difficulty]
   * @param {string} [options.type]
   * @param {string} [options.mode]
   * @param {Array<string>} [options.previousQuestions]
   * @param {Array<string>} [options.candidateGaps]
   * @returns {Promise<Object>}
   */
  async generateQuestion({
    role = 'Software Engineer',
    topic = 'General',
    difficulty = 'medium',
    type = 'conceptual',
    mode = 'practice',
    previousQuestions = [],
    candidateGaps = [],
  } = {}) {
    const cleanDifficulty = QUESTION_DIFFICULTIES.includes(difficulty?.toLowerCase())
      ? difficulty.toLowerCase()
      : 'medium';

    const cleanType = QUESTION_TYPES.includes(type?.toLowerCase())
      ? type.toLowerCase()
      : mode === 'behavioral' || mode === 'hr_interview'
      ? 'behavioral'
      : 'conceptual';

    const cleanTopic = topic && topic.trim() && topic !== 'General'
      ? topic.trim()
      : candidateGaps.length > 0
      ? candidateGaps[0]
      : role.includes('Analyst')
      ? 'SQL'
      : role.includes('Backend')
      ? 'Backend Development'
      : role.includes('Frontend')
      ? 'Frontend Development'
      : role.includes('Scientist') || role.includes('Learning')
      ? 'Data Science & Machine Learning'
      : 'Data Structures & Algorithms';

    // Check if live AI is configured
    const { isValid } = validateAiConfig();

    if (isValid) {
      try {
        const aiQuestion = await this._generateWithAi({
          role,
          topic: cleanTopic,
          difficulty: cleanDifficulty,
          type: cleanType,
          mode,
          previousQuestions,
        });

        if (aiQuestion && this.validateQuestionStructure(aiQuestion)) {
          return {
            questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            ...aiQuestion,
          };
        }
      } catch (err) {
        console.warn('[QuestionGenerator] AI question generation fallback engaged:', err.message);
      }
    }

    // Fallback: Pick or format deterministic curated question from bank
    return this._generateFromBank({
      topic: cleanTopic,
      difficulty: cleanDifficulty,
      type: cleanType,
      role,
      previousQuestions,
    });
  }

  /**
   * Internal generator using AI Service
   */
  async _generateWithAi({ role, topic, difficulty, type, mode, previousQuestions }) {
    const systemPrompt =
      'You are a senior technical interviewer creating rigorous, clear placement interview questions for engineering candidates. ' +
      'Generate exactly one structured technical or behavioral interview question. ' +
      'You must respond ONLY with a valid JSON object without markdown formatting or code fences. ' +
      'Required JSON schema:\n' +
      '{\n' +
      '  "question": "string (the interview question)",\n' +
      '  "topic": "string (the primary technical topic)",\n' +
      '  "difficulty": "easy" | "medium" | "hard",\n' +
      '  "type": "conceptual" | "coding" | "sql" | "behavioral" | "scenario",\n' +
      '  "expectedConcepts": ["concept 1", "concept 2", "concept 3"]\n' +
      '}';

    const userPrompt =
      `Target Role: ${role}\n` +
      `Topic: ${topic}\n` +
      `Difficulty: ${difficulty}\n` +
      `Question Type: ${type}\n` +
      `Interview Mode: ${mode}\n` +
      (previousQuestions.length > 0 ? `Do NOT repeat these previous questions:\n- ${previousQuestions.join('\n- ')}` : '');

    const response = await aiService.generateChatResponse([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    let text = response.message.trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();

    const parsed = JSON.parse(text);
    return {
      question: parsed.question,
      topic: parsed.topic || topic,
      difficulty: QUESTION_DIFFICULTIES.includes(parsed.difficulty) ? parsed.difficulty : difficulty,
      type: QUESTION_TYPES.includes(parsed.type) ? parsed.type : type,
      expectedConcepts: Array.isArray(parsed.expectedConcepts) ? parsed.expectedConcepts : [],
    };
  }

  /**
   * Deterministic fallback generator from curated question bank
   */
  _generateFromBank({ topic, difficulty, type, role, previousQuestions = [] }) {
    const topicLower = topic.toLowerCase();

    // Find candidate questions matching topic and difficulty
    let candidates = QUESTION_BANK.filter(
      (q) =>
        (q.topic.toLowerCase().includes(topicLower) || topicLower.includes(q.topic.toLowerCase())) &&
        q.difficulty === difficulty
    );

    // Fallback 1: match topic regardless of difficulty
    if (candidates.length === 0) {
      candidates = QUESTION_BANK.filter(
        (q) => q.topic.toLowerCase().includes(topicLower) || topicLower.includes(q.topic.toLowerCase())
      );
    }

    // Fallback 2: match question type
    if (candidates.length === 0) {
      candidates = QUESTION_BANK.filter((q) => q.type === type);
    }

    // Fallback 3: all bank questions
    if (candidates.length === 0) {
      candidates = QUESTION_BANK;
    }

    // Avoid questions already asked in this session
    const unused = candidates.filter((q) => !previousQuestions.includes(q.question));
    const selected = unused.length > 0 ? unused[0] : candidates[0];

    return {
      questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question: selected.question,
      topic: topic || selected.topic,
      difficulty: selected.difficulty,
      type: selected.type,
      expectedConcepts: selected.expectedConcepts,
    };
  }

  /**
   * Validate structured question output
   * @param {Object} q
   * @returns {boolean}
   */
  validateQuestionStructure(q) {
    if (!q || typeof q !== 'object') return false;
    if (!q.question || typeof q.question !== 'string' || !q.question.trim()) return false;
    if (!q.topic || typeof q.topic !== 'string') return false;
    if (!QUESTION_DIFFICULTIES.includes(q.difficulty)) return false;
    if (!QUESTION_TYPES.includes(q.type)) return false;
    if (!Array.isArray(q.expectedConcepts) || q.expectedConcepts.length === 0) return false;
    return true;
  }

  /**
   * Validate and sanitize structured question, falling back to curated bank if invalid
   */
  validateStructuredQuestion(
    parsed,
    defaultTopic = 'General',
    defaultDifficulty = 'medium',
    defaultType = 'conceptual'
  ) {
    if (!parsed || typeof parsed !== 'object') {
      return this._generateFromBank({
        topic: defaultTopic,
        difficulty: defaultDifficulty,
        type: defaultType,
      });
    }

    const qText =
      typeof parsed.question === 'string' && parsed.question.trim().length >= 10
        ? parsed.question.trim()
        : null;

    if (!qText) {
      return this._generateFromBank({
        topic: defaultTopic,
        difficulty: defaultDifficulty,
        type: defaultType,
      });
    }

    return {
      questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      question: qText,
      topic: typeof parsed.topic === 'string' && parsed.topic.trim() ? parsed.topic.trim() : defaultTopic,
      difficulty: QUESTION_DIFFICULTIES.includes(parsed.difficulty) ? parsed.difficulty : defaultDifficulty,
      type: QUESTION_TYPES.includes(parsed.type) ? parsed.type : defaultType,
      expectedConcepts: Array.isArray(parsed.expectedConcepts) && parsed.expectedConcepts.length > 0
        ? parsed.expectedConcepts
        : ['core mechanics', 'syntax and implementation', 'edge cases'],
    };
  }
}

export const questionGeneratorService = new QuestionGeneratorService();
