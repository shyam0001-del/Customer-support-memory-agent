import { webSearchService } from '../web/webSearch.service.js';

export const searchWebTool = {
  name: 'search_web',
  description:
    'Search the public web for fresh, current, time-sensitive, or company-specific information. ' +
    'Use this tool when answering questions about current hiring trends, recent job postings, specific company interview processes, ' +
    'recent interview experiences, or the latest tech stack tooling. ' +
    'Do NOT use this tool for standard foundational technical concepts (use search_knowledge for SQL, DBMS, DSA fundamentals).',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up on the web (e.g. "Data Analyst SQL interview requirements", "Microsoft software engineer interview experience 2026").',
      },
      recencyDays: {
        type: 'number',
        description: 'Optional maximum age of results in days (e.g. 7 for past week, 30 for past month, 90 for past quarter).',
      },
      domain: {
        type: 'string',
        description: 'Optional domain restriction (e.g. "microsoft.com", "careers.google.com").',
      },
      intent: {
        type: 'string',
        enum: ['general', 'jobs', 'company', 'interview', 'learning', 'news'],
        description: 'Optional search category intent.',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to retrieve (1 to 10, default 5).',
      },
    },
    required: ['query'],
  },

  /**
   * Execute web search and return normalized results
   * @param {Object} args
   * @returns {Promise<Object>}
   */
  async execute(args = {}) {
    const { query, recencyDays, domain, intent, limit } = args;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return {
        error: 'Search query string is required.',
        results: [],
      };
    }

    try {
      const searchRes = await webSearchService.search({
        query: query.trim(),
        recencyDays: recencyDays ? Number(recencyDays) : undefined,
        domain: domain && typeof domain === 'string' ? domain.trim() : undefined,
        intent: intent && typeof intent === 'string' ? intent.trim() : 'general',
        limit: limit ? Number(limit) : 5,
      });

      return {
        query: searchRes.query,
        totalResults: searchRes.totalResults,
        results: searchRes.results.map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet,
          source: r.source,
          publishedAt: r.publishedAt,
        })),
        provider: searchRes.provider,
      };
    } catch (err) {
      return {
        error: err.message || 'Web search failed.',
        code: err.code || 'WEB_SEARCH_ERROR',
        results: [],
      };
    }
  },
};
