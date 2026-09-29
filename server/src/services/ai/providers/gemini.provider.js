import { GoogleGenAI } from '@google/genai';
import { config } from '../../../config/env.js';

/**
 * Adapt OpenAI-compatible tool definitions to Gemini function declarations
 * @param {Array<Object>} tools
 * @returns {Array<{functionDeclarations: Array<Object>}>|undefined}
 */
export function adaptToolsToGemini(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;

  const functionDeclarations = tools.map((tool) => {
    const fn = tool.function || tool;
    const rawParameters = fn.parameters || { type: 'object', properties: {} };

    // Ensure parameters object conforms to JSON Schema expected by Gemini
    const parameters = {
      type: rawParameters.type || 'object',
      properties: rawParameters.properties || {},
      ...(Array.isArray(rawParameters.required) ? { required: rawParameters.required } : {}),
      ...(rawParameters.description ? { description: rawParameters.description } : {}),
    };

    return {
      name: fn.name,
      description: fn.description || '',
      parameters,
    };
  });

  return [{ functionDeclarations }];
}

/**
 * Adapt messages array to Gemini contents and systemInstruction
 * @param {string|Array<Object>} input
 * @param {Object} [options]
 * @returns {{ systemInstruction: string, contents: Array<Object> }}
 */
export function adaptMessagesToGemini(input, options = {}) {
  const defaultSystemPrompt =
    'You are the AI Placement Agent, an intelligent, empathetic, and rigorous placement and interview preparation assistant for engineering students and tech candidates. ' +
    'Your mission is to help candidates crack their target roles (Software Engineering, Data Science, Data Analyst, ML, DevOps, Product, etc.). ' +
    'Provide structured, clear, and actionable advice. When explaining technical concepts, use concise explanations, clear examples, and best-practice frameworks. ' +
    'Maintain an encouraging, highly professional tone.';

  let baseSystemPrompt = options.systemPrompt || defaultSystemPrompt;
  if (options.profileContext) {
    baseSystemPrompt += `\n\n${options.profileContext}\nTailor your guidance, questions, and roadmaps to this candidate's background, target role, and focus areas.`;
  }

  let messages = [];

  if (Array.isArray(input)) {
    messages = input;
  } else if (typeof input === 'string') {
    messages = [
      { role: 'system', content: baseSystemPrompt },
      { role: 'user', content: input },
    ];
  } else {
    const err = new Error('Invalid input: message must be a string or an array of messages');
    err.code = 'INVALID_INPUT';
    err.statusCode = 400;
    throw err;
  }

  let systemInstruction = '';
  const contents = [];
  let pendingToolParts = [];

  const flushToolParts = () => {
    if (pendingToolParts.length > 0) {
      contents.push({ role: 'user', parts: pendingToolParts });
      pendingToolParts = [];
    }
  };

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction += (systemInstruction ? '\n\n' : '') + (msg.content || '');
      continue;
    }

    if (msg.role === 'tool') {
      let parsedOutput;
      try {
        parsedOutput = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
      } catch {
        parsedOutput = { result: msg.content };
      }
      if (typeof parsedOutput !== 'object' || parsedOutput === null) {
        parsedOutput = { result: parsedOutput };
      }

      pendingToolParts.push({
        functionResponse: {
          name: msg.name || 'tool_response',
          response: { output: parsedOutput },
        },
      });
      continue;
    }

    // Flush any accumulated tool parts before adding another message turn
    flushToolParts();

    if (msg.role === 'assistant' || msg.role === 'model') {
      const parts = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          let args = {};
          try {
            args = typeof tc.function?.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : (tc.function?.arguments || {});
          } catch {
            args = {};
          }
          const callPart = {
            functionCall: {
              name: tc.function?.name,
              args,
            },
          };
          if (tc.thoughtSignature) {
            callPart.thoughtSignature = tc.thoughtSignature;
          }
          parts.push(callPart);
        }
      }
      if (parts.length > 0) {
        contents.push({ role: 'model', parts });
      }
    } else if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }],
      });
    }
  }

  flushToolParts();

  if (!systemInstruction) {
    systemInstruction = baseSystemPrompt;
  }

  return { systemInstruction, contents };
}

/**
 * Normalize Gemini API response into the application's standard AI response format
 * @param {Object} response - Raw response from GoogleGenAI
 * @param {string} model - Configured model name
 * @returns {Object} Normalized AI response
 */
export function normalizeGeminiResponse(response, model) {
  let normalizedToolCalls = null;

  // Handle functionCalls from response helper or candidates
  const candidateParts = response?.candidates?.[0]?.content?.parts || [];
  const functionCalls = response?.functionCalls ||
    candidateParts
      ?.filter((p) => p.functionCall)
      ?.map((p) => p.functionCall) ||
    [];

  if (Array.isArray(functionCalls) && functionCalls.length > 0) {
    normalizedToolCalls = functionCalls.map((fc, idx) => {
      const matchingPart = candidateParts.find(
        (p) => p.functionCall?.name === fc.name || p.functionCall?.id === fc.id
      );
      return {
        id: fc.id || `call_gemini_${Date.now()}_${idx}`,
        type: 'function',
        thoughtSignature: fc.thoughtSignature || matchingPart?.thoughtSignature,
        function: {
          name: fc.name,
          arguments: typeof fc.args === 'string' ? fc.args : JSON.stringify(fc.args || {}),
        },
      };
    });
  }

  const replyText = typeof response?.text === 'string' ? response.text.trim() : '';

  // Extract usage metadata if provided by Gemini
  const usageMeta = response?.usageMetadata || null;
  const usage = usageMeta
    ? {
        promptTokens: usageMeta.promptTokenCount ?? null,
        completionTokens: usageMeta.candidatesTokenCount ?? null,
        totalTokens: usageMeta.totalTokenCount ?? null,
      }
    : null;

  return {
    message: replyText,
    rawMessage: {
      role: 'assistant',
      content: replyText || null,
      tool_calls: normalizedToolCalls,
    },
    toolCalls: normalizedToolCalls,
    model: model || 'gemini',
    usage,
  };
}

/**
 * Normalize Gemini error into standardized application error
 * @param {Error|Object} error
 * @param {string} model
 * @returns {Error}
 */
export function normalizeGeminiError(error, model) {
  const rawMsg = error?.message || 'Error communicating with Google Gemini service';
  const status = error?.status;

  let statusCode = 502;
  let code = 'AI_SERVICE_ERROR';
  let message = rawMsg;

  const msgLower = rawMsg.toLowerCase();

  if (
    msgLower.includes('api_key_invalid') ||
    msgLower.includes('api key not valid') ||
    status === 401
  ) {
    statusCode = 401;
    code = 'INVALID_API_KEY';
    message = 'Invalid API key provided. Please check GEMINI_API_KEY in your server/.env file.';
  } else if (
    msgLower.includes('not found') ||
    msgLower.includes('models/') ||
    status === 404
  ) {
    statusCode = 404;
    code = 'MODEL_NOT_FOUND';
    message = `The configured model "${model}" was not found or is not accessible with this API key.`;
  } else if (
    msgLower.includes('resource_exhausted') ||
    msgLower.includes('quota') ||
    msgLower.includes('rate limit') ||
    status === 429
  ) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'AI rate limit exceeded or quota exhausted. Please check your Gemini API account/tier.';
  } else if (
    error?.name === 'AbortError' ||
    msgLower.includes('timed out') ||
    msgLower.includes('aborted')
  ) {
    statusCode = 504;
    code = 'TIMEOUT_ERROR';
    message = 'The AI request timed out.';
  }

  // Scrub any accidentally included keys in error message
  message = message.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]');

  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
}

/**
 * Gemini Provider Implementation
 */
export class GeminiProvider {
  constructor() {
    this.client = null;
  }

  /**
   * Lazily initialize GoogleGenAI client instance
   */
  getClient() {
    const apiKey = config.gemini?.apiKey;
    const model = config.gemini?.model;

    if (!apiKey) {
      const err = new Error(
        'AI configuration missing: GEMINI_API_KEY. Please configure your .env file with GEMINI_API_KEY and GEMINI_MODEL.'
      );
      err.code = 'CONFIG_MISSING';
      err.statusCode = 500;
      throw err;
    }

    if (!model) {
      const err = new Error(
        'AI configuration missing: GEMINI_MODEL. Please configure your .env file with GEMINI_MODEL.'
      );
      err.code = 'CONFIG_MISSING';
      err.statusCode = 500;
      throw err;
    }

    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey });
    }

    return this.client;
  }

  /**
   * Send a chat message or messages array to Google Gemini
   * @param {string|Array<Object>} input
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async generateChatResponse(input, options = {}) {
    const client = this.getClient();
    const model = config.gemini?.model || 'gemini-2.5-flash';

    const { systemInstruction, contents } = adaptMessagesToGemini(input, options);
    const geminiTools = adaptToolsToGemini(options.tools);

    const timeoutMs = options.timeoutMs || 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const callConfig = {
        abortSignal: controller.signal,
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      };

      if (systemInstruction) {
        callConfig.systemInstruction = systemInstruction;
      }

      if (geminiTools) {
        callConfig.tools = geminiTools;
      }

      const response = await client.models.generateContent({
        model,
        contents,
        config: callConfig,
      });

      return normalizeGeminiResponse(response, model);
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'AbortError') {
        const timeoutErr = new Error(`AI request timed out after ${timeoutMs}ms.`);
        timeoutErr.code = 'TIMEOUT_ERROR';
        timeoutErr.statusCode = 504;
        throw timeoutErr;
      }

      throw normalizeGeminiError(error, model);
    } finally {
      clearTimeout(timer);
    }
  }
}
