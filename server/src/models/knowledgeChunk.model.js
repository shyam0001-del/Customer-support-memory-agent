import mongoose from 'mongoose';

const knowledgeChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDocument',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    embedding: {
      type: [Number],
      required: true,
      select: false, // Never expose raw embeddings in ordinary queries
    },
    tokenCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      title: { type: String, default: '' },
      category: { type: String, default: 'General', index: true },
      role: { type: String, default: 'General', index: true },
      topic: { type: String, default: '' },
      tags: { type: [String], default: [] },
      source: { type: String, default: '' },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

knowledgeChunkSchema.index({ documentId: 1, chunkIndex: 1 });
knowledgeChunkSchema.index({ 'metadata.category': 1, 'metadata.role': 1 });

knowledgeChunkSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  obj.documentId = obj.documentId ? obj.documentId.toString() : '';
  delete obj._id;
  delete obj.__v;
  delete obj.embedding; // Security guardrail: never send raw vector embeddings to client
  return obj;
};

export const KnowledgeChunk =
  mongoose.models.KnowledgeChunk ||
  mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
