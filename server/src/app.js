import express from 'express';
import cors from 'cors';
import { config, validateAiConfig } from './config/env.js';
import { getDatabaseStatus } from './config/db.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import chatRoutes from './routes/chat.routes.js';
import userRoutes from './routes/user.routes.js';
import memoryRoutes from './routes/memory.routes.js';
import placementRoutes from './routes/placement.routes.js';
import practiceRoutes from './routes/practice.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import webRoutes from './routes/web.routes.js';
import { successResponse, errorResponse } from './utils/apiResponse.js';
import { metricsService } from './services/observability/metrics.service.js';

const app = express();

// Security & Parsing Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// Health & System Info
app.get('/api/health', (req, res) => {
  const { isValid, missing, provider } = validateAiConfig();
  const dbStatus = getDatabaseStatus();
  const activeModel = provider === 'gemini' ? config.gemini.model : config.openai.model;

  return successResponse(res, {
    status: 'online',
    service: 'AI Placement Agent Server',
    aiProvider: provider || 'gemini',
    aiProviderConfigured: isValid,
    configuredModel: activeModel || 'Not configured',
    aiReady: isValid,
    database: dbStatus,
    ...(missing.length > 0 ? { missingEnv: missing } : {}),
    timestamp: new Date().toISOString(),
  });
});

// Dependency Readiness Check (Phase 9)
app.get('/api/health/readiness', (req, res) => {
  const { isValid: aiConfigured, provider } = validateAiConfig();
  const dbStatus = getDatabaseStatus();

  return successResponse(res, {
    status: 'ready',
    database: dbStatus.connected ? 'connected' : (config.mongodbUri ? 'disconnected' : 'in-memory'),
    aiProvider: provider || 'gemini',
    aiProviderConfigured: aiConfigured,
    timestamp: new Date().toISOString(),
  });
});

// Observability Metrics Endpoint (Development/Diagnostics) (Phase 9)
app.get('/api/health/metrics', (req, res) => {
  if (config.nodeEnv === 'production' && !req.headers['x-admin-key']) {
    return errorResponse(res, 'Metrics endpoint is only accessible in development mode.', 403, 'FORBIDDEN');
  }

  const snapshot = metricsService.getMetricsSnapshot();
  return successResponse(res, snapshot);
});

// Mount Routes
app.use('/api', chatRoutes);
app.use('/api', userRoutes);
app.use('/api', memoryRoutes);
app.use('/api', placementRoutes);
app.use('/api', practiceRoutes);
app.use('/api', knowledgeRoutes);
app.use('/api', webRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
