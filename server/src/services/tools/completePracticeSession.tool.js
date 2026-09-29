import { practiceService } from '../practice/practice.service.js';

export const completePracticeSessionTool = {
  name: 'complete_practice_session',
  description:
    'Explicitly conclude a practice session and generate the final diagnostic evaluation report with average score, strong areas, and recommended revision topics.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique candidate ID.',
      },
      sessionId: {
        type: 'string',
        description: 'The practice session ID to complete.',
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
    const session = await practiceService.completeSession(args.sessionId.trim(), args.userId.trim());

    return {
      sessionId: session.id,
      status: session.status,
      score: session.score,
      summary: session.summary,
      completedAt: session.completedAt,
    };
  },
};
