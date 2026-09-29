import { aiService } from '../ai/ai.service.js';
import { validateAiConfig } from '../../config/env.js';

export class AnswerEvaluationService {
  /**
   * Evaluate a candidate's practice/interview answer
   * @param {Object} params
   * @param {string} params.question
   * @param {Array<string>} params.expectedConcepts
   * @param {string} params.candidateAnswer
   * @param {string} [params.topic]
   * @param {string} [params.difficulty]
   * @param {string} [params.type]
   * @returns {Promise<Object>}
   */
  async evaluateAnswer({
    question,
    expectedConcepts = [],
    candidateAnswer = '',
    topic = 'General',
    difficulty = 'medium',
    type = 'conceptual',
  }) {
    if (!question || typeof question !== 'string') {
      throw new Error('Valid question string is required for evaluation.');
    }

    const cleanAnswer = typeof candidateAnswer === 'string' ? candidateAnswer.trim() : '';

    // If answer is empty or completely unattempted
    if (!cleanAnswer) {
      return {
        score: 0,
        correctness: 0,
        relevance: 0,
        clarity: 0,
        depth: 0,
        strengths: [],
        weaknesses: ['No answer provided by candidate.'],
        missingConcepts: [...expectedConcepts],
        feedback: 'You did not submit an answer for this question. Take a moment to review the expected core concepts and try attempting it.',
      };
    }

    // Try AI evaluation if configured
    const { isValid } = validateAiConfig();
    if (isValid) {
      try {
        const aiEval = await this._evaluateWithAi({
          question,
          expectedConcepts,
          candidateAnswer: cleanAnswer,
          topic,
          difficulty,
          type,
        });

        if (this.validateEvaluationStructure(aiEval)) {
          return this._sanitizeEvaluation(aiEval);
        }
      } catch (err) {
        console.warn('[AnswerEvaluation] AI evaluation fallback engaged:', err.message);
      }
    }

    // Fallback: Deterministic semantic concept-matching evaluation
    return this._evaluateDeterministically({
      question,
      expectedConcepts,
      candidateAnswer: cleanAnswer,
      difficulty,
    });
  }

  /**
   * Evaluate using the configured LLM provider
   */
  async _evaluateWithAi({ question, expectedConcepts, candidateAnswer, topic, difficulty, type }) {
    const systemPrompt =
      'You are a rigorous, constructive engineering interview examiner. ' +
      'Evaluate the candidate\'s answer to the technical interview question. ' +
      'Principles of Evaluation:\n' +
      '1. Distinguish "correct and well-explained" from "correct but incomplete" and "completely incorrect".\n' +
      '2. Focus on conceptual grasp and technical accuracy rather than rote verbatim phrasing.\n' +
      '3. You must respond strictly with a valid JSON object without markdown fences or additional text.\n\n' +
      'Required JSON Schema:\n' +
      '{\n' +
      '  "score": number (0-100 overall composite score),\n' +
      '  "correctness": number (0-100 technical truth),\n' +
      '  "relevance": number (0-100 answered the actual question asked),\n' +
      '  "clarity": number (0-100 structure, communication, terminology),\n' +
      '  "depth": number (0-100 thoroughness, edge cases, examples),\n' +
      '  "strengths": ["string", "string"],\n' +
      '  "weaknesses": ["string", "string"],\n' +
      '  "missingConcepts": ["string", "string"],\n' +
      '  "feedback": "string (constructive 2-3 sentence coaching summary)"\n' +
      '}';

    const userPrompt =
      `Question (${difficulty} ${type}): "${question}"\n` +
      `Topic: ${topic}\n` +
      `Expected Key Concepts: ${expectedConcepts.join(', ')}\n\n` +
      `Candidate Answer:\n"""${candidateAnswer}"""`;

    const response = await aiService.generateChatResponse([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    let text = response.message.trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();

    return JSON.parse(text);
  }

  /**
   * Deterministic concept-matching evaluation for offline tests or when AI is unavailable
   */
  _evaluateDeterministically({ question, expectedConcepts = [], candidateAnswer, difficulty }) {
    const answerLower = candidateAnswer.toLowerCase();
    const matched = [];
    const missing = [];

    for (const concept of expectedConcepts) {
      const words = concept.toLowerCase().split(/[\s,()/-]+/).filter((w) => w.length > 2);
      const isPresent = words.some((w) => answerLower.includes(w));
      if (isPresent) {
        matched.push(concept);
      } else {
        missing.push(concept);
      }
    }

    const conceptRatio = expectedConcepts.length > 0 ? matched.length / expectedConcepts.length : 0.6;
    const lengthScore = Math.min(candidateAnswer.length / 120, 1.0); // rewards thoughtful explanations > 120 chars

    const correctness = Math.round(conceptRatio * 85 + (lengthScore > 0.5 ? 15 : 5));
    const relevance = Math.round(conceptRatio > 0 ? 80 : 35);
    const clarity = Math.round(candidateAnswer.length > 30 ? 75 : 45);
    const depth = Math.round(conceptRatio * 60 + lengthScore * 40);

    const overallScore = Math.min(100, Math.max(0, Math.round(correctness * 0.4 + relevance * 0.25 + depth * 0.2 + clarity * 0.15)));

    const strengths = [];
    if (matched.length > 0) {
      strengths.push(`Addressed core concepts including: ${matched.slice(0, 2).join(', ')}.`);
    }
    if (candidateAnswer.length > 80) {
      strengths.push('Provided a structured explanation with sufficient contextual detail.');
    }

    const weaknesses = [];
    if (missing.length > 0) {
      weaknesses.push(`Omitted discussion of: ${missing.slice(0, 2).join(', ')}.`);
    }
    if (candidateAnswer.length < 50) {
      weaknesses.push('Answer was brief; incorporate practical code snippets or scenario use-cases.');
    }

    const feedback =
      overallScore >= 80
        ? 'Excellent technical response. You demonstrated accurate conceptual understanding and covered the necessary core elements.'
        : overallScore >= 50
        ? 'Solid foundational attempt. Your explanation captures the main idea, but needs deeper exploration of edge cases and supporting details.'
        : 'Your answer needs further technical development. Review the missing core concepts and practice articulating the mechanism clearly.';

    return {
      score: overallScore,
      correctness,
      relevance,
      clarity,
      depth,
      strengths: strengths.length > 0 ? strengths : ['Demonstrated willingness to engage with the technical problem.'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['Could provide additional real-world performance benchmarks.'],
      missingConcepts: missing,
      feedback,
    };
  }

  /**
   * Validate and sanitize structured evaluation object
   * @param {Object} evalObj
   * @param {Array<string>} [expectedConcepts]
   * @returns {Object}
   */
  validateStructuredEvaluation(evalObj, expectedConcepts = []) {
    if (!evalObj || typeof evalObj !== 'object') {
      return this._evaluateDeterministically({
        question: 'Question',
        expectedConcepts,
        candidateAnswer: '',
        difficulty: 'medium',
      });
    }

    const clamp = (val, fallback = 50) => {
      const num = Number(val);
      if (isNaN(num)) return fallback;
      return Math.min(100, Math.max(0, Math.round(num)));
    };

    return {
      score: clamp(evalObj.score, 50),
      correctness: clamp(evalObj.correctness, 50),
      relevance: clamp(evalObj.relevance, 50),
      clarity: clamp(evalObj.clarity, 50),
      depth: clamp(evalObj.depth, 50),
      strengths: Array.isArray(evalObj.strengths)
        ? evalObj.strengths.filter((s) => typeof s === 'string')
        : typeof evalObj.strengths === 'string'
        ? [evalObj.strengths]
        : [],
      weaknesses: Array.isArray(evalObj.weaknesses)
        ? evalObj.weaknesses.filter((w) => typeof w === 'string')
        : typeof evalObj.weaknesses === 'string'
        ? [evalObj.weaknesses]
        : [],
      missingConcepts: Array.isArray(evalObj.missingConcepts)
        ? evalObj.missingConcepts.filter((m) => typeof m === 'string')
        : [],
      feedback: typeof evalObj.feedback === 'string' ? evalObj.feedback.trim() : 'Evaluation completed.',
    };
  }

  /**
   * Validate that the evaluation object matches schema and bounds
   * @param {Object} evalObj
   * @returns {boolean}
   */
  validateEvaluationStructure(evalObj) {
    if (!evalObj || typeof evalObj !== 'object') return false;
    const requiredNumbers = ['score', 'correctness', 'relevance', 'clarity', 'depth'];
    for (const key of requiredNumbers) {
      if (typeof evalObj[key] !== 'number' || isNaN(evalObj[key])) return false;
    }
    if (!Array.isArray(evalObj.strengths)) return false;
    if (!Array.isArray(evalObj.weaknesses)) return false;
    if (!Array.isArray(evalObj.missingConcepts)) return false;
    if (typeof evalObj.feedback !== 'string') return false;
    return true;
  }

  /**
   * Sanitize numeric ranges and string values
   */
  _sanitizeEvaluation(e) {
    const clamp = (val) => Math.min(100, Math.max(0, Math.round(Number(val) || 0)));
    return {
      score: clamp(e.score),
      correctness: clamp(e.correctness),
      relevance: clamp(e.relevance),
      clarity: clamp(e.clarity),
      depth: clamp(e.depth),
      strengths: Array.isArray(e.strengths) ? e.strengths.filter((s) => typeof s === 'string') : [],
      weaknesses: Array.isArray(e.weaknesses) ? e.weaknesses.filter((w) => typeof w === 'string') : [],
      missingConcepts: Array.isArray(e.missingConcepts) ? e.missingConcepts.filter((m) => typeof m === 'string') : [],
      feedback: typeof e.feedback === 'string' ? e.feedback.trim() : 'Evaluation completed.',
    };
  }
}

export const answerEvaluationService = new AnswerEvaluationService();
