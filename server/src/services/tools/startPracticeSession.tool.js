import { practiceService } from '../practice/practice.service.js';

export const startPracticeSessionTool = {
  name: 'start_practice_session',
  description:
    'Start a structured technical practice or mock interview session for a candidate with tailored questions, adaptive difficulty, and evaluation rubrics.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique candidate ID.',
      },
      mode: {
        type: 'string',
        description: 'Practice mode: "practice", "technical_interview", "hr_interview", or "mixed_interview".',
      },
      role: {
        type: 'string',
        description: 'Target role override (e.g. "Software Engineer", "Data Analyst", "Backend Developer").',
      },
      topic: {
        type: 'string',
        description: 'Interview focus topic (e.g. "SQL", "Data Structures & Algorithms", "System Design").',
      },
      difficulty: {
        type: 'string',
        description: 'Requested question difficulty: "easy", "medium", or "hard".',
      },
      questionCount: {
        type: 'number',
        description: 'Total number of questions for the session (1 to 10, default 5).',
      },
    },
    required: ['userId'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.userId || typeof args.userId !== 'string' || !args.userId.trim()) {
      throw new Error('Invalid argument: "userId" is required and must be a non-empty string.');
    }
  },

  async execute(args) {
    this.validate(args);
    const session = await practiceService.createSession({
      userId: args.userId.trim(),
      mode: args.mode,
      role: args.role,
      topic: args.topic,
      difficulty: args.difficulty,
      questionCount: args.questionCount,
    });

    const firstQ = session.questions[0];

    const questionObj = {
      questionId: firstQ?.questionId,
      question: firstQ?.question,
      topic: firstQ?.topic,
      difficulty: firstQ?.difficulty,
      type: firstQ?.type,
      expectedConcepts: firstQ?.expectedConcepts || [],
    };

    return {
      sessionId: session.id,
      mode: session.mode,
      role: session.role,
      topic: session.topic,
      difficulty: session.difficulty,
      questionCount: session.questionCount,
      currentQuestionIndex: 1,
      currentQuestion: questionObj,
      question: questionObj,
      firstQuestion: questionObj,
    };
  },
};
