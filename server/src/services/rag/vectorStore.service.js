import mongoose from 'mongoose';
import { KnowledgeChunk } from '../../models/knowledgeChunk.model.js';
import { isDatabaseConnected } from '../../config/db.js';
import { embeddingService } from './embedding.service.js';

// In-memory vector store for unit tests or when MongoDB is disconnected
const inMemoryChunks = new Map();

export class VectorStoreService {
  /**
   * Upsert an array of knowledge chunks with embeddings into storage
   * @param {Array<Object>} chunks
   * @returns {Promise<number>} Number of chunks stored
   */
  async upsertVectors(chunks) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return 0;
    }

    if (isDatabaseConnected()) {
      // Prepare bulk write operations for MongoDB
      const operations = chunks.map((chunk) => ({
        updateOne: {
          filter: {
            documentId: chunk.documentId,
            chunkIndex: chunk.chunkIndex,
          },
          update: {
            $set: {
              documentId: chunk.documentId,
              content: chunk.content,
              chunkIndex: chunk.chunkIndex,
              embedding: chunk.embedding,
              tokenCount: chunk.tokenCount || 0,
              metadata: chunk.metadata || {},
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      await KnowledgeChunk.bulkWrite(operations);
      return chunks.length;
    }

    // In-memory fallback
    for (const chunk of chunks) {
      const key = `${chunk.documentId}_${chunk.chunkIndex}`;
      inMemoryChunks.set(key, {
        id: chunk.id || new mongoose.Types.ObjectId().toString(),
        documentId: chunk.documentId ? chunk.documentId.toString() : '',
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        embedding: chunk.embedding,
        tokenCount: chunk.tokenCount || 0,
        metadata: chunk.metadata || {},
        createdAt: new Date(),
      });
    }

    return chunks.length;
  }

  /**
   * Search vector store for chunks most similar to the query embedding
   * @param {Array<number>} queryEmbedding
   * @param {Object} [options]
   * @param {number} [options.limit=5]
   * @param {number} [options.minScore=0.1]
   * @param {string} [options.category]
   * @param {string} [options.role]
   * @param {string} [options.topic]
   * @param {string} [options.documentId]
   * @returns {Promise<Array<{ chunkId: string, documentId: string, content: string, score: number, metadata: Object }>>}
   */
  async searchSimilar(queryEmbedding, options = {}) {
    if (!embeddingService.validateEmbedding(queryEmbedding)) {
      throw new Error('Valid query embedding vector is required for similarity search.');
    }

    const limit = Math.max(1, Math.min(Number(options.limit) || 5, 20));
    const minScore = options.minScore !== undefined ? options.minScore : 0.05;
    const categoryFilter = options.category ? options.category.toLowerCase().trim() : null;
    const roleFilter = options.role ? options.role.toLowerCase().trim() : null;
    const topicFilter = options.topic ? options.topic.toLowerCase().trim() : null;
    const docIdFilter = options.documentId ? options.documentId.toString() : null;

    let candidateChunks = [];

    if (isDatabaseConnected()) {
      // Build MongoDB query filter
      const query = {};
      if (docIdFilter && mongoose.Types.ObjectId.isValid(docIdFilter)) {
        query.documentId = docIdFilter;
      }
      if (categoryFilter && categoryFilter !== 'general' && categoryFilter !== 'all') {
        query['metadata.category'] = new RegExp(`^${categoryFilter}$`, 'i');
      }
      if (roleFilter && roleFilter !== 'general' && roleFilter !== 'all') {
        query.$or = [
          { 'metadata.role': new RegExp(`^${roleFilter}$`, 'i') },
          { 'metadata.role': 'General' },
        ];
      }

      // Explicitly include embedding field
      const docs = await KnowledgeChunk.find(query).select('+embedding').lean();

      candidateChunks = docs.map((doc) => ({
        id: doc._id.toString(),
        documentId: doc.documentId.toString(),
        content: doc.content,
        chunkIndex: doc.chunkIndex,
        embedding: doc.embedding,
        metadata: doc.metadata || {},
      }));
    } else {
      // In-memory candidate search
      candidateChunks = Array.from(inMemoryChunks.values()).map((chunk) => ({ ...chunk }));
    }

    // Filter and score candidates using cosine similarity
    const scored = [];

    for (const chunk of candidateChunks) {
      // Apply filters if in-memory
      if (docIdFilter && chunk.documentId !== docIdFilter) continue;

      if (categoryFilter && categoryFilter !== 'general' && categoryFilter !== 'all') {
        const chunkCat = (chunk.metadata?.category || '').toLowerCase();
        if (chunkCat !== categoryFilter && !chunkCat.includes(categoryFilter)) {
          continue;
        }
      }

      if (roleFilter && roleFilter !== 'general' && roleFilter !== 'all') {
        const chunkRole = (chunk.metadata?.role || '').toLowerCase();
        if (chunkRole !== 'general' && chunkRole !== roleFilter && !chunkRole.includes(roleFilter)) {
          // Soft filter: prioritize matching role but allow general
        }
      }

      if (topicFilter) {
        const chunkTopic = (chunk.metadata?.topic || '').toLowerCase();
        const chunkTags = (chunk.metadata?.tags || []).map((t) => t.toLowerCase());
        const hasTopic =
          chunkTopic.includes(topicFilter) ||
          chunkTags.some((t) => t.includes(topicFilter)) ||
          chunk.content.toLowerCase().includes(topicFilter);
        if (!hasTopic) {
          // If explicit topic filter requested, penalize or filter
        }
      }

      const similarity = embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= minScore) {
        scored.push({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          title: chunk.metadata?.title || 'Knowledge Reference',
          content: chunk.content,
          score: Number(similarity.toFixed(4)),
          metadata: {
            category: chunk.metadata?.category || 'General',
            role: chunk.metadata?.role || 'General',
            topic: chunk.metadata?.topic || '',
            tags: chunk.metadata?.tags || [],
            source: chunk.metadata?.source || '',
            chunkIndex: chunk.chunkIndex,
          },
        });
      }
    }

    // Sort descending by similarity score
    scored.sort((a, b) => b.score - a.score);

    // Deduplicate identical content or near-identical adjacent chunks
    const seen = new Set();
    const unique = [];

    for (const item of scored) {
      const contentSnippet = item.content.slice(0, 80).toLowerCase();
      if (!seen.has(contentSnippet)) {
        seen.add(contentSnippet);
        unique.push(item);
      }
      if (unique.length >= limit) break;
    }

    return unique;
  }

  /**
   * Delete all chunks associated with a document
   * @param {string} documentId
   */
  async deleteVectors(documentId) {
    if (!documentId) return 0;
    const cleanId = documentId.toString().trim();

    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(cleanId)) {
      const result = await KnowledgeChunk.deleteMany({ documentId: cleanId });
      return result.deletedCount || 0;
    }

    // In-memory deletion
    let deleted = 0;
    for (const [key, chunk] of inMemoryChunks.entries()) {
      if (chunk.documentId === cleanId) {
        inMemoryChunks.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Count chunks stored for a document
   * @param {string} documentId
   */
  async getChunksCount(documentId) {
    if (!documentId) return 0;
    const cleanId = documentId.toString().trim();

    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(cleanId)) {
      return await KnowledgeChunk.countDocuments({ documentId: cleanId });
    }

    let count = 0;
    for (const chunk of inMemoryChunks.values()) {
      if (chunk.documentId === cleanId) count++;
    }
    return count;
  }

  /**
   * Clear in-memory vectors (for test isolation)
   */
  clearVectors() {
    inMemoryChunks.clear();
  }
}

export const vectorStoreService = new VectorStoreService();
