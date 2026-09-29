import { userService } from '../user/user.service.js';

export const updateUserProgressTool = {
  name: 'update_user_progress',
  description:
    "Update or log study progress for an interview topic (e.g. record topic as 'completed', 'in_progress', 'weak', or 'needs_review') with optional reflection notes.",
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique ID of the candidate.',
      },
      topic: {
        type: 'string',
        description: 'The topic or concept name (e.g. "SQL joins", "Sliding Window", "Dynamic Programming", "B-Trees").',
      },
      status: {
        type: 'string',
        enum: ['completed', 'in_progress', 'needs_review', 'weak'],
        description: 'Current mastery status for this preparation topic.',
      },
      notes: {
        type: 'string',
        description: 'Optional notes, reflections, or practice takeaways.',
      },
    },
    required: ['userId', 'topic', 'status'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.userId || typeof args.userId !== 'string' || !args.userId.trim()) {
      throw new Error('Invalid argument: "userId" is required and must be a non-empty string.');
    }
    if (!args.topic || typeof args.topic !== 'string' || !args.topic.trim()) {
      throw new Error('Invalid argument: "topic" is required and must be a non-empty string.');
    }
    const allowed = ['completed', 'in_progress', 'needs_review', 'weak'];
    if (!args.status || !allowed.includes(args.status.toLowerCase().trim())) {
      throw new Error(`Invalid argument: "status" must be one of: ${allowed.join(', ')}.`);
    }
  },

  async execute(args) {
    this.validate(args);
    const result = await userService.updateUserProgress(args.userId.trim(), {
      topic: args.topic.trim(),
      status: args.status.toLowerCase().trim(),
      notes: typeof args.notes === 'string' ? args.notes.trim() : '',
    });

    if (!result) {
      throw new Error(`Candidate with userId "${args.userId}" was not found.`);
    }

    return {
      success: true,
      updatedTopic: result.topic,
      status: result.status,
      notes: result.notes,
      message: `Successfully updated progress for "${result.topic}" to status "${result.status}".`,
    };
  },
};
