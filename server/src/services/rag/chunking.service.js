/**
 * Chunking Service for Phase 7 RAG Knowledge Engine
 * Implements deterministic text chunking with paragraph/sentence boundary preservation.
 */

export const CHUNKING_DEFAULTS = {
  CHUNK_SIZE: 600, // Character target for chunks (~120-160 tokens)
  CHUNK_OVERLAP: 100, // Character overlap to preserve semantic continuity
  MIN_CHUNK_SIZE: 60, // Minimum character threshold to prevent tiny trailing fragments
};

export class ChunkingService {
  constructor(defaults = CHUNKING_DEFAULTS) {
    this.defaults = defaults;
  }

  /**
   * Split document text into structured chunks
   * @param {string} text - Source document content
   * @param {Object} [options]
   * @param {string} [options.documentId]
   * @param {number} [options.chunkSize]
   * @param {number} [options.chunkOverlap]
   * @param {Object} [options.metadata]
   * @returns {Array<{ chunkIndex: number, content: string, tokenCount: number, documentId?: string, metadata?: Object }>}
   */
  chunkText(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const cleanText = text.replace(/\r\n/g, '\n').trim();
    if (!cleanText) {
      return [];
    }

    const chunkSize = options.chunkSize || this.defaults.CHUNK_SIZE;
    const chunkOverlap = Math.min(
      options.chunkOverlap !== undefined ? options.chunkOverlap : this.defaults.CHUNK_OVERLAP,
      Math.floor(chunkSize / 2)
    );
    const documentId = options.documentId || null;
    const metadata = options.metadata || {};

    // If text is already smaller than or equal to chunkSize, return single chunk
    if (cleanText.length <= chunkSize) {
      return [
        {
          chunkIndex: 0,
          content: cleanText,
          tokenCount: this.estimateTokenCount(cleanText),
          documentId,
          metadata,
        },
      ];
    }

    // Split text hierarchically by paragraphs (\n\n), then lines (\n), then sentences (. )
    const paragraphs = cleanText.split(/\n\s*\n/);
    const segments = [];

    for (const p of paragraphs) {
      const trimmedP = p.trim();
      if (!trimmedP) continue;

      if (trimmedP.length <= chunkSize) {
        segments.push(trimmedP);
      } else {
        // Break large paragraphs by sentences or line breaks
        const sentences = trimmedP.split(/(?<=[.?!])\s+/);
        for (const s of sentences) {
          const trimmedS = s.trim();
          if (trimmedS) segments.push(trimmedS);
        }
      }
    }

    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];

      if (!currentChunk) {
        currentChunk = segment;
      } else if (currentChunk.length + segment.length + 1 <= chunkSize) {
        currentChunk += '\n\n' + segment;
      } else {
        // Chunk is full; finalize it
        chunks.push({
          chunkIndex,
          content: currentChunk.trim(),
          tokenCount: this.estimateTokenCount(currentChunk.trim()),
          documentId,
          metadata,
        });
        chunkIndex++;

        // Calculate overlap prefix from the end of currentChunk
        let overlapText = '';
        if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
          const rawSlice = currentChunk.slice(-chunkOverlap);
          // Try to snap to the nearest space/word boundary in overlap
          const firstSpace = rawSlice.indexOf(' ');
          overlapText = firstSpace !== -1 ? rawSlice.slice(firstSpace + 1).trim() : rawSlice.trim();
        }

        currentChunk = overlapText ? `${overlapText}\n\n${segment}` : segment;
      }
    }

    // Add trailing chunk if not empty and meets minimum size
    if (currentChunk.trim()) {
      const finalContent = currentChunk.trim();
      // If trailing chunk is very small and previous chunk exists, append to previous chunk
      if (
        finalContent.length < this.defaults.MIN_CHUNK_SIZE &&
        chunks.length > 0 &&
        chunks[chunks.length - 1].content.length + finalContent.length <= chunkSize * 1.3
      ) {
        chunks[chunks.length - 1].content += '\n\n' + finalContent;
        chunks[chunks.length - 1].tokenCount = this.estimateTokenCount(chunks[chunks.length - 1].content);
      } else {
        chunks.push({
          chunkIndex,
          content: finalContent,
          tokenCount: this.estimateTokenCount(finalContent),
          documentId,
          metadata,
        });
      }
    }

    return chunks;
  }

  /**
   * Approximate token count (roughly 4 characters per token in English technical text)
   * @param {string} text
   * @returns {number}
   */
  estimateTokenCount(text) {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    const chars = text.length;
    // Blend of word and char approximations
    return Math.max(1, Math.round((words * 1.3 + chars / 4) / 2));
  }
}

export const chunkingService = new ChunkingService();
