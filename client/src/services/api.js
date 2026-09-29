/**
 * API service for communicating with the Node.js Express backend
 */

const API_BASE = '/api';

/**
 * Send a chat message to the backend
 * @param {string} message - User message
 * @param {Array<{role: string, content: string}>} [history] - Optional conversation history
 * @param {string} [userId] - Optional active user profile ID (Phase 2)
 * @returns {Promise<{message: string, model?: string, usage?: Object}>}
 */
export async function sendChatMessage(message, history = [], userId = null) {
  try {
    const payload = {
      message,
      history,
    };

    if (userId && typeof userId === 'string' && userId.trim()) {
      payload.userId = userId.trim();
    }

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || !data?.success) {
      const errorMsg =
        data?.error?.message ||
        data?.message ||
        (response.status === 404
          ? 'API route or resource not found.'
          : response.status >= 500
          ? 'Backend service error. Please verify server logs.'
          : `Request failed with status ${response.status}`);
      const err = new Error(errorMsg);
      err.code = data?.error?.code || 'CHAT_ERROR';
      err.status = response.status;
      throw err;
    }

    return {
      message: data.data?.message || data.message || '',
      model: data.data?.model || 'configured model',
      usage: data.data?.usage || null,
      toolCalls: data.data?.toolCalls || [],
    };
  } catch (error) {
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
      const networkErr = new Error('Cannot connect to backend server. Ensure backend is running on port 5000.');
      networkErr.code = 'BACKEND_OFFLINE';
      throw networkErr;
    }
    console.error('API service error [sendChatMessage]:', error);
    throw error;
  }
}

/**
 * Check backend server and AI service readiness
 * @returns {Promise<{status: string, configuredModel: string, aiReady: boolean, database?: Object, missingEnv?: string[]}>}
 */
export async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) {
      throw new Error(`Health check returned status ${response.status}`);
    }
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('Backend health check unreachable:', error.message);
    return {
      status: 'offline',
      configuredModel: 'Unknown',
      aiReady: false,
      database: { status: 'offline', connected: false },
      error: error.message,
    };
  }
}

/**
 * ========================================================
 * User Profile API Methods (Phase 2)
 * ========================================================
 */

/**
 * Create a new user profile
 * @param {Object} profileData
 */
export async function createUserProfile(profileData) {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to create user profile');
    err.code = data?.error?.code || 'USER_CREATE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Retrieve user profile by ID
 * @param {string} id
 */
export async function getUserProfile(id) {
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch user profile');
    err.code = data?.error?.code || 'USER_FETCH_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Update an existing user profile
 * @param {string} id
 * @param {Object} updateData
 */
export async function updateUserProfile(id, updateData) {
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to update user profile');
    err.code = data?.error?.code || 'USER_UPDATE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Delete a user profile
 * @param {string} id
 */
export async function deleteUserProfile(id) {
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to delete user profile');
    err.code = data?.error?.code || 'USER_DELETE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * ========================================================
 * Memory API Methods (Phase 4)
 * Development-only endpoints until authentication exists
 * ========================================================
 */

/**
 * Fetch memories for a candidate
 * @param {string} userId
 */
export async function getUserMemories(userId) {
  if (!userId) return [];
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/memories`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch user memories');
    err.code = data?.error?.code || 'MEMORY_FETCH_ERROR';
    throw err;
  }
  return data.data || [];
}

/**
 * Delete a memory record
 * @param {string} memoryId
 */
export async function deleteUserMemory(memoryId) {
  if (!memoryId) return false;
  const response = await fetch(`${API_BASE}/memories/${encodeURIComponent(memoryId)}`, {
    method: 'DELETE',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to delete memory');
    err.code = data?.error?.code || 'MEMORY_DELETE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * ========================================================
 * Placement Intelligence API Methods (Phase 5)
 * ========================================================
 */

/**
 * Fetch available placement roles from catalog
 */
export async function fetchPlacementRoles() {
  const response = await fetch(`${API_BASE}/placement/roles`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch placement roles');
    err.code = data?.error?.code || 'ROLES_FETCH_ERROR';
    throw err;
  }
  return data.data || [];
}

/**
 * Fetch role requirements for a specific target role
 * @param {string} role
 */
export async function fetchRoleRequirements(role) {
  if (!role) return null;
  const response = await fetch(`${API_BASE}/placement/roles/${encodeURIComponent(role)}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch role requirements');
    err.code = data?.error?.code || 'ROLE_REQUIREMENTS_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Fetch deterministic placement intelligence analysis for active user
 * @param {string} userId
 * @param {string} [role]
 */
export async function fetchPlacementAnalysis(userId, role = null) {
  if (!userId) return null;
  const url = role
    ? `${API_BASE}/users/${encodeURIComponent(userId)}/placement-analysis?role=${encodeURIComponent(role)}`
    : `${API_BASE}/users/${encodeURIComponent(userId)}/placement-analysis`;

  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch placement analysis');
    err.code = data?.error?.code || 'PLACEMENT_ANALYSIS_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * ========================================================
 * PHASE 6: PRACTICE & INTERVIEW EVALUATION API
 * ========================================================
 */

/**
 * Start a new practice or mock interview session
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} [params.mode]
 * @param {string} [params.role]
 * @param {string} [params.topic]
 * @param {string} [params.difficulty]
 * @param {number} [params.questionCount]
 */
export async function createPracticeSession(params) {
  const response = await fetch(`${API_BASE}/practice/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to start practice session');
    err.code = data?.error?.code || 'PRACTICE_CREATE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Fetch a practice session by ID
 * @param {string} sessionId
 * @param {string} userId
 */
export async function fetchPracticeSession(sessionId, userId) {
  if (!sessionId || !userId) return null;
  const response = await fetch(
    `${API_BASE}/practice/sessions/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(userId)}`
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch practice session');
    err.code = data?.error?.code || 'PRACTICE_FETCH_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Submit an answer for the current question
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} answer
 */
export async function submitPracticeAnswer(sessionId, userId, answer) {
  const response = await fetch(`${API_BASE}/practice/sessions/${encodeURIComponent(sessionId)}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, answer }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to submit practice answer');
    err.code = data?.error?.code || 'PRACTICE_ANSWER_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Complete a practice session and retrieve performance summary
 * @param {string} sessionId
 * @param {string} userId
 */
export async function completePracticeSession(sessionId, userId) {
  const response = await fetch(`${API_BASE}/practice/sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to complete practice session');
    err.code = data?.error?.code || 'PRACTICE_COMPLETE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Fetch practice history for active candidate
 * @param {string} userId
 * @param {Object} [options]
 */
export async function fetchPracticeHistory(userId, options = {}) {
  if (!userId) return [];
  const query = new URLSearchParams();
  if (options.limit) query.append('limit', options.limit);
  if (options.mode) query.append('mode', options.mode);

  const url = `${API_BASE}/users/${encodeURIComponent(userId)}/practice-history?${query.toString()}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch practice history');
    err.code = data?.error?.code || 'PRACTICE_HISTORY_ERROR';
    throw err;
  }
  return data.data || [];
}

/**
 * Fetch weak practice topics for active candidate
 * @param {string} userId
 */
export async function fetchPracticeWeakTopics(userId) {
  if (!userId) return [];
  const response = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/practice-weak-topics`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch weak practice topics');
    err.code = data?.error?.code || 'PRACTICE_WEAK_TOPICS_ERROR';
    throw err;
  }
  return data.data || [];
}

/**
 * ========================================================
 * Knowledge Engine & RAG API Methods (Phase 7)
 * ========================================================
 */

/**
 * Fetch knowledge documents with optional filters
 * @param {Object} [filter]
 */
export async function fetchKnowledgeDocuments(filter = {}) {
  const query = new URLSearchParams();
  if (filter.category && filter.category !== 'all') query.append('category', filter.category);
  if (filter.role && filter.role !== 'all') query.append('role', filter.role);
  if (filter.status) query.append('status', filter.status);
  if (filter.limit) query.append('limit', filter.limit);

  const url = `${API_BASE}/knowledge/documents${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch knowledge documents');
    err.code = data?.error?.code || 'KNOWLEDGE_FETCH_ERROR';
    throw err;
  }
  return data.data || [];
}

/**
 * Fetch single knowledge document
 * @param {string} documentId
 */
export async function fetchKnowledgeDocument(documentId) {
  const response = await fetch(`${API_BASE}/knowledge/documents/${encodeURIComponent(documentId)}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to fetch document');
    err.code = data?.error?.code || 'DOCUMENT_FETCH_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Create a new knowledge document
 * @param {Object} docData
 */
export async function createKnowledgeDocument(docData) {
  const response = await fetch(`${API_BASE}/knowledge/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(docData),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to create knowledge document');
    err.code = data?.error?.code || 'DOCUMENT_CREATE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Ingest / Reindex a knowledge document
 * @param {string} documentId
 * @param {boolean} [force=false]
 */
export async function ingestKnowledgeDocument(documentId, force = false) {
  const response = await fetch(`${API_BASE}/knowledge/documents/${encodeURIComponent(documentId)}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to ingest knowledge document');
    err.code = data?.error?.code || 'DOCUMENT_INGEST_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Delete a knowledge document and its vector chunks
 * @param {string} documentId
 */
export async function deleteKnowledgeDocument(documentId) {
  const response = await fetch(`${API_BASE}/knowledge/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Failed to delete knowledge document');
    err.code = data?.error?.code || 'DOCUMENT_DELETE_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * Test semantic search against the knowledge vector store
 * @param {Object} searchParams
 */
export async function searchKnowledgeApi(searchParams) {
  const response = await fetch(`${API_BASE}/knowledge/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchParams),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Knowledge search failed');
    err.code = data?.error?.code || 'KNOWLEDGE_SEARCH_ERROR';
    throw err;
  }
  return data.data;
}

/**
 * ========================================================
 * Web Intelligence & Search API Methods (Phase 8)
 * ========================================================
 */

/**
 * Execute web search query
 * @param {Object} searchParams
 * @param {string} searchParams.query
 * @param {number} [searchParams.recencyDays]
 * @param {string} [searchParams.domain]
 * @param {string} [searchParams.intent]
 * @param {number} [searchParams.limit]
 */
export async function searchWebApi(searchParams) {
  const response = await fetch(`${API_BASE}/web/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchParams),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error?.message || 'Web search request failed');
    err.code = data?.error?.code || 'WEB_SEARCH_ERROR';
    throw err;
  }
  return data.data;
}
