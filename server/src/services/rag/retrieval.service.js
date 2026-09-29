import { embeddingService } from './embedding.service.js';
import { vectorStoreService } from './vectorStore.service.js';

export const RETRIEVAL_DEFAULTS = {
  TOP_K: 5,
  MIN_SCORE: 0.1,
  MAX_CONTEXT_TOKENS: 1500,
};

export class RetrievalService {
  constructor(defaults = RETRIEVAL_DEFAULTS) {
    this.defaults = defaults;
  }

  /**
   * Search knowledge base for chunks semantically relevant to the user query
   * @param {string} query - The candidate's question or search query
   * @param {Object} [options]
   * @param {number} [options.limit=5] - Number of top chunks to return
   * @param {number} [options.minScore=0.1] - Minimum similarity threshold
   * @param {string} [options.category] - Filter by technical category (SQL, DBMS, DSA, React, etc.)
   * @param {string} [options.role] - Filter by target role (Data Analyst, SDE, etc.)
   * @param {string} [options.topic] - Filter or boost by topic
   * @param {string} [options.documentId] - Restrict search to a specific document
   * @returns {Promise<Array<Object>>}
   */
  async search(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const cleanQuery = query.trim();
    const limit = options.limit ? Math.max(1, Math.min(Number(options.limit), 15)) : this.defaults.TOP_K;
    const minScore = options.minScore !== undefined ? options.minScore : this.defaults.MIN_SCORE;

    // 1. Generate query embedding vector
    const queryEmbedding = await embeddingService.generateEmbedding(cleanQuery);

    // 2. Perform vector similarity search with metadata filtering
    const candidates = await vectorStoreService.searchSimilar(queryEmbedding, {
      limit: limit * 2, // Retrieve a larger candidate set for reranking & deduplication
      minScore,
      category: options.category,
      role: options.role,
      topic: options.topic,
      documentId: options.documentId,
    });

    // 3. Hybrid scoring: slight boost if query keywords match title or category directly
    const queryTokens = cleanQuery.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const reranked = candidates.map((chunk) => {
      let finalScore = chunk.score;
      const titleLower = (chunk.title || '').toLowerCase();
      const catLower = (chunk.metadata?.category || '').toLowerCase();

      for (const token of queryTokens) {
        if (titleLower.includes(token)) finalScore += 0.05;
        if (catLower.includes(token)) finalScore += 0.03;
      }

      return {
        ...chunk,
        score: Number(Math.min(1.0, finalScore).toFixed(4)),
      };
    });

    reranked.sort((a, b) => b.score - a.score);

    // 4. Deduplicate and return top-K compact results
    const deduplicated = this.deduplicateResults(reranked);
    return deduplicated.slice(0, limit);
  }

  /**
   * Remove duplicate content chunks from search output
   * @param {Array<Object>} chunks
   * @returns {Array<Object>}
   */
  deduplicateResults(chunks = []) {
    if (!Array.isArray(chunks)) return [];
    const seen = new Set();
    return chunks.filter((c) => {
      const key = `${c.title || ''}::${(c.content || '').slice(0, 100)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Search knowledge base with role restriction
   * @param {string} query
   * @param {string} role
   * @param {Object} [options]
   */
  async searchByRole(query, role, options = {}) {
    return this.search(query, { ...options, role });
  }

  /**
   * Search knowledge base with category restriction
   * @param {string} query
   * @param {string} category
   * @param {Object} [options]
   */
  async searchByCategory(query, category, options = {}) {
    return this.search(query, { ...options, category });
  }

  /**
   * Format retrieved chunks into a clean, concise context block for prompt grounding
   * @param {Array<Object>} chunks
   * @returns {string}
   */
  buildContext(chunks = []) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return '';
    }

    const sections = chunks.map((chunk, idx) => {
      const source = chunk.metadata?.source || chunk.title;
      const category = chunk.metadata?.category || 'General';
      return [
        `[Source ${idx + 1}: "${chunk.title}" | Category: ${category} | Relevance: ${(chunk.score * 100).toFixed(0)}%]`,
        chunk.content,
      ].join('\n');
    });

    return [
      '--- RETRIEVED INTERNAL KNOWLEDGE BASE CONTEXT ---',
      sections.join('\n\n'),
      '--- END OF RETRIEVED CONTEXT ---',
    ].join('\n');
  }
}

export const retrievalService = new RetrievalService();
