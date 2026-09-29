import { memoryService } from '../memory/memory.service.js';
import { ALLOWED_MEMORY_TYPES } from '../../models/memory.model.js';

export const saveMemoryTool = {
  name: 'save_memory',
  description:
    'Save or update a durable fact about the candidate (e.g. goal, weakness, strength, learning progress, preference). Do NOT save casual greetings or one-off questions.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique ID of the candidate.',
      },
      type: {
        type: 'string',
        enum: ALLOWED_MEMORY_TYPES,
        description: `Category of memory: ${ALLOWED_MEMORY_TYPES.join(', ')}`,
      },
      key: {
        type: 'string',
        description: 'Short descriptor of the fact (e.g. "SQL Window Functions", "Target Goal", "Morning Study Habit").',
      },
      value: {
        type: 'string',
        description: 'Descriptive fact learned about the candidate.',
      },
      confidence: {
        type: 'number',
        minimum: 0.0,
        maximum: 1.0,
        description: 'Confidence in this fact: 0.9+ for explicit user statements, 0.6-0.8 for inferred observations.',
      },
      importance: {
        type: 'number',
        minimum: 0.0,
        maximum: 1.0,
        description: 'Significance of this memory for long-term placement preparation (0.0 to 1.0).',
      },
    },
    required: ['userId', 'type', 'key', 'value'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.userId || typeof args.userId !== 'string' || !args.userId.trim()) {
      throw new Error('Invalid argument: "userId" is required and must be a non-empty string.');
    }
    if (!args.type || typeof args.type !== 'string' || !ALLOWED_MEMORY_TYPES.includes(args.type.toLowerCase().trim())) {
      throw new Error(`Invalid argument: "type" must be one of: ${ALLOWED_MEMORY_TYPES.join(', ')}.`);
    }
    if (!args.key || typeof args.key !== 'string' || !args.key.trim()) {
      throw new Error('Invalid argument: "key" is required and must be a non-empty string.');
    }
    if (!args.value || typeof args.value !== 'string' || !args.value.trim()) {
      throw new Error('Invalid argument: "value" is required and must be a non-empty string.');
    }
    if (args.confidence !== undefined) {
      const c = Number(args.confidence);
      if (isNaN(c) || c < 0 || c > 1) {
        throw new Error('Invalid argument: "confidence" must be a number between 0.0 and 1.0.');
      }
    }
    if (args.importance !== undefined) {
      const i = Number(args.importance);
      if (isNaN(i) || i < 0 || i > 1) {
        throw new Error('Invalid argument: "importance" must be a number between 0.0 and 1.0.');
      }
    }
  },

  async execute(args) {
    this.validate(args);
    const saved = await memoryService.createOrUpdateMemory({
      userId: args.userId.trim(),
      type: args.type.toLowerCase().trim(),
      key: args.key.trim(),
      value: args.value.trim(),
      confidence: args.confidence !== undefined ? Number(args.confidence) : 0.9,
      importance: args.importance !== undefined ? Number(args.importance) : 0.7,
      source: 'agent',
    });

    return {
      success: true,
      id: saved.id,
      key: saved.key,
      type: saved.type,
      message: `Memory preserved: [${saved.type}] ${saved.key}`,
    };
  },
};
