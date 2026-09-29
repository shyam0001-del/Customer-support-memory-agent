import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server root or parent directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Also attempt fallback to current working directory .env
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  aiProvider: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  },
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER || 'openai',
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  },
  webSearch: {
    provider: process.env.WEB_SEARCH_PROVIDER || 'mock',
    apiKey: process.env.WEB_SEARCH_API_KEY || '',
    engine: process.env.WEB_SEARCH_ENGINE || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10),
  },
  mongodbUri: process.env.MONGODB_URI || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};

/**
 * Validates critical environment variables required for AI operations based on active provider
 */
export function validateAiConfig() {
  const missing = [];
  const provider = (config.aiProvider || 'gemini').toLowerCase();

  if (provider === 'gemini') {
    if (!config.gemini.apiKey) {
      missing.push('GEMINI_API_KEY');
    }
    if (!config.gemini.model) {
      missing.push('GEMINI_MODEL');
    }
  } else if (provider === 'openai') {
    if (!config.openai.apiKey) {
      missing.push('OPENAI_API_KEY');
    }
    if (!config.openai.model) {
      missing.push('OPENAI_MODEL');
    }
  } else {
    missing.push(`Unsupported AI_PROVIDER "${provider}". Expected "gemini" or "openai".`);
  }

  return {
    isValid: missing.length === 0,
    missing,
    provider,
  };
}
