import { practiceService } from '../practice/practice.service.js';

export const getPracticeHistoryTool = {
  name: 'get_practice_history',
  description:
    'Retrieve recent practice and mock interview sessions for a candidate, including average scores, topics practiced, and completion timestamps.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique candidate ID.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of sessions to return (default 5).',
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
    const history = await practiceService.getPracticeHistory(args.userId.trim(), args.limit || 5);

    return {
      count: history.length,
      sessions: history.map((s) => ({
        sessionId: s.id,
        mode: s.mode,
        role: s.role,
        topic: s.topic,
        difficulty: s.difficulty,
        status: s.status,
        score: s.score,
        totalQuestions: s.questionCount,
        answeredCount: s.questions?.filter((q) => q.score !== null)?.length || 0,
        createdAt: s.createdAt,
      })),
    };
  },
};
