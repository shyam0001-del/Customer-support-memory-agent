import { supportKnowledgeService } from '../knowledge/supportKnowledge.service.js';

export const searchSupportKnowledgeTool = {
  name: 'search_support_knowledge',
  description:
    'Search official CloudDesk technical support knowledge base for verified troubleshooting guides, standard operating procedures, and product specifications. Use when diagnosing login issues, dashboard failures, report loading problems, or browser compatibility.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Technical troubleshooting inquiry or symptom keywords.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of relevant articles to retrieve (1 to 5, default 3).',
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

    const limit = args.limit ? Number(args.limit) : 3;
    const results = supportKnowledgeService.search(args.query.trim(), { limit });

    return {
      query: args.query.trim(),
      total: results.length,
      results: results.map((r) => ({
        title: r.title,
        content: r.content,
        category: r.category,
        source: 'CloudDesk Support Knowledge',
      })),
    };
  },
};
