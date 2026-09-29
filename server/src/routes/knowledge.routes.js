import express from 'express';
import {
  createDocumentHandler,
  listDocumentsHandler,
  getDocumentHandler,
  updateDocumentHandler,
  ingestDocumentHandler,
  deleteDocumentHandler,
  searchKnowledgeHandler,
} from '../controllers/knowledge.controller.js';

const router = express.Router();

/**
 * Knowledge Base & Document Management Routes
 * Development-only endpoints for Phase 7
 */
router.post('/knowledge/documents', createDocumentHandler);
router.get('/knowledge/documents', listDocumentsHandler);
router.get('/knowledge/documents/:documentId', getDocumentHandler);
router.put('/knowledge/documents/:documentId', updateDocumentHandler);
router.post('/knowledge/documents/:documentId/ingest', ingestDocumentHandler);
router.delete('/knowledge/documents/:documentId', deleteDocumentHandler);
router.post('/knowledge/search', searchKnowledgeHandler);

export default router;
