import { retrievalService } from './retrieval.service.js';
import { aiService } from '../ai/ai.service.js';
import { userService } from '../user/user.service.js';

export class RagService {
  /**
   * Retrieve relevant knowledge and format grounded context
   * @param {string} query
   * @param {Object} [options]
   * @returns {Promise<{ context: string, chunks: Array<Object>, sources: Array<string> }>}
   */
  async retrieveContext(query, options = {}) {
    const chunks = await retrievalService.search(query, options);
    const context = retrievalService.buildContext(chunks);
    const sources = this.formatSources(chunks);

    return {
      context,
      chunks,
      sources,
      hasKnowledge: chunks.length > 0,
    };
  }

  /**
   * Extract clean source citations from chunks without exposing internal identifiers
   * @param {Array<Object>} chunks
   * @returns {Array<string>}
   */
  formatSources(chunks = []) {
    if (!Array.isArray(chunks)) return [];
    const sourceSet = new Set();

    for (const chunk of chunks) {
      if (chunk.title) {
        sourceSet.add(chunk.title);
      } else if (chunk.metadata?.source) {
        sourceSet.add(chunk.metadata.source);
      }
    }

    return Array.from(sourceSet);
  }

  /**
   * Format sources into a readable markdown footer
   * @param {Array<string>} sources
   * @returns {string}
   */
  formatSourcesFooter(sources = []) {
    if (!Array.isArray(sources) || sources.length === 0) {
      return '';
    }
    return `\n\n**Sources:**\n${sources.map((s) => `- ${s}`).join('\n')}`;
  }

  /**
   * Build grounded prompt instructing model to prioritize retrieved context
   * @param {string} query
   * @param {string} contextBlock
   * @param {Object} [options]
   * @returns {string}
   */
  buildGroundedPrompt(query, contextBlock, options = {}) {
    return [
      '### RETRIEVED KNOWLEDGE CONTEXT:',
      contextBlock || 'No internal knowledge retrieved.',
      '',
      '### INSTRUCTIONS:',
      'Strictly prioritize the retrieved context above. Do not invent contradictory facts. If knowledge is insufficient, say so.',
      '',
      `### CANDIDATE QUERY:\n${query}`,
    ].join('\n');
  }

  /**
   * Build grounded system prompt instructing model to prioritize retrieved context
   * @param {string} contextBlock
   * @param {Object} [options]
   * @returns {string}
   */
  buildGroundedSystemPrompt(contextBlock, options = {}) {
    let prompt =
      'You are the AI Placement Agent, an intelligent engineering interview and career co-pilot. ' +
      'Answer the candidate\'s query accurately and constructively.\n\n' +
      'RAG Grounding Instructions:\n' +
      '1. Prioritize the retrieved internal knowledge context provided below over general assumptions.\n' +
      '2. Do NOT invent facts or statistics that contradict the retrieved context.\n' +
      '3. If the retrieved context does not contain sufficient information to answer the question thoroughly, explicitly acknowledge that internal reference materials are limited on that topic, and provide standard engineering best practices.\n' +
      '4. Distinguish verified internal guidelines from general assumptions.\n' +
      '5. Conclude your answer by citing the retrieved source titles under a "Sources:" heading.\n\n';

    if (contextBlock) {
      prompt += contextBlock + '\n\n';
    }

    return prompt;
  }

  /**
   * Answer a user question with retrieved knowledge grounding
   * @param {string|Object} queryOrParams
   * @param {Object} [extraOptions]
   * @returns {Promise<Object>}
   */
  async answerWithKnowledge(queryOrParams, extraOptions = {}) {
    let query;
    let history = [];
    let userId = null;
    let options = {};

    if (typeof queryOrParams === 'string') {
      query = queryOrParams;
      options = extraOptions || {};
      userId = options.userId || null;
      history = options.history || [];
    } else if (typeof queryOrParams === 'object' && queryOrParams !== null) {
      query = queryOrParams.query;
      history = queryOrParams.history || [];
      userId = queryOrParams.userId || null;
      options = queryOrParams.options || extraOptions || {};
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      throw new Error('Valid query string is required.');
    }

    // Load candidate role if available to refine retrieval
    let candidateRole = options.role || null;
    if (userId && !candidateRole) {
      try {
        const user = await userService.getUserById(userId);
        if (user?.targetRole) candidateRole = user.targetRole;
      } catch {
        candidateRole = null;
      }
    }

    // 1. Retrieve relevant knowledge chunks
    const minScore = options.minScore || 0.25;
    const { context, chunks, sources, hasKnowledge } = await this.retrieveContext(query.trim(), {
      role: candidateRole,
      category: options.category,
      limit: options.limit || 4,
      minScore,
    });

    const isSufficient = hasKnowledge && chunks.length > 0 && chunks.some((c) => c.score >= minScore);

    if (!isSufficient) {
      const fallbackMsg =
        'I searched our internal technical knowledge base, but do not have sufficient documentation on that specific topic.';
      return {
        message: fallbackMsg,
        answer: fallbackMsg,
        model: 'rag-engine',
        sources: [],
        retrievedChunksCount: 0,
        hasGroundedKnowledge: false,
        hasKnowledge: false,
      };
    }

    // 2. Build grounded prompt
    const systemPrompt = this.buildGroundedSystemPrompt(context, options);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.filter((m) => !m.isError),
      { role: 'user', content: query.trim() },
    ];

    // 3. Generate response via AI Service
    const aiResponse = await aiService.generateChatResponse(messages);

    let messageText = aiResponse.message;

    // Ensure sources are cited in the output if not already present
    if (sources.length > 0 && !messageText.toLowerCase().includes('sources:')) {
      messageText += this.formatSourcesFooter(sources);
    }

    return {
      message: messageText,
      answer: messageText,
      model: aiResponse.model,
      usage: aiResponse.usage,
      sources,
      retrievedChunksCount: chunks.length,
      hasGroundedKnowledge: true,
      hasKnowledge: true,
    };
  }
}

export const ragService = new RagService();
