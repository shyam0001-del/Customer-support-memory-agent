import mongoose from 'mongoose';
import { User } from '../../models/user.model.js';
import { isDatabaseConnected } from '../../config/db.js';

// In-memory fallback repository for offline/test mode when MongoDB is unavailable
const memoryUsers = new Map();

/**
 * Format a user profile into a clean, concise string for LLM context (Section 6)
 * Avoids dumping raw MongoDB internals into the prompt.
 * @param {Object} user
 * @returns {string}
 */
export function formatProfileContext(user) {
  if (!user) return '';

  const skillsStr = Array.isArray(user.skills) && user.skills.length > 0
    ? user.skills.map((s) => `${s.name}${s.level ? ` (${s.level})` : ''}`).join(', ')
    : 'Not specified';

  const companiesStr = Array.isArray(user.targetCompanies) && user.targetCompanies.length > 0
    ? user.targetCompanies.join(', ')
    : 'Not specified';

  const weakAreasStr = Array.isArray(user.weakAreas) && user.weakAreas.length > 0
    ? user.weakAreas.join(', ')
    : 'None highlighted yet';

  return [
    'Candidate Profile Context:',
    `- Name: ${user.name || 'Candidate'}`,
    user.degree ? `- Degree: ${user.degree}${user.specialization ? ` (${user.specialization})` : ''}` : null,
    `- Experience Level: ${user.experienceLevel || 'Student'}`,
    `- Target Role: ${user.targetRole || 'Not specified'}`,
    `- Target Companies: ${companiesStr}`,
    `- Current Skills: ${skillsStr}`,
    `- Weak Areas / Focus Needed: ${weakAreasStr}`,
    typeof user.leetcodeSolved === 'number' && user.leetcodeSolved > 0
      ? `- LeetCode Problems Solved: ${user.leetcodeSolved}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

class UserService {
  /**
   * Create a new user profile
   */
  async createUser(userData) {
    if (isDatabaseConnected()) {
      const user = new User(userData);
      await user.save();
      return user.toJSON();
    }

    // In-memory fallback for testing or offline database
    const fakeId = new mongoose.Types.ObjectId().toString();
    const newUser = {
      id: fakeId,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryUsers.set(fakeId, newUser);
    return newUser;
  }

  /**
   * Find user profile by ID
   */
  async getUserById(id) {
    if (!id) return null;

    if (isDatabaseConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      const user = await User.findById(id);
      return user ? user.toJSON() : null;
    }

    // In-memory fallback
    return memoryUsers.get(id) || null;
  }

  /**
   * Update an existing user profile
   */
  async updateUser(id, updateData) {
    if (!id) return null;

    if (isDatabaseConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }
      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { returnDocument: 'after', runValidators: true }
      );
      return user ? user.toJSON() : null;
    }

    // In-memory fallback
    const existing = memoryUsers.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryUsers.set(id, updated);
    return updated;
  }

  /**
   * Delete a user profile by ID
   */
  async deleteUser(id) {
    if (!id) return false;

    if (isDatabaseConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return false;
      }
      const result = await User.findByIdAndDelete(id);
      return Boolean(result);
    }

    // In-memory fallback
    return memoryUsers.delete(id);
  }

  /**
   * Get user preparation progress (Section 3)
   */
  async getUserProgress(id) {
    const user = await this.getUserById(id);
    if (!user) return null;

    const progressList = Array.isArray(user.progress) ? user.progress : [];
    const weakAreas = Array.isArray(user.weakAreas) ? user.weakAreas : [];

    const completedTopics = progressList
      .filter((p) => p.status === 'completed')
      .map((p) => p.topic);

    const weakFromProgress = progressList
      .filter((p) => p.status === 'weak' || p.status === 'needs_review')
      .map((p) => p.topic);

    const allWeakTopics = Array.from(new Set([...weakAreas, ...weakFromProgress]));

    const recentProgress = progressList
      .slice(-5)
      .reverse()
      .map((p) => ({
        topic: p.topic,
        status: p.status,
        notes: p.notes,
        updatedAt: p.updatedAt,
      }));

    return {
      userId: user.id,
      candidateName: user.name,
      targetRole: user.targetRole || 'Not specified',
      completedTopics,
      weakTopics: allWeakTopics,
      recentProgress,
      leetcodeSolved: user.leetcodeSolved || 0,
      totalTrackedTopics: progressList.length,
    };
  }

  /**
   * Update user preparation progress (Section 3)
   */
  async updateUserProgress(id, { topic, status, notes = '' }) {
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      throw new Error('Valid "topic" string is required.');
    }

    const validStatuses = ['completed', 'in_progress', 'needs_review', 'weak'];
    const normalizedStatus = (status || 'in_progress').toLowerCase().trim();
    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error(`Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`);
    }

    const cleanTopic = topic.trim();
    const cleanNotes = typeof notes === 'string' ? notes.trim() : '';

    if (isDatabaseConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }

      const user = await User.findById(id);
      if (!user) return null;

      if (!Array.isArray(user.progress)) {
        user.progress = [];
      }

      const existingIndex = user.progress.findIndex(
        (p) => p.topic.toLowerCase() === cleanTopic.toLowerCase()
      );

      const progressEntry = {
        topic: cleanTopic,
        status: normalizedStatus,
        notes: cleanNotes,
        updatedAt: new Date(),
      };

      if (existingIndex >= 0) {
        user.progress[existingIndex] = progressEntry;
      } else {
        user.progress.push(progressEntry);
      }

      // If marked weak, ensure added to weakAreas; if marked completed, remove from weakAreas
      if (normalizedStatus === 'weak' && !user.weakAreas.includes(cleanTopic)) {
        user.weakAreas.push(cleanTopic);
      } else if (normalizedStatus === 'completed') {
        user.weakAreas = user.weakAreas.filter((w) => w.toLowerCase() !== cleanTopic.toLowerCase());
      }

      await user.save();
      return {
        updated: true,
        topic: cleanTopic,
        status: normalizedStatus,
        notes: cleanNotes,
        userId: user.id,
      };
    }

    // In-memory fallback
    const user = memoryUsers.get(id);
    if (!user) return null;

    if (!Array.isArray(user.progress)) {
      user.progress = [];
    }
    if (!Array.isArray(user.weakAreas)) {
      user.weakAreas = [];
    }

    const existingIndex = user.progress.findIndex(
      (p) => p.topic.toLowerCase() === cleanTopic.toLowerCase()
    );

    const progressEntry = {
      topic: cleanTopic,
      status: normalizedStatus,
      notes: cleanNotes,
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      user.progress[existingIndex] = progressEntry;
    } else {
      user.progress.push(progressEntry);
    }

    if (normalizedStatus === 'weak' && !user.weakAreas.includes(cleanTopic)) {
      user.weakAreas.push(cleanTopic);
    } else if (normalizedStatus === 'completed') {
      user.weakAreas = user.weakAreas.filter((w) => w.toLowerCase() !== cleanTopic.toLowerCase());
    }

    user.updatedAt = new Date();
    memoryUsers.set(id, user);

    return {
      updated: true,
      topic: cleanTopic,
      status: normalizedStatus,
      notes: cleanNotes,
      userId: user.id,
    };
  }

  /**
   * Helper alias for updating candidate preparation progress
   */
  async updateProgress({ userId, topic, status, notes = '' }) {
    return this.updateUserProgress(userId, { topic, status, notes });
  }

  /**
   * Clear in-memory users (for test isolation)
   */
  clearMemory() {
    memoryUsers.clear();
  }
}

export const userService = new UserService();
