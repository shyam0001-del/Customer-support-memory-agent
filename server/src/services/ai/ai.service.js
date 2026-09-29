import { config, validateAiConfig } from '../../config/env.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenAiProvider } from './providers/openai.provider.js';

/**
 * Provider-Agnostic AI Service
 * Delegates text and tool-calling generations to the configured provider (Gemini or OpenAI).
 */
class AiService {
  constructor() {
    this.geminiProvider = new GeminiProvider();
    this.openaiProvider = new OpenAiProvider();
  }

  /**
   * Retrieve active provider instance based on config.aiProvider
   * @returns {GeminiProvider|OpenAiProvider}
   */
  getProvider() {
    const providerName = (config.aiProvider || 'gemini').toLowerCase();
    if (providerName === 'gemini') {
      return this.geminiProvider;
    }
    if (providerName === 'openai') {
      return this.openaiProvider;
    }

    const err = new Error(
      `Unsupported AI provider: "${config.aiProvider}". Configured options are "gemini" or "openai".`
    );
    err.code = 'CONFIG_MISSING';
    err.statusCode = 500;
    throw err;
  }

  /**
   * Lazily initialize or retrieve the active provider's client
   */
  getClient() {
    return this.getProvider().getClient();
  }

  /**
   * Send a chat message or messages array to the active provider
   * @param {string|Array<{role: string, content: string}>} input - user message string or history array
   * @param {Object} options - additional options (systemPrompt, tools, temperature, etc.)
   * @returns {Promise<{message: string, model: string, usage: Object, toolCalls: Array}>}
   */
  async generateChatResponse(input, options = {}) {
    const provider = this.getProvider();
    return provider.generateChatResponse(input, options);
  }
}

// Export singleton instance
export const aiService = new AiService();
export { GeminiProvider, OpenAiProvider };
