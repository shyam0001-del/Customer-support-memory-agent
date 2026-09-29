import { practiceService } from '../practice/practice.service.js';

export const getPracticeSessionTool = {
  name: 'get_practice_session',
  description:
    'Retrieve the current status, question history, and scores of an active or past interview practice session.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique candidate ID.',
      },
      sessionId: {
        type: 'string',
        description: 'The unique practice session ID.',
      },
    },
    required: ['userId', 'sessionId'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.userId || typeof args.userId !== 'string' || !args.userId.trim()) {
      throw new Error('Invalid argument: "userId" is required and must be a non-empty string.');
    }
    if (!args.sessionId || typeof args.sessionId !== 'string' || !args.sessionId.trim()) {
      throw new Error('Invalid argument: "sessionId" is required and must be a non-empty string.');
    }
  },

  async execute(args) {
    this.validate(args);
    const session = await practiceService.getSession(args.sessionId.trim(), args.userId.trim());

    return {
      id: session.id,
      sessionId: session.id,
      mode: session.mode,
      role: session.role,
      topic: session.topic,
      difficulty: session.difficulty,
      status: session.status,
      questionCount: session.questionCount,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestion: session.questions[session.currentQuestionIndex] || null,
      score: session.score,
      summary: session.summary,
    };
  },
};
