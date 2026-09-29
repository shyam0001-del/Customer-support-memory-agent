import mongoose from 'mongoose';
import {
  PracticeSession,
  PRACTICE_MODES,
  QUESTION_DIFFICULTIES,
} from '../../models/practiceSession.model.js';
import { isDatabaseConnected } from '../../config/db.js';
import { questionGeneratorService } from './questionGenerator.service.js';
import { answerEvaluationService } from './answerEvaluation.service.js';
import { userService } from '../user/user.service.js';
import { memoryService } from '../memory/memory.service.js';
import { placementIntelligenceService } from '../placement/placementIntelligence.service.js';

// In-memory fallback map for headless unit testing when MongoDB is disconnected
const inMemorySessions = new Map();

export class PracticeService {
  /**
   * Start a new practice or mock interview session
   */
  async createSession({
    userId,
    mode = 'practice',
    role = null,
    topic = null,
    difficulty = 'medium',
    questionCount = 5,
  }) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Valid "userId" is required to start a practice session.');
    }

    const cleanUserId = userId.trim();
    const cleanMode = (mode || 'practice').toLowerCase().trim();
    if (!PRACTICE_MODES.includes(cleanMode)) {
      throw new Error(`Invalid practice mode "${mode}". Allowed modes: ${PRACTICE_MODES.join(', ')}`);
    }

    const cleanDifficulty = (difficulty || 'medium').toLowerCase().trim();
    if (!QUESTION_DIFFICULTIES.includes(cleanDifficulty)) {
      throw new Error(
        `Invalid difficulty "${difficulty}". Allowed difficulties: ${QUESTION_DIFFICULTIES.join(', ')}`
      );
    }

    const countNum = Number(questionCount);
    if (isNaN(countNum) || countNum < 1 || countNum > 10) {
      throw new Error('Question count must be an integer between 1 and 10.');
    }

    // Attempt to load candidate profile to personalize role and priority topics
    let candidate = null;
    try {
      candidate = await userService.getUserById(cleanUserId);
    } catch {
      candidate = null;
    }

    const targetRole = role && role.trim() ? role.trim() : candidate?.targetRole || 'Software Engineer';

    // If topic is omitted, use candidate's highest priority skill gap or profile weak area
    let targetTopic = topic && topic.trim() ? topic.trim() : null;
    let candidateGaps = [];

    if (!targetTopic) {
      try {
        const analysis = await placementIntelligenceService.generatePlacementAnalysis({
          userId: cleanUserId,
          candidateProfile: candidate,
          role: targetRole,
        });
        if (analysis?.priorities?.length > 0) {
          targetTopic = analysis.priorities[0].skill;
          candidateGaps = analysis.priorities.map((p) => p.skill);
        }
      } catch {
        targetTopic = candidate?.weakAreas?.[0] || 'General';
      }
    }

    if (!targetTopic) {
      targetTopic = 'General';
    }

    // Determine initial question type based on mode and topic
    const questionType =
      cleanMode === 'hr_interview'
        ? 'behavioral'
        : targetTopic.toLowerCase().includes('sql')
        ? 'sql'
        : targetTopic.toLowerCase().includes('data structure') || targetTopic.toLowerCase().includes('algorithm')
        ? 'coding'
        : 'conceptual';

    // Generate first question
    const firstQuestion = await questionGeneratorService.generateQuestion({
      role: targetRole,
      topic: targetTopic,
      difficulty: cleanDifficulty,
      type: questionType,
      mode: cleanMode,
      previousQuestions: [],
      candidateGaps,
    });

    const sessionData = {
      userId: cleanUserId,
      mode: cleanMode,
      role: targetRole,
      topic: targetTopic,
      difficulty: cleanDifficulty,
      status: 'in_progress',
      questionCount: countNum,
      currentQuestionIndex: 0,
      questions: [firstQuestion],
      startedAt: new Date(),
    };

    if (isDatabaseConnected()) {
      const created = new PracticeSession(sessionData);
      await created.save();
      return created.toJSON();
    }

    // In-memory fallback for unit testing
    const fakeId = new mongoose.Types.ObjectId().toString();
    const fallbackRecord = {
      id: fakeId,
      ...sessionData,
      currentQuestion: firstQuestion,
      questions: [firstQuestion],
      score: null,
      summary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemorySessions.set(fakeId, fallbackRecord);
    return fallbackRecord;
  }

  /**
   * Retrieve a practice session by ID with ownership verification
   */
  async getSession(sessionId, userId = null) {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Valid "sessionId" is required.');
    }

    let session = null;
    if (isDatabaseConnected()) {
      const doc = await PracticeSession.findById(sessionId.trim());
      if (doc) session = doc.toJSON();
    } else {
      session = inMemorySessions.get(sessionId.trim()) || null;
      if (session) {
        session.currentQuestion = session.questions[session.currentQuestionIndex || 0] || null;
      }
    }

    if (!session) {
      throw new Error(`Practice session "${sessionId}" was not found.`);
    }

    // User isolation check
    if (userId && session.userId !== userId.trim()) {
      throw new Error('Access denied: You do not have permission to view this practice session.');
    }

    return session;
  }

  /**
   * Retrieve active in-progress session for a candidate
   */
  async getActiveSession(userId) {
    if (!userId) return null;
    const cleanUserId = userId.trim();

    if (isDatabaseConnected()) {
      const doc = await PracticeSession.findOne({ userId: cleanUserId, status: 'in_progress' })
        .sort({ createdAt: -1 });
      return doc ? doc.toJSON() : null;
    }

    for (const item of inMemorySessions.values()) {
      if (item.userId === cleanUserId && item.status === 'in_progress') {
        return item;
      }
    }
    return null;
  }

  /**
   * Submit an answer to the current question, evaluate it, and adapt next question
   */
  async submitAnswer({ userId, sessionId, answer }) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Valid "userId" is required.');
    }
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new Error('Valid "sessionId" is required.');
    }
    if (typeof answer !== 'string') {
      throw new Error('Answer must be a string.');
    }

    const session = await this.getSession(sessionId.trim(), userId.trim());

    if (session.status !== 'in_progress') {
      throw new Error(`Session is already ${session.status}. Cannot submit further answers.`);
    }

    const currIdx = session.currentQuestionIndex;
    const currentQ = session.questions[currIdx];
    if (!currentQ) {
      throw new Error('Current question not found in session.');
    }

    // Evaluate answer via evaluation service
    const evaluation = await answerEvaluationService.evaluateAnswer({
      question: currentQ.question,
      expectedConcepts: currentQ.expectedConcepts || [],
      candidateAnswer: answer.trim(),
      topic: currentQ.topic,
      difficulty: currentQ.difficulty,
      type: currentQ.type,
    });

    // Update question in session record
    currentQ.answer = answer.trim();
    currentQ.answeredAt = new Date();
    currentQ.evaluation = evaluation;
    currentQ.score = evaluation.score;

    // Adaptive difficulty for next question
    let nextDifficulty = currentQ.difficulty;
    if (evaluation.score >= 80) {
      // Strong performance: challenge candidate
      if (currentQ.difficulty === 'easy') nextDifficulty = 'medium';
      else if (currentQ.difficulty === 'medium') nextDifficulty = 'hard';
    } else if (evaluation.score < 50) {
      // Poor performance: reinforce or lower difficulty
      if (currentQ.difficulty === 'hard') nextDifficulty = 'medium';
      else if (currentQ.difficulty === 'medium') nextDifficulty = 'easy';
    }

    const isComplete = currIdx + 1 >= session.questionCount;
    let nextQuestion = null;

    if (!isComplete) {
      // Generate next question
      const prevQuestionTexts = session.questions.map((q) => q.question);
      nextQuestion = await questionGeneratorService.generateQuestion({
        role: session.role,
        topic: currentQ.topic, // maintain topic or adapt
        difficulty: nextDifficulty,
        type: currentQ.type,
        mode: session.mode,
        previousQuestions: prevQuestionTexts,
      });

      session.questions.push(nextQuestion);
      session.currentQuestionIndex = currIdx + 1;
    } else {
      // Mark session complete & generate summary
      session.status = 'completed';
      session.completedAt = new Date();
      session.summary = this._calculateSummary(session.questions);
      session.score = session.summary.averageScore;
    }

    // Update session persistence
    await this._updateSessionRecord(session);

    // Progress Integration (Phase 3)
    try {
      await this._syncProgressAfterAnswer(userId.trim(), currentQ.topic, evaluation.score);
    } catch (err) {
      console.warn('[PracticeService] Progress sync failed:', err.message);
    }

    // Memory Integration (Phase 4): store recurring weakness or breakthrough
    try {
      await this._syncMemoryAfterAnswer(userId.trim(), currentQ.topic, evaluation.score);
    } catch (err) {
      console.warn('[PracticeService] Memory sync failed:', err.message);
    }

    return {
      sessionId: session.id,
      questionIndex: currIdx + 1,
      currentQuestionIndex: currIdx + 1,
      totalQuestions: session.questionCount,
      evaluatedQuestion: currentQ.question,
      evaluation,
      isComplete,
      isCompleted: isComplete,
      nextQuestion: nextQuestion
        ? {
            questionId: nextQuestion.questionId,
            question: nextQuestion.question,
            topic: nextQuestion.topic,
            difficulty: nextQuestion.difficulty,
            type: nextQuestion.type,
            expectedConcepts: nextQuestion.expectedConcepts,
          }
        : null,
      summary: session.summary || null,
    };
  }

  /**
   * Complete a session explicitly
   */
  async completeSession(sessionId, userId) {
    const session = await this.getSession(sessionId, userId);
    if (session.status !== 'completed') {
      session.status = 'completed';
      session.completedAt = new Date();
      session.summary = this._calculateSummary(session.questions);
      session.score = session.summary.averageScore;
      await this._updateSessionRecord(session);
    }
    return session;
  }

  /**
   * Retrieve practice session history for a user
   */
  async getPracticeHistory(userId, limit = 10) {
    if (!userId || typeof userId !== 'string') return [];
    const cleanUserId = userId.trim();
    const numLimit = Math.max(1, Math.min(Number(limit) || 10, 50));

    if (isDatabaseConnected()) {
      const docs = await PracticeSession.find({ userId: cleanUserId })
        .sort({ createdAt: -1 })
        .limit(numLimit);
      return docs.map((d) => d.toJSON());
    }

    const results = [];
    for (const item of inMemorySessions.values()) {
      if (item.userId === cleanUserId) {
        results.push(item);
      }
    }
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return results.slice(0, numLimit);
  }

  /**
   * Aggregate topics where candidate performance is weak (< 60 average score)
   */
  async getWeakPracticeTopics(userId) {
    if (!userId || typeof userId !== 'string') return [];
    const sessions = await this.getPracticeHistory(userId.trim(), 50);

    const topicStats = new Map();

    for (const session of sessions) {
      if (!Array.isArray(session.questions)) continue;
      for (const q of session.questions) {
        if (!q.evaluation || typeof q.score !== 'number') continue;
        const topic = q.topic || 'General';
        const existing = topicStats.get(topic) || { totalScore: 0, count: 0, weakCount: 0 };
        existing.totalScore += q.score;
        existing.count += 1;
        if (q.score < 60) existing.weakCount += 1;
        topicStats.set(topic, existing);
      }
    }

    const weakTopics = [];
    for (const [topic, stats] of topicStats.entries()) {
      const avgScore = Math.round(stats.totalScore / stats.count);
      if (avgScore < 65 || stats.weakCount >= 2) {
        weakTopics.push({
          topic,
          attempts: stats.count,
          weakCount: stats.weakCount,
          averageScore: avgScore,
          status: avgScore < 45 ? 'critical_weakness' : 'needs_review',
        });
      }
    }

    weakTopics.sort((a, b) => a.averageScore - b.averageScore);
    return weakTopics;
  }

  /**
   * Clear in-memory sessions for clean unit tests
   */
  clearMemory() {
    inMemorySessions.clear();
  }

  /**
   * Internal helper: calculate session summary
   */
  _calculateSummary(questions = []) {
    const answered = questions.filter((q) => q.score !== null && typeof q.score === 'number');
    const totalScore = answered.reduce((sum, q) => sum + q.score, 0);
    const averageScore = answered.length > 0 ? Math.round(totalScore / answered.length) : 0;

    const strongAreas = [];
    const weakTopics = [];

    for (const q of answered) {
      if (q.score >= 75 && !strongAreas.includes(q.topic)) {
        strongAreas.push(q.topic);
      } else if (q.score < 60 && !weakTopics.includes(q.topic)) {
        weakTopics.push(q.topic);
      }
    }

    const recommendations = [];
    if (weakTopics.length > 0) {
      recommendations.push(
        `Focus subsequent preparation sessions on reinforcing: ${weakTopics.join(', ')}.`
      );
    }
    if (averageScore >= 80) {
      recommendations.push('Strong interview pacing. Challenge yourself with Hard difficulty scenarios.');
    } else {
      recommendations.push('Incorporate code examples and explicit edge cases to elevate answer depth.');
    }

    return {
      averageScore,
      totalQuestions: questions.length,
      answeredQuestions: answered.length,
      strongAreas,
      weakAreas: weakTopics,
      weakTopics,
      recommendations: recommendations.join(' '),
    };
  }

  /**
   * Internal helper: update persistence record
   */
  async _updateSessionRecord(session) {
    if (isDatabaseConnected()) {
      await PracticeSession.findByIdAndUpdate(session.id, {
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        questions: session.questions,
        score: session.score,
        summary: session.summary,
        completedAt: session.completedAt,
      });
    } else {
      session.updatedAt = new Date();
      inMemorySessions.set(session.id, session);
    }
  }

  /**
   * Synchronize practice results to candidate preparation progress (Phase 3)
   */
  async _syncProgressAfterAnswer(userId, topic, score) {
    let progressStatus = 'in_progress';
    if (score >= 80) progressStatus = 'in_progress';
    else if (score < 50) progressStatus = 'weak';
    else progressStatus = 'in_progress';

    await userService.updateProgress({
      userId,
      topic,
      status: progressStatus,
      notes: `Practice answer score: ${score}/100.`,
    });
  }

  /**
   * Synchronize persistent weakness or breakthrough into long-term memory (Phase 4)
   */
  async _syncMemoryAfterAnswer(userId, topic, score) {
    if (score < 45) {
      await memoryService.createOrUpdateMemory({
        userId,
        type: 'weakness',
        key: `${topic} Practice`,
        value: `Struggled with ${topic} during practice session (scored ${score}/100).`,
        confidence: 0.85,
        importance: 0.8,
        source: 'evaluation',
      });
    } else if (score >= 90) {
      await memoryService.createOrUpdateMemory({
        userId,
        type: 'achievement',
        key: `${topic} Mastery`,
        value: `Demonstrated high technical mastery in ${topic} practice (scored ${score}/100).`,
        confidence: 0.9,
        importance: 0.75,
        source: 'evaluation',
      });
    }
  }

  /**
   * Clear in-memory sessions cache (for testing)
   */
  clearMemory() {
    inMemorySessions.clear();
  }
}

export const practiceService = new PracticeService();
