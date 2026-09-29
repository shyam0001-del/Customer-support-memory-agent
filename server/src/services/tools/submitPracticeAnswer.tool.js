import { practiceService } from '../practice/practice.service.js';

export const submitPracticeAnswerTool = {
  name: 'submit_practice_answer',
  description:
    'Submit the candidate’s answer to the active interview question. Evaluates technical accuracy, clarity, depth, and provides feedback, while adapting the next question.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique candidate ID.',
      },
      sessionId: {
        type: 'string',
        description: 'The active practice session ID.',
      },
      answer: {
        type: 'string',
        description: 'The candidate’s spoken or written technical response.',
      },
    },
    required: ['userId', 'sessionId', 'answer'],
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
    if (typeof args.answer !== 'string') {
      throw new Error('Invalid argument: "answer" must be a string.');
    }
  },

  async execute(args) {
    this.validate(args);
    const result = await practiceService.submitAnswer({
      userId: args.userId.trim(),
      sessionId: args.sessionId.trim(),
      answer: args.answer.trim(),
    });

    return result;
  },
};
