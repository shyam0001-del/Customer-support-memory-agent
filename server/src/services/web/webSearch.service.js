import { config } from '../../config/env.js';
import { webResultService } from './webResult.service.js';
import { webCitationService } from './webCitation.service.js';

// Realistic deterministic mock fixtures for offline testing & development
export const MOCK_WEB_DATA = [
  {
    title: 'Data Analyst Hiring Trends: Core Skills in Modern Job Postings',
    url: 'https://careers.analyticsinsights.org/reports/data-analyst-skills-market-analysis',
    snippet:
      'Recent analysis of over 5,000 Data Analyst job postings highlights that SQL remains the #1 mandatory requirement (demanded in 88% of listings), followed by Python/R (64%), Power BI/Tableau (62%), and practical data cleaning. Advanced SQL topics such as Window Functions, CTEs, and query optimization are consistently tested in initial technical screens.',
    source: 'Analytics Insights',
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    tags: ['data analyst', 'sql', 'python', 'power bi', 'job market', 'hiring trends', 'skills'],
    domain: 'analyticsinsights.org',
  },
  {
    title: 'Microsoft Careers: Software Engineering Role Profile & Current Tech Stack',
    url: 'https://careers.microsoft.com/us/en/job/software-engineer-core-services',
    snippet:
      'Microsoft is actively hiring Software Engineers across Core Services and Azure Cloud. Requirements include proficiency in C++, C#, Java, or Python, deep understanding of distributed systems architecture, cloud computing fundamentals, and asynchronous programming. Interviews assess data structures, algorithmic complexity, system design, and behavioral excellence.',
    source: 'Microsoft Careers',
    publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    tags: ['microsoft', 'software engineer', 'azure', 'distributed systems', 'careers', 'c#', 'python'],
    domain: 'microsoft.com',
  },
  {
    title: 'Recent Data Analyst SQL Interview Experiences: What Top Companies Ask',
    url: 'https://www.interviewquery.com/blog/recent-data-analyst-sql-interview-experiences',
    snippet:
      'Candidate-reported experiences from recent technical rounds show that companies like Uber, Amazon, and FinTech startups focus heavily on live SQL live-coding. Candidates were asked to calculate 30-day rolling retention using ROW_NUMBER() and DENSE_RANK(), write self-joins for user event funnels, and explain indexing strategies for large analytical tables.',
    source: 'Interview Query',
    publishedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    tags: ['data analyst', 'interview experience', 'sql', 'window functions', 'uber', 'interview'],
    domain: 'interviewquery.com',
  },
  {
    title: 'AI Engineering in 2026: Tooling and Framework Demands in Production',
    url: 'https://techcommunity.microsoft.com/t5/ai-developer-blog/ai-engineering-tools-2026/ba-p/4129801',
    snippet:
      'Modern AI Engineer job postings emphasize proficiency in orchestration frameworks (LangChain, LlamaIndex), high-throughput inference engines (vLLM, Ollama), vector search indexing, evaluation benchmarks, and defensive prompt engineering. Familiarity with RAG architectures and multi-turn conversational agents is frequently highlighted as a must-have skill.',
    source: 'Microsoft Tech Community',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    tags: ['ai engineer', 'ai', 'langchain', 'llamaindex', 'rag', 'vllm', 'tools', 'latest'],
    domain: 'microsoft.com',
  },
  {
    title: 'Google Software Engineer Interview Rounds: Current Process and Rubric',
    url: 'https://careers.google.com/stories/software-engineering-interview-guide',
    snippet:
      'Google software engineering candidates undergo a structured assessment: initial technical phone screen (coding in shared docs), followed by 4 on-site technical interviews covering algorithms, data structures, and system design, alongside Googleyness and Leadership. Candidates report strong emphasis on clean code, edge-case testing, and trade-off analysis.',
    source: 'Google Careers',
    publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days ago
    tags: ['google', 'software engineer', 'interview', 'algorithms', 'system design', 'careers'],
    domain: 'google.com',
  },
  {
    title: 'SQL Window Functions Cheat Sheet & Real-World Query Patterns',
    url: 'https://learnsql.com/blog/sql-window-functions-practical-guide',
    snippet:
      'Window functions (OVER, PARTITION BY, ORDER BY, LAG, LEAD, NTILE) remain critical for data analytics and reporting. Common practical uses include computing moving averages, calculating period-over-period differences, and deduplicating rows via ROW_NUMBER() in data warehouses like Snowflake and BigQuery.',
    source: 'LearnSQL',
    publishedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days ago
    tags: ['sql', 'window functions', 'data analyst', 'snowflake', 'bigquery'],
    domain: 'learnsql.com',
  },
];

export class WebSearchService {
  constructor() {
    this.provider = config.webSearch.provider || 'mock';
    this.apiKey = config.webSearch.apiKey || '';
    this.timeoutMs = 8000;
  }

  /**
   * Validate and sanitize search parameters
   * @param {Object} params
   * @returns {{ cleanQuery: string, limit: number, recencyDays?: number, domain?: string, intent: string }}
   */
  validateParams(params = {}) {
    const { query, limit, recencyDays, domain, intent } = params;

    if (!query || typeof query !== 'string' || !query.trim()) {
      const err = new Error('Valid, non-empty search query string is required.');
      err.code = 'WEB_SEARCH_INVALID_QUERY';
      err.statusCode = 400;
      throw err;
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      const err = new Error('Search query is too short (minimum 2 characters).');
      err.code = 'WEB_SEARCH_INVALID_QUERY';
      err.statusCode = 400;
      throw err;
    }

    if (cleanQuery.length > 200) {
      const err = new Error('Search query exceeds maximum limit of 200 characters.');
      err.code = 'WEB_SEARCH_INVALID_QUERY';
      err.statusCode = 400;
      throw err;
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 10));

    let safeRecency = undefined;
    if (recencyDays !== undefined && recencyDays !== null) {
      const r = Number(recencyDays);
      if (!isNaN(r) && r > 0) {
        safeRecency = Math.min(r, 365);
      }
    }

    const safeDomain = typeof domain === 'string' && domain.trim() ? domain.trim().toLowerCase() : undefined;
    const safeIntent = typeof intent === 'string' && intent.trim() ? intent.trim().toLowerCase() : 'general';

    return {
      cleanQuery,
      limit: safeLimit,
      recencyDays: safeRecency,
      domain: safeDomain,
      intent: safeIntent,
    };
  }

  /**
   * Perform web search using configured provider or deterministic mock
   * @param {Object} params
   * @returns {Promise<{ query: string, totalResults: number, results: Array<Object>, provider: string, retrievedAt: string }>}
   */
  async search(params = {}) {
    const { cleanQuery, limit, recencyDays, domain, intent } = this.validateParams(params);

    // If provider is mock or no API key configured, use deterministic mock
    if (this.provider === 'mock' || !this.apiKey) {
      return this._searchMock({ query: cleanQuery, limit, recencyDays, domain, intent });
    }

    // Live provider integration (e.g. Tavily, SerpAPI, DuckDuckGo)
    try {
      return await this._searchLive({ query: cleanQuery, limit, recencyDays, domain, intent });
    } catch (liveErr) {
      console.warn(`[WebSearch] Live provider (${this.provider}) failed: ${liveErr.message}. Falling back to mock.`);
      // Graceful fallback to mock if live provider errors or rate limits
      return this._searchMock({ query: cleanQuery, limit, recencyDays, domain, intent });
    }
  }

  /**
   * Search for recent news and company updates
   * @param {Object} params
   */
  async searchNews(params = {}) {
    return this.search({
      ...params,
      intent: 'news',
      recencyDays: params.recencyDays || 30,
    });
  }

  /**
   * Search with strict freshness constraint (e.g. last 7 to 30 days)
   * @param {Object} params
   */
  async searchRecent(params = {}) {
    return this.search({
      ...params,
      recencyDays: params.recencyDays || 14,
    });
  }

  /**
   * Deterministic mock search matching against high quality test fixtures
   * @private
   */
  _searchMock({ query, limit, recencyDays, domain, intent }) {
    const queryTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    let candidates = [...MOCK_WEB_DATA];

    // Filter by domain if specified
    if (domain) {
      candidates = candidates.filter((item) => item.domain.includes(domain) || item.url.includes(domain));
    }

    // Filter by recency if specified
    if (recencyDays) {
      const cutoff = Date.now() - recencyDays * 24 * 60 * 60 * 1000;
      candidates = candidates.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
    }

    // Score candidates based on query token matches in title, snippet, and tags
    const scored = candidates
      .map((item) => {
        let matchScore = 0;
        const titleLower = item.title.toLowerCase();
        const snippetLower = item.snippet.toLowerCase();
        const tags = item.tags || [];

        for (const token of queryTokens) {
          if (titleLower.includes(token)) matchScore += 0.35;
          if (snippetLower.includes(token)) matchScore += 0.2;
          if (tags.some((t) => t.includes(token))) matchScore += 0.25;
        }

        return {
          ...item,
          score: Math.min(0.98, 0.4 + matchScore),
        };
      })
      .filter((item) => item.score > 0.45); // Keep relevant results

    // Normalize results
    const normalized = scored
      .map((item) => webResultService.normalizeSearchResult(item))
      .filter(Boolean);

    // Deduplicate and rank
    const deduped = webResultService.deduplicateResults(normalized);
    const ranked = webResultService.rankResults(deduped, query);
    const finalResults = webResultService.limitResults(ranked, limit);

    return {
      query,
      totalResults: finalResults.length,
      results: finalResults,
      provider: 'mock',
      retrievedAt: new Date().toISOString(),
    };
  }

  /**
   * Live search execution with timeout guardrail
   * @private
   */
  async _searchLive({ query, limit, recencyDays, domain, intent }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let endpoint = '';
      let headers = { 'Content-Type': 'application/json' };
      let body = null;

      if (this.provider === 'tavily') {
        endpoint = 'https://api.tavily.com/search';
        body = JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'basic',
          max_results: limit,
          include_domains: domain ? [domain] : undefined,
          days: recencyDays || undefined,
        });
      } else {
        // Generic HTTP endpoint
        endpoint = `https://api.searchprovider.com/search?q=${encodeURIComponent(query)}&limit=${limit}`;
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: body ? 'POST' : 'GET',
        headers,
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const err = new Error('Web search provider rate limit exceeded.');
          err.code = 'WEB_SEARCH_RATE_LIMITED';
          err.statusCode = 429;
          throw err;
        }
        const err = new Error(`Web search provider error (${response.status}).`);
        err.code = 'WEB_SEARCH_UNAVAILABLE';
        err.statusCode = 502;
        throw err;
      }

      const rawData = await response.json();
      const rawResults = Array.isArray(rawData.results) ? rawData.results : [];

      const normalized = rawResults
        .map((r) => webResultService.normalizeSearchResult(r))
        .filter(Boolean);

      const deduped = webResultService.deduplicateResults(normalized);
      const ranked = webResultService.rankResults(deduped, query);
      const finalResults = webResultService.limitResults(ranked, limit);

      return {
        query,
        totalResults: finalResults.length,
        results: finalResults,
        provider: this.provider,
        retrievedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Web search timed out after ${this.timeoutMs}ms.`);
        timeoutErr.code = 'WEB_SEARCH_TIMEOUT';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const webSearchService = new WebSearchService();
