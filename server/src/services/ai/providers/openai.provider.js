import OpenAI from 'openai';
import { config } from '../../../config/env.js';

/**
 * OpenAI Provider Implementation (preserved for provider-agnostic switching)
 */
export class OpenAiProvider {
  constructor() {
    this.client = null;
  }

  /**
   * Lazily initialize OpenAI client instance
   */
  getClient() {
    const apiKey = config.openai?.apiKey;
    const model = config.openai?.model;

    if (!apiKey) {
      const err = new Error(
        'AI configuration missing: OPENAI_API_KEY. Please configure your .env file with OPENAI_API_KEY and OPENAI_MODEL.'
      );
      err.code = 'CONFIG_MISSING';
      err.statusCode = 500;
      throw err;
    }

    if (!model) {
      const err = new Error(
        'AI configuration missing: OPENAI_MODEL. Please configure your .env file with OPENAI_MODEL.'
      );
      err.code = 'CONFIG_MISSING';
      err.statusCode = 500;
      throw err;
    }

    if (!this.client) {
      const clientOptions = { apiKey };
      if (config.openai.baseURL) {
        clientOptions.baseURL = config.openai.baseURL;
      }
      this.client = new OpenAI(clientOptions);
    }

    return this.client;
  }

  /**
   * Send a chat message or messages array to OpenAI
   * @param {string|Array<Object>} input
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async generateChatResponse(input, options = {}) {
    const client = this.getClient();
    const model = config.openai.model;

    const defaultSystemPrompt =
      'You are the AI Placement Agent, an intelligent, empathetic, and rigorous placement and interview preparation assistant for engineering students and tech candidates. ' +
      'Your mission is to help candidates crack their target roles (Software Engineering, Data Science, Data Analyst, ML, DevOps, Product, etc.). ' +
      'Provide structured, clear, and actionable advice. When explaining technical concepts, use concise explanations, clear examples, and best-practice frameworks. ' +
      'Maintain an encouraging, highly professional tone.';

    let systemPromptContent = options.systemPrompt || defaultSystemPrompt;
    if (options.profileContext) {
      systemPromptContent += `\n\n${options.profileContext}\nTailor your guidance, questions, and roadmaps to this candidate's background, target role, and focus areas.`;
    }

    let messages = [];

    if (Array.isArray(input)) {
      const hasSystem = input.some((m) => m.role === 'system');
      if (!hasSystem) {
        messages = [
          { role: 'system', content: systemPromptContent },
          ...input,
        ];
      } else {
        messages = input;
      }
    } else if (typeof input === 'string') {
      messages = [
        { role: 'system', content: systemPromptContent },
        { role: 'user', content: input },
      ];
    } else {
      const err = new Error('Invalid input: message must be a string or an array of messages');
      err.code = 'INVALID_INPUT';
      err.statusCode = 400;
      throw err;
    }

    try {
      const completionPayload = {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      };

      if (Array.isArray(options.tools) && options.tools.length > 0) {
        completionPayload.tools = options.tools;
        if (options.toolChoice) {
          completionPayload.tool_choice = options.toolChoice;
        }
      }

      const response = await client.chat.completions.create(completionPayload);
      const choiceMessage = response.choices?.[0]?.message || {};
      const replyContent = choiceMessage.content ? choiceMessage.content.trim() : '';

      return {
        message: replyContent,
        rawMessage: choiceMessage,
        toolCalls: choiceMessage.tool_calls || null,
        model: response.model || model,
        usage: response.usage || null,
      };
    } catch (error) {
      console.error('OpenAI API error:', error?.message || error);

      let statusCode = 502;
      let code = 'AI_SERVICE_ERROR';
      let message = error?.message || 'Error communicating with AI service';

      if (typeof error?.status === 'number' && error.status >= 400 && error.status < 600) {
        statusCode = error.status;
      }

      if (error?.status === 401 || error?.code === 'invalid_api_key') {
        statusCode = 401;
        code = 'INVALID_API_KEY';
        message = 'Invalid API key provided. Please check OPENAI_API_KEY in your server/.env file.';
      } else if (error?.status === 404 || error?.code === 'model_not_found') {
        statusCode = 404;
        code = 'MODEL_NOT_FOUND';
        message = `The configured model "${model}" was not found or is not accessible with this API key.`;
      } else if (error?.status === 429) {
        statusCode = 429;
        code = 'RATE_LIMIT_EXCEEDED';
        message = 'AI rate limit exceeded or quota exhausted. Please check your provider account.';
      }

      const err = new Error(message);
      err.code = code;
      err.statusCode = statusCode;
      throw err;
    }
  }
}
