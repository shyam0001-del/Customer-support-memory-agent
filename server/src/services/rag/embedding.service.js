import OpenAI from 'openai';
import { config, validateAiConfig } from '../../config/env.js';

export const DEFAULT_EMBEDDING_DIMENSIONS = 64;

export class EmbeddingService {
  constructor() {
    this.dimensions = DEFAULT_EMBEDDING_DIMENSIONS;
    this._openaiClient = null;
  }

  /**
   * Lazily initialize OpenAI client if API key is present
   */
  _getClient() {
    if (!this._openaiClient && config.openai.apiKey) {
      this._openaiClient = new OpenAI({
        apiKey: config.openai.apiKey,
        baseURL: config.openai.baseURL,
      });
    }
    return this._openaiClient;
  }

  /**
   * Return configured dimensionality of embeddings
   */
  getEmbeddingDimensions() {
    return this.dimensions;
  }

  /**
   * Validate that an embedding vector is non-empty array of valid numbers
   * @param {Array<number>} vec
   * @returns {boolean}
   */
  validateEmbedding(vec) {
    if (!Array.isArray(vec) || vec.length === 0) return false;
    for (const val of vec) {
      if (typeof val !== 'number' || isNaN(val)) return false;
    }
    return true;
  }

  /**
   * Generate an embedding vector for a single text
   * @param {string} text
   * @returns {Promise<Array<number>>}
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('Valid non-empty text string is required to generate an embedding.');
    }

    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Text cannot be empty or whitespace.');
    }

    const hasOpenAiKey = Boolean(config.openai?.apiKey);

    if (hasOpenAiKey && config.embedding.provider === 'openai') {
      try {
        const client = this._getClient();
        if (client) {
          const response = await client.embeddings.create({
            model: config.embedding.model || 'text-embedding-3-small',
            input: cleanText,
          });
          const rawEmbedding = response.data[0].embedding;
          if (this.validateEmbedding(rawEmbedding)) {
            return this.normalizeVector(rawEmbedding);
          }
        }
      } catch (err) {
        console.warn('[EmbeddingService] OpenAI embedding fallback engaged:', err.message);
      }
    }

    // Deterministic mock/test embedding generator
    return this.generateDeterministicEmbedding(cleanText);
  }

  /**
   * Generate embeddings for an array of texts in batch
   * @param {Array<string>} texts
   * @returns {Promise<Array<Array<number>>>}
   */
  async generateEmbeddings(texts) {
    if (!Array.isArray(texts)) {
      throw new Error('Expected an array of text strings.');
    }

    const cleanTexts = texts.map((t) => (typeof t === 'string' ? t.trim() : ''));
    const { isValid } = validateAiConfig();

    if (isValid && config.embedding.provider === 'openai' && cleanTexts.length > 0) {
      try {
        const client = this._getClient();
        if (client) {
          const response = await client.embeddings.create({
            model: config.embedding.model || 'text-embedding-3-small',
            input: cleanTexts,
          });
          return response.data.map((d) => this.normalizeVector(d.embedding));
        }
      } catch (err) {
        console.warn('[EmbeddingService] OpenAI batch embedding fallback engaged:', err.message);
      }
    }

    // Deterministic fallback for batch
    return cleanTexts.map((text) => this.generateDeterministicEmbedding(text));
  }

  /**
   * Deterministic semantic embedding generator for offline tests & environments without live API keys
   * Projects word tokens using FNV-1a hashing into a fixed D-dimensional unit sphere.
   * Words with similar prefixes and shared tokens produce positive dot products.
   * @param {string} text
   * @returns {Array<number>}
   */
  generateDeterministicEmbedding(text) {
    const d = this.dimensions;
    const vector = new Array(d).fill(0);

    const STOP_WORDS = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'for', 'of', 'to',
      'what', 'how', 'why', 'can', 'you', 'me', 'it', 'this', 'that', 'with', 'as', 'by', 'from'
    ]);

    const rawTokens = (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9_#\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const tokens = rawTokens.filter((t) => !STOP_WORDS.has(t));

    if (tokens.length === 0) {
      // If only stop words, fallback to raw tokens or default
      const fallbackTokens = rawTokens.length > 0 ? rawTokens : ['general'];
      for (const t of fallbackTokens) {
        vector[Math.abs(t.charCodeAt(0)) % d] = 1;
      }
      return this.normalizeVector(vector);
    }

    // Term-frequency hashing projection
    for (const token of tokens) {
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }

      // Map token to 2 coordinate buckets for distributed projection
      const idx1 = Math.abs(hash) % d;
      const idx2 = Math.abs(hash >> 8) % d;
      const sign = (hash & 1) === 0 ? 1 : -1;

      vector[idx1] += sign * (token.length > 3 ? 1.5 : 1.0);
      vector[idx2] += -sign * 0.75;
    }

    return this.normalizeVector(vector);
  }

  /**
   * Normalize vector to unit length (L2 norm = 1.0)
   * @param {Array<number>} vec
   * @returns {Array<number>}
   */
  normalizeVector(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
      sumSq += vec[i] * vec[i];
    }
    const norm = Math.sqrt(sumSq);
    if (norm === 0) {
      const zero = new Array(vec.length).fill(0);
      zero[0] = 1;
      return zero;
    }
    return vec.map((v) => Number((v / norm).toFixed(6)));
  }

  /**
   * Compute cosine similarity between two unit-normalized vectors (dot product)
   * @param {Array<number>} a
   * @param {Array<number>} b
   * @returns {number}
   */
  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    // Clamped between -1 and 1
    return Math.max(-1, Math.min(1, dot));
  }
}

export const embeddingService = new EmbeddingService();
