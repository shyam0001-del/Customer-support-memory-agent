import mongoose from 'mongoose';
import { Memory, ALLOWED_MEMORY_TYPES } from '../../models/memory.model.js';
import { isDatabaseConnected } from '../../config/db.js';

// In-memory fallback map for offline database or unit testing
const inMemoryMemories = new Map();

/**
 * Format a list of retrieved memories into a clean string for agent reasoning context
 * @param {Array<Object>} memories
 * @returns {string}
 */
export function formatMemoryContext(memories = []) {
  if (!Array.isArray(memories) || memories.length === 0) {
    return 'No prior memories found for this query.';
  }

  const lines = ['Relevant candidate memories:'];
  for (const m of memories) {
    const typeLabel = m.type ? m.type.toUpperCase() : 'NOTE';
    lines.push(`- [${typeLabel}] ${m.key}: ${m.value}`);
  }
  return lines.join('\n');
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more',
  'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only',
  'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your',
  'yours', 'yourself', 'yourselves'
]);

class MemoryService {
  /**
   * Create or update a durable memory, preventing duplicate records (Section 8)
   */
  async createOrUpdateMemory({
    userId,
    type,
    key,
    value,
    confidence = 0.9,
    importance = 0.7,
    source = 'conversation',
  }) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Valid "userId" is required for memory storage.');
    }
    if (!type || typeof type !== 'string' || !ALLOWED_MEMORY_TYPES.includes(type.toLowerCase().trim())) {
      throw new Error(
        `Invalid memory type "${type}". Allowed types: ${ALLOWED_MEMORY_TYPES.join(', ')}`
      );
    }
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new Error('Valid memory "key" is required.');
    }
    if (!value || typeof value !== 'string' || !value.trim()) {
      throw new Error('Valid memory "value" is required.');
    }

    const confNum = Number(confidence);
    if (isNaN(confNum) || confNum < 0 || confNum > 1) {
      throw new Error('Confidence must be between 0.0 and 1.0.');
    }

    const impNum = Number(importance);
    if (isNaN(impNum) || impNum < 0 || impNum > 1) {
      throw new Error('Importance must be between 0.0 and 1.0.');
    }

    const cleanUserId = userId.trim();
    const cleanType = type.toLowerCase().trim();
    const cleanKey = key.trim();
    const cleanValue = value.trim();

    if (isDatabaseConnected()) {
      // Find existing memory by case-insensitive key
      const existing = await Memory.findOne({
        userId: cleanUserId,
        key: { $regex: new RegExp(`^${cleanKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (existing) {
        existing.type = cleanType;
        existing.value = cleanValue;
        existing.confidence = Math.max(existing.confidence, confNum);
        existing.importance = Math.max(existing.importance, impNum);
        existing.source = source;
        existing.lastAccessedAt = new Date();
        await existing.save();
        return existing.toJSON();
      }

      const created = new Memory({
        userId: cleanUserId,
        type: cleanType,
        key: cleanKey,
        value: cleanValue,
        confidence: confNum,
        importance: impNum,
        source,
        lastAccessedAt: new Date(),
      });
      await created.save();
      return created.toJSON();
    }

    // In-memory fallback
    const keyLower = cleanKey.toLowerCase();
    for (const [id, item] of inMemoryMemories.entries()) {
      if (item.userId === cleanUserId && item.key.toLowerCase() === keyLower) {
        const updated = {
          ...item,
          type: cleanType,
          value: cleanValue,
          confidence: Math.max(item.confidence, confNum),
          importance: Math.max(item.importance, impNum),
          source,
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryMemories.set(id, updated);
        return updated;
      }
    }

    const fakeId = new mongoose.Types.ObjectId().toString();
    const newRecord = {
      id: fakeId,
      userId: cleanUserId,
      type: cleanType,
      key: cleanKey,
      value: cleanValue,
      confidence: confNum,
      importance: impNum,
      source,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryMemories.set(fakeId, newRecord);
    return newRecord;
  }

  /**
   * Retrieve relevant memories based on query keywords and topic relevance (Section 4)
   */
  async getRelevantMemories({ userId, query = '', type = null, limit = 5 }) {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return [];
    }

    const cleanUserId = userId.trim();
    const searchTerms = (query || '')
      .toLowerCase()
      .split(/\s+/)
      .map((s) => s.replace(/[^a-z0-9]/g, ''))
      .filter((s) => s.length >= 2 && !STOP_WORDS.has(s));

    let allMemories = [];

    if (isDatabaseConnected()) {
      const filter = { userId: cleanUserId };
      if (type && ALLOWED_MEMORY_TYPES.includes(type.toLowerCase())) {
        filter.type = type.toLowerCase();
      }
      const docs = await Memory.find(filter).lean();
      allMemories = docs.map((doc) => ({
        id: doc._id.toString(),
        userId: doc.userId,
        type: doc.type,
        key: doc.key,
        value: doc.value,
        confidence: doc.confidence,
        importance: doc.importance,
        lastAccessedAt: doc.lastAccessedAt,
        createdAt: doc.createdAt,
      }));
    } else {
      for (const item of inMemoryMemories.values()) {
        if (item.userId === cleanUserId) {
          if (!type || item.type === type.toLowerCase()) {
            allMemories.push(item);
          }
        }
      }
    }

    // Rank memories by relevance to query terms
    const scored = allMemories.map((m) => {
      let score = m.importance * 0.5; // base score from importance
      const keyLower = m.key.toLowerCase();
      const valLower = m.value.toLowerCase();
      const typeLower = m.type.toLowerCase();

      const keyTokens = new Set(keyLower.split(/[^a-z0-9]+/).filter(Boolean));
      const valTokens = new Set(valLower.split(/[^a-z0-9]+/).filter(Boolean));

      let matchCount = 0;
      for (const term of searchTerms) {
        if (keyTokens.has(term)) {
          score += 4.0;
          matchCount++;
        } else if (term.length >= 4 && keyLower.includes(term)) {
          score += 2.5;
          matchCount++;
        }

        if (valTokens.has(term)) {
          score += 2.0;
          matchCount++;
        } else if (term.length >= 4 && valLower.includes(term)) {
          score += 1.0;
          matchCount++;
        }

        if (typeLower === term) {
          score += 1.5;
          matchCount++;
        }
      }

      return { memory: m, score, hasMatch: matchCount > 0 };
    });

    // If search terms were provided, only return memories that actually match query keywords
    let candidates = [];
    if (searchTerms.length > 0) {
      candidates = scored.filter((s) => s.hasMatch);
    } else {
      candidates = scored;
    }

    candidates.sort((a, b) => b.score - a.score);
    const results = candidates.slice(0, limit).map((c) => c.memory);

    // Update lastAccessedAt in background
    if (isDatabaseConnected() && results.length > 0) {
      const ids = results.map((r) => r.id);
      Memory.updateMany({ _id: { $in: ids } }, { $set: { lastAccessedAt: new Date() } }).catch(
        () => {}
      );
    }

    return results;
  }

  /**
   * Get all memories for a user (for development inspection / UI)
   */
  async getMemoriesByUser(userId) {
    if (!userId) return [];
    const cleanUserId = userId.trim();

    if (isDatabaseConnected()) {
      const docs = await Memory.find({ userId: cleanUserId }).sort({ updatedAt: -1 });
      return docs.map((d) => d.toJSON());
    }

    const list = [];
    for (const item of inMemoryMemories.values()) {
      if (item.userId === cleanUserId) {
        list.push(item);
      }
    }
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * Update an existing memory by ID
   */
  async updateMemory(memoryId, { value, confidence, importance }) {
    if (!memoryId) return null;

    const updates = {};
    if (value && typeof value === 'string' && value.trim()) {
      updates.value = value.trim();
    }
    if (confidence !== undefined) {
      const c = Number(confidence);
      if (isNaN(c) || c < 0 || c > 1) {
        throw new Error('Memory "confidence" must be between 0.0 and 1.0.');
      }
      updates.confidence = c;
    }
    if (importance !== undefined) {
      const i = Number(importance);
      if (isNaN(i) || i < 0 || i > 1) {
        throw new Error('Memory "importance" must be between 0.0 and 1.0.');
      }
      updates.importance = i;
    }
    updates.lastAccessedAt = new Date();

    if (isDatabaseConnected()) {
      if (!mongoose.Types.ObjectId.isValid(memoryId)) return null;
      const updated = await Memory.findByIdAndUpdate(
        memoryId,
        { $set: updates },
        { returnDocument: 'after', runValidators: true }
      );
      return updated ? updated.toJSON() : null;
    }

    const existing = inMemoryMemories.get(memoryId);
    if (!existing) return null;

    const modified = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    inMemoryMemories.set(memoryId, modified);
    return modified;
  }

  /**
   * Delete a memory record by ID
   */
  async deleteMemory(memoryId) {
    if (!memoryId) return false;

    if (isDatabaseConnected()) {
      if (!mongoose.Types.ObjectId.isValid(memoryId)) return false;
      const res = await Memory.findByIdAndDelete(memoryId);
      return Boolean(res);
    }

    return inMemoryMemories.delete(memoryId);
  }

  /**
   * Delete memory by user and key (e.g. "Forget that I am weak at SQL")
   */
  async deleteMemoryByKey(userId, key) {
    if (!userId || !key) return false;
    const cleanUserId = userId.trim();
    const cleanKey = key.trim();

    if (isDatabaseConnected()) {
      const res = await Memory.deleteMany({
        userId: cleanUserId,
        key: { $regex: new RegExp(`^${cleanKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      return res.deletedCount > 0;
    }

    let deleted = false;
    for (const [id, item] of inMemoryMemories.entries()) {
      if (item.userId === cleanUserId && item.key.toLowerCase() === cleanKey.toLowerCase()) {
        inMemoryMemories.delete(id);
        deleted = true;
      }
    }
    return deleted;
  }

  /**
   * Clear in-memory store (for test isolation)
   */
  clearMemory() {
    inMemoryMemories.clear();
  }
}

export const memoryService = new MemoryService();
