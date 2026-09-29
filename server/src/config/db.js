import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

/**
 * Sanitize MongoDB URI to prevent logging credentials
 */
export function sanitizeMongoUri(uri) {
  if (!uri) return 'Not configured';
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  } catch {
    return '***';
  }
}

/**
 * Connect to MongoDB with graceful degradation if unavailable
 */
export async function connectDatabase() {
  if (!config.mongodbUri) {
    console.warn('⚠️  MongoDB Warning: MONGODB_URI not set. Running in in-memory / fallback mode.');
    isConnected = false;
    return false;
  }

  try {
    // Event listeners
    mongoose.connection.on('connected', () => {
      isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      console.error('⚠️  MongoDB Connection error:', err.message || err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
    });

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 3000,
    });

    isConnected = true;
    console.log(`📦 MongoDB: Connected successfully to ${sanitizeMongoUri(config.mongodbUri)}`);
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`⚠️  MongoDB Warning: Could not connect to database (${error.message || 'Connection failed'}).`);
    console.warn('👉 Profile operations will report database offline until MongoDB is reachable.');
    return false;
  }
}

/**
 * Disconnect from MongoDB (for tests or graceful shutdown)
 */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  isConnected = false;
}

/**
 * Returns current MongoDB connectivity state
 */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1 || isConnected;
}

/**
 * Returns status object suitable for health check
 */
export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const state = states[mongoose.connection.readyState] || 'disconnected';
  return {
    status: state,
    connected: isDatabaseConnected(),
    uriConfigured: Boolean(config.mongodbUri),
  };
}
