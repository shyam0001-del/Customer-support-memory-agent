import { memoryService, formatMemoryContext } from '../memory/memory.service.js';

export const getRelevantMemoriesTool = {
  name: 'get_relevant_memories',
  description:
    'Retrieve relevant, durable facts and memories learned about the candidate (e.g. established weaknesses, goals, study habits, strengths, or achievements) matching a query.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique ID of the candidate.',
      },
      query: {
        type: 'string',
        description: 'Topic, skill, or context keywords to search memories for (e.g. "SQL", "weakness", "target role", "study schedule").',
      },
    },
    required: ['userId', 'query'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.userId || typeof args.userId !== 'string' || !args.userId.trim()) {
      throw new Error('Invalid argument: "userId" is required and must be a non-empty string.');
    }
    if (!args.query || typeof args.query !== 'string' || !args.query.trim()) {
      throw new Error('Invalid argument: "query" is required and must be a non-empty string.');
    }
  },

  async execute(args) {
    this.validate(args);
    const memories = await memoryService.getRelevantMemories({
      userId: args.userId.trim(),
      query: args.query.trim(),
      limit: 5,
    });

    return {
      count: memories.length,
      memories: memories.map((m) => ({
        id: m.id,
        type: m.type,
        key: m.key,
        value: m.value,
        confidence: m.confidence,
        importance: m.importance,
      })),
      formattedContext: formatMemoryContext(memories),
    };
  },
};
