import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  KnowledgeDocument,
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CONTENT_TYPES,
  KNOWLEDGE_STATUSES,
} from '../../models/knowledgeDocument.model.js';
import { isDatabaseConnected } from '../../config/db.js';
import { chunkingService } from './chunking.service.js';
import { embeddingService } from './embedding.service.js';
import { vectorStoreService } from './vectorStore.service.js';

// In-memory document map for testing or when MongoDB is disconnected
const inMemoryDocuments = new Map();

export class DocumentService {
  /**
   * Compute SHA-256 hash of text content for change detection & deduplication
   * @param {string} text
   * @returns {string}
   */
  computeContentHash(text) {
    if (!text || typeof text !== 'string') return '';
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Create a new knowledge document
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createDocument(data = {}) {
    const {
      title,
      description = '',
      content,
      source = 'Placement Knowledge Engine',
      category = 'General',
      role = 'General',
      tags = [],
      contentType = 'concept',
      status = 'active',
    } = data;

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Valid document "title" is required.');
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new Error('Valid document "content" is required.');
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanCategory = KNOWLEDGE_CATEGORIES.includes(category) ? category : 'General';
    const cleanContentType = KNOWLEDGE_CONTENT_TYPES.includes(contentType) ? contentType : 'concept';
    const cleanStatus = KNOWLEDGE_STATUSES.includes(status) ? status : 'active';
    const contentHash = this.computeContentHash(cleanContent);

    const docPayload = {
      title: cleanTitle,
      description: typeof description === 'string' ? description.trim() : '',
      content: cleanContent,
      contentHash,
      source: typeof source === 'string' ? source.trim() : 'Placement Knowledge Engine',
      category: cleanCategory,
      role: typeof role === 'string' && role.trim() ? role.trim() : 'General',
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      contentType: cleanContentType,
      status: cleanStatus,
      chunksCount: 0,
      indexedAt: null,
    };

    if (isDatabaseConnected()) {
      const doc = new KnowledgeDocument(docPayload);
      await doc.save();
      return doc.toJSON();
    }

    // In-memory fallback
    const fakeId = new mongoose.Types.ObjectId().toString();
    const memoryDoc = {
      id: fakeId,
      ...docPayload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDocuments.set(fakeId, memoryDoc);
    return memoryDoc;
  }

  /**
   * Retrieve a knowledge document by ID
   * @param {string} documentId
   * @returns {Promise<Object>}
   */
  async getDocument(documentId) {
    if (!documentId) {
      throw new Error('Document ID is required.');
    }
    const cleanId = documentId.toString().trim();

    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(cleanId)) {
      const doc = await KnowledgeDocument.findById(cleanId);
      if (!doc) {
        throw new Error(`Knowledge document "${cleanId}" not found.`);
      }
      return doc.toJSON();
    }

    const memDoc = inMemoryDocuments.get(cleanId);
    if (!memDoc) {
      throw new Error(`Knowledge document "${cleanId}" not found.`);
    }
    return { ...memDoc };
  }

  /**
   * List knowledge documents with optional category and role filters
   * @param {Object} [filter]
   * @returns {Promise<Array<Object>>}
   */
  async listDocuments(filter = {}) {
    const { category, role, status, limit = 50 } = filter;
    const numLimit = Math.max(1, Math.min(Number(limit) || 50, 100));

    if (isDatabaseConnected()) {
      const query = {};
      if (category && category !== 'all') {
        query.category = new RegExp(`^${category.trim()}$`, 'i');
      }
      if (role && role !== 'all') {
        query.role = new RegExp(`^${role.trim()}$`, 'i');
      }
      if (status) {
        query.status = status;
      }
      const docs = await KnowledgeDocument.find(query)
        .sort({ updatedAt: -1 })
        .limit(numLimit);
      return docs.map((d) => d.toJSON());
    }

    // In-memory filter
    let results = Array.from(inMemoryDocuments.values());
    if (category && category !== 'all') {
      results = results.filter((d) => d.category.toLowerCase() === category.toLowerCase());
    }
    if (role && role !== 'all') {
      results = results.filter((d) => d.role.toLowerCase() === role.toLowerCase());
    }
    if (status) {
      results = results.filter((d) => d.status === status);
    }
    results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return results.slice(0, numLimit);
  }

  /**
   * Update metadata or content of an existing document
   * @param {string} documentId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateDocument(documentId, updateData = {}) {
    if (!documentId) throw new Error('Document ID is required.');
    const cleanId = documentId.toString().trim();

    const currentDoc = await this.getDocument(cleanId);
    const updates = {};

    if (updateData.title && typeof updateData.title === 'string') {
      updates.title = updateData.title.trim();
    }
    if (updateData.description !== undefined) {
      updates.description = String(updateData.description).trim();
    }
    if (updateData.category && KNOWLEDGE_CATEGORIES.includes(updateData.category)) {
      updates.category = updateData.category;
    }
    if (updateData.role && typeof updateData.role === 'string') {
      updates.role = updateData.role.trim();
    }
    if (Array.isArray(updateData.tags)) {
      updates.tags = updateData.tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (updateData.contentType && KNOWLEDGE_CONTENT_TYPES.includes(updateData.contentType)) {
      updates.contentType = updateData.contentType;
    }
    if (updateData.status && KNOWLEDGE_STATUSES.includes(updateData.status)) {
      updates.status = updateData.status;
    }

    // If content is changing, update hash and reset indexing
    if (updateData.content && typeof updateData.content === 'string') {
      const newContent = updateData.content.trim();
      const newHash = this.computeContentHash(newContent);
      if (newHash !== currentDoc.contentHash) {
        updates.content = newContent;
        updates.contentHash = newHash;
        updates.indexedAt = null; // Needs re-indexing
      }
    }

    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(cleanId)) {
      const updated = await KnowledgeDocument.findByIdAndUpdate(cleanId, updates, {
        new: true,
        runValidators: true,
      });
      return updated.toJSON();
    }

    // In-memory update
    const updatedMemDoc = {
      ...currentDoc,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryDocuments.set(cleanId, updatedMemDoc);
    return updatedMemDoc;
  }

  /**
   * Delete document and its associated vector chunks
   * @param {string} documentId
   * @returns {Promise<{ deleted: boolean, chunksDeleted: number }>}
   */
  async deleteDocument(documentId) {
    if (!documentId) throw new Error('Document ID is required.');
    const cleanId = documentId.toString().trim();

    // Verify document exists
    await this.getDocument(cleanId);

    // Delete associated vector chunks first
    const chunksDeleted = await vectorStoreService.deleteVectors(cleanId);

    if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(cleanId)) {
      await KnowledgeDocument.findByIdAndDelete(cleanId);
    } else {
      inMemoryDocuments.delete(cleanId);
    }

    return {
      deleted: true,
      documentId: cleanId,
      chunksDeleted,
    };
  }

  /**
   * Ingest a document: chunk text, generate embeddings, and store in vector store
   * @param {string} documentId
   * @param {boolean} [force=false]
   * @returns {Promise<Object>}
   */
  async ingestDocument(documentId, force = false) {
    const doc = await this.getDocument(documentId);

    // Check if document is already indexed and content is unchanged
    const currentHash = this.computeContentHash(doc.content);
    if (!force && doc.indexedAt && doc.contentHash === currentHash && doc.chunksCount > 0) {
      return {
        success: true,
        documentId: doc.id,
        skipped: true,
        message: 'Document content unchanged; re-indexing skipped.',
        chunksCount: doc.chunksCount,
        indexedAt: doc.indexedAt,
      };
    }

    try {
      // 1. Chunk document text
      const rawChunks = chunkingService.chunkText(doc.content, {
        documentId: doc.id,
        metadata: {
          title: doc.title,
          category: doc.category,
          role: doc.role,
          tags: doc.tags,
          source: doc.source,
        },
      });

      if (rawChunks.length === 0) {
        throw new Error('Document text produced zero chunks.');
      }

      // 2. Generate embeddings for all chunks in batch
      const chunkTexts = rawChunks.map((c) => c.content);
      const embeddings = await embeddingService.generateEmbeddings(chunkTexts);

      if (embeddings.length !== rawChunks.length) {
        throw new Error('Embedding count mismatch during ingestion.');
      }

      // 3. Package chunks with vectors
      const chunksToStore = rawChunks.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddings[idx],
      }));

      // 4. Clean up any previous chunks for this document
      await vectorStoreService.deleteVectors(doc.id);

      // 5. Store new chunks in vector store
      const storedCount = await vectorStoreService.upsertVectors(chunksToStore);

      // 6. Update document record
      const now = new Date();
      if (isDatabaseConnected() && mongoose.Types.ObjectId.isValid(doc.id)) {
        await KnowledgeDocument.findByIdAndUpdate(doc.id, {
          contentHash: currentHash,
          chunksCount: storedCount,
          indexedAt: now,
          status: 'active',
        });
      } else {
        const memDoc = inMemoryDocuments.get(doc.id);
        if (memDoc) {
          memDoc.contentHash = currentHash;
          memDoc.chunksCount = storedCount;
          memDoc.indexedAt = now;
          memDoc.status = 'active';
          memDoc.updatedAt = now;
        }
      }

      return {
        success: true,
        documentId: doc.id,
        title: doc.title,
        chunksCount: storedCount,
        indexedAt: now,
      };
    } catch (ingestErr) {
      console.error(`[DocumentService] Ingestion failed for "${doc.title}":`, ingestErr.message);
      // Clean up partial chunks on failure
      await vectorStoreService.deleteVectors(doc.id).catch(() => {});
      throw new Error(`Ingestion failed: ${ingestErr.message}`);
    }
  }

  /**
   * Reindex document (forces chunking and embedding regeneration)
   * @param {string} documentId
   */
  async reindexDocument(documentId) {
    return this.ingestDocument(documentId, true);
  }

  /**
   * Clear in-memory documents (for test isolation)
   */
  clearMemory() {
    inMemoryDocuments.clear();
  }
}

export const documentService = new DocumentService();
