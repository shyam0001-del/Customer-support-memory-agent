import { practiceService } from '../practice/practice.service.js';

export const getWeakPracticeTopicsTool = {
  name: 'get_weak_practice_topics',
  description:
    'Identify interview and practice topics where the candidate consistently underperforms (<65 average score or multiple weak attempts).',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique candidate ID.',
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
    const weakTopics = await practiceService.getWeakPracticeTopics(args.userId.trim());

    return {
      count: weakTopics.length,
      weakTopics,
    };
  },
};
