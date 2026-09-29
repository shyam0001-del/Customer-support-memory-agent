import { documentService } from '../services/rag/document.service.js';
import { retrievalService } from '../services/rag/retrieval.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * POST /api/knowledge/documents
 * Create a new knowledge document
 */
export async function createDocumentHandler(req, res, next) {
  try {
    const { title, description, content, category, role, tags, contentType, status, source } =
      req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return errorResponse(res, 'Document title is required.', 400, 'VALIDATION_ERROR');
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return errorResponse(res, 'Document content is required.', 400, 'VALIDATION_ERROR');
    }

    const doc = await documentService.createDocument({
      title: title.trim(),
      description,
      content: content.trim(),
      category,
      role,
      tags,
      contentType,
      status,
      source,
    });

    return successResponse(res, doc, 201);
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    next(error);
  }
}

/**
 * GET /api/knowledge/documents
 * List all knowledge documents with optional filters
 */
export async function listDocumentsHandler(req, res, next) {
  try {
    const { category, role, status, limit } = req.query;

    const docs = await documentService.listDocuments({
      category: category && typeof category === 'string' ? category.trim() : undefined,
      role: role && typeof role === 'string' ? role.trim() : undefined,
      status: status && typeof status === 'string' ? status.trim() : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return successResponse(res, docs, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/knowledge/documents/:documentId
 * Retrieve single document details
 */
export async function getDocumentHandler(req, res, next) {
  try {
    const { documentId } = req.params;
    if (!documentId) {
      return errorResponse(res, 'Document ID is required.', 400, 'VALIDATION_ERROR');
    }

    const doc = await documentService.getDocument(documentId);
    return successResponse(res, doc, 200);
  } catch (error) {
    if (error.message.includes('not found')) {
      return errorResponse(res, error.message, 404, 'DOCUMENT_NOT_FOUND');
    }
    next(error);
  }
}

/**
 * PUT /api/knowledge/documents/:documentId
 * Update document metadata or content
 */
export async function updateDocumentHandler(req, res, next) {
  try {
    const { documentId } = req.params;
    if (!documentId) {
      return errorResponse(res, 'Document ID is required.', 400, 'VALIDATION_ERROR');
    }

    const updated = await documentService.updateDocument(documentId, req.body || {});
    return successResponse(res, updated, 200);
  } catch (error) {
    if (error.message.includes('not found')) {
      return errorResponse(res, error.message, 404, 'DOCUMENT_NOT_FOUND');
    }
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return errorResponse(res, error.message, 400, 'VALIDATION_ERROR');
    }
    next(error);
  }
}

/**
 * POST /api/knowledge/documents/:documentId/ingest
 * Ingest or reindex a knowledge document into vector store
 */
export async function ingestDocumentHandler(req, res, next) {
  try {
    const { documentId } = req.params;
    const { force = false } = req.body || {};

    if (!documentId) {
      return errorResponse(res, 'Document ID is required.', 400, 'VALIDATION_ERROR');
    }

    const result = await documentService.ingestDocument(documentId, force);
    return successResponse(res, result, 200);
  } catch (error) {
    if (error.message.includes('not found')) {
      return errorResponse(res, error.message, 404, 'DOCUMENT_NOT_FOUND');
    }
    next(error);
  }
}

/**
 * DELETE /api/knowledge/documents/:documentId
 * Delete knowledge document and all its chunks from vector store
 */
export async function deleteDocumentHandler(req, res, next) {
  try {
    const { documentId } = req.params;
    if (!documentId) {
      return errorResponse(res, 'Document ID is required.', 400, 'VALIDATION_ERROR');
    }

    const result = await documentService.deleteDocument(documentId);
    return successResponse(res, result, 200);
  } catch (error) {
    if (error.message.includes('not found')) {
      return errorResponse(res, error.message, 404, 'DOCUMENT_NOT_FOUND');
    }
    next(error);
  }
}

/**
 * POST /api/knowledge/search
 * Direct search endpoint for semantic testing and verification
 */
export async function searchKnowledgeHandler(req, res, next) {
  try {
    const { query, role, category, topic, limit } = req.body || {};

    if (!query || typeof query !== 'string' || !query.trim()) {
      return errorResponse(res, 'Search query is required.', 400, 'VALIDATION_ERROR');
    }

    const results = await retrievalService.search(query.trim(), {
      role: role && typeof role === 'string' ? role.trim() : undefined,
      category: category && typeof category === 'string' ? category.trim() : undefined,
      topic: topic && typeof topic === 'string' ? topic.trim() : undefined,
      limit: limit ? Number(limit) : 5,
    });

    return successResponse(
      res,
      {
        query: query.trim(),
        totalResults: results.length,
        results: results.map((r) => ({
          chunkId: r.chunkId,
          documentId: r.documentId,
          title: r.title,
          content: r.content,
          score: r.score,
          metadata: r.metadata,
        })),
      },
      200
    );
  } catch (error) {
    next(error);
  }
}
