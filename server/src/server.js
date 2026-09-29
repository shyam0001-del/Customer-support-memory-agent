import app from './app.js';
import { config, validateAiConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './config/db.js';
import { seedKnowledgeBase } from './services/rag/seedData.js';

const PORT = config.port;

async function bootstrap() {
  // Connect to MongoDB with graceful degradation
  await connectDatabase();

  // Initialize seed knowledge base if database is connected
  if (isDatabaseConnected()) {
    seedKnowledgeBase().catch((err) => {
      console.warn('⚠️  Initial knowledge base seeding warning:', err.message);
    });
  }

  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 AI Placement Agent Server running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔍 Environment: ${config.nodeEnv}`);

    const { isValid, missing, provider } = validateAiConfig();
    const activeModel = provider === 'gemini' ? config.gemini.model : config.openai.model;
    if (isValid) {
      console.log(`🤖 AI Engine: Ready (Provider: ${provider}, Model: ${activeModel})`);
    } else {
      console.warn(`⚠️  AI Warning: Missing config: ${missing.join(', ')}`);
      console.warn(`👉 Please set them in server/.env before calling /api/chat`);
    }
    console.log(`===============================================`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`${signal} signal received. Closing HTTP server...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
