import { retrievalService } from '../rag/retrieval.service.js';

export const searchKnowledgeTool = {
  name: 'search_knowledge',
  description:
    'Search the verified internal placement knowledge base for technical guides, concepts, interview roadmaps, and preparation references. Use when the candidate asks technical or conceptual questions (e.g. SQL window functions, DBMS normalization, DSA patterns, Machine Learning basics).',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The semantic search query or technical concept to look up.',
      },
      role: {
        type: 'string',
        description: 'Optional target role filter (e.g. "Data Analyst", "Software Engineer", "Backend Developer").',
      },
      category: {
        type: 'string',
        description: 'Optional technical category filter (e.g. "SQL", "DBMS", "DSA", "Machine Learning", "Placement").',
      },
      topic: {
        type: 'string',
        description: 'Optional specific subtopic filter.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of relevant chunks to retrieve (1 to 10, default 4).',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.query || typeof args.query !== 'string' || !args.query.trim()) {
      throw new Error('Invalid argument: "query" is required and must be a non-empty string.');
    }
  },

  async execute(args) {
    this.validate(args);

    const chunks = await retrievalService.search(args.query.trim(), {
      role: args.role && typeof args.role === 'string' ? args.role.trim() : undefined,
      category: args.category && typeof args.category === 'string' ? args.category.trim() : undefined,
      topic: args.topic && typeof args.topic === 'string' ? args.topic.trim() : undefined,
      limit: args.limit ? Number(args.limit) : 4,
    });

    // Format output without any raw embeddings
    const results = chunks.map((c) => ({
      chunkId: c.chunkId,
      documentId: c.documentId,
      title: c.title,
      content: c.content,
      score: c.score,
      metadata: {
        category: c.metadata?.category || 'General',
        role: c.metadata?.role || 'General',
        topic: c.metadata?.topic || '',
        tags: c.metadata?.tags || [],
        source: c.metadata?.source || '',
      },
    }));

    return {
      query: args.query.trim(),
      totalResults: results.length,
      results,
    };
  },
};
