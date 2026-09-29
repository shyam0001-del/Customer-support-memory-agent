import { memoryService } from '../memory/memory.service.js';

export const deleteMemoryTool = {
  name: 'delete_memory',
  description:
    'Delete a specific candidate memory record either by its memoryId, or by userId and memory key (e.g. when user requests "forget that I am weak at SQL").',
  parameters: {
    type: 'object',
    properties: {
      memoryId: {
        type: 'string',
        description: 'The unique ID of the memory to delete.',
      },
      userId: {
        type: 'string',
        description: 'Candidate userId (used if deleting by key).',
      },
      key: {
        type: 'string',
        description: 'Memory key to delete (e.g. "SQL Window Functions").',
      },
    },
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    const hasId = args.memoryId && typeof args.memoryId === 'string' && args.memoryId.trim();
    const hasKey = args.userId && args.key && typeof args.key === 'string' && args.key.trim();

    if (!hasId && !hasKey) {
      throw new Error('Provide either "memoryId", or both "userId" and "key" to delete a memory.');
    }
  },

  async execute(args) {
    this.validate(args);

    if (args.memoryId) {
      const deleted = await memoryService.deleteMemory(args.memoryId.trim());
      if (!deleted) {
        throw new Error(`Memory record "${args.memoryId}" not found or already deleted.`);
      }
      return {
        success: true,
        message: `Memory record "${args.memoryId}" successfully deleted.`,
      };
    }

    const deleted = await memoryService.deleteMemoryByKey(args.userId.trim(), args.key.trim());
    if (!deleted) {
      throw new Error(`No memory matching key "${args.key}" found for candidate.`);
    }

    return {
      success: true,
      message: `Memory matching "${args.key}" successfully removed from candidate records.`,
    };
  },
};
