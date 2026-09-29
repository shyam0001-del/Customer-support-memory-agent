import { userService } from '../user/user.service.js';

export const getUserProgressTool = {
  name: 'get_user_progress',
  description:
    "Retrieve the candidate's preparation and study progress, including completed topics, weak/focus topics, recently updated topics, and overall preparation statistics.",
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique ID of the candidate whose progress to retrieve.',
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
    const progress = await userService.getUserProgress(args.userId.trim());
    if (!progress) {
      throw new Error(`Candidate with userId "${args.userId}" was not found.`);
    }

    return progress;
  },
};
