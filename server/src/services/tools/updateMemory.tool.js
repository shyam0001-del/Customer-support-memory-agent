import { memoryService } from '../memory/memory.service.js';

export const updateMemoryTool = {
  name: 'update_memory',
  description: 'Update the content, confidence, or importance score of an existing memory record by memoryId.',
  parameters: {
    type: 'object',
    properties: {
      memoryId: {
        type: 'string',
        description: 'The unique ID of the memory record to update.',
      },
      value: {
        type: 'string',
        description: 'New or refined memory value content.',
      },
      confidence: {
        type: 'number',
        minimum: 0.0,
        maximum: 1.0,
        description: 'Updated confidence score (0.0 to 1.0).',
      },
      importance: {
        type: 'number',
        minimum: 0.0,
        maximum: 1.0,
        description: 'Updated importance score (0.0 to 1.0).',
      },
    },
    required: ['memoryId'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.memoryId || typeof args.memoryId !== 'string' || !args.memoryId.trim()) {
      throw new Error('Invalid argument: "memoryId" is required and must be a non-empty string.');
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
    const updated = await memoryService.updateMemory(args.memoryId.trim(), {
      value: args.value,
      confidence: args.confidence,
      importance: args.importance,
    });

    if (!updated) {
      throw new Error(`Memory record with ID "${args.memoryId}" was not found.`);
    }

    return {
      success: true,
      id: updated.id,
      key: updated.key,
      value: updated.value,
      confidence: updated.confidence,
      importance: updated.importance,
      message: `Memory "${updated.key}" updated successfully.`,
    };
  },
};
