import mongoose from 'mongoose';

export const KNOWLEDGE_CONTENT_TYPES = [
  'notes',
  'guide',
  'interview',
  'concept',
  'roadmap',
  'reference',
];

export const KNOWLEDGE_STATUSES = ['active', 'archived'];

export const KNOWLEDGE_CATEGORIES = [
  'DSA',
  'DBMS',
  'OS',
  'Computer Networks',
  'OOP',
  'SQL',
  'Python',
  'JavaScript',
  'React',
  'Backend',
  'Data Science',
  'Machine Learning',
  'AI',
  'System Design',
  'HR / Behavioral',
  'Placement',
  'General',
];

const knowledgeDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required.'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    content: {
      type: String,
      required: [true, 'Document content is required.'],
    },
    contentHash: {
      type: String,
      default: '',
      index: true,
    },
    source: {
      type: String,
      trim: true,
      default: 'Placement Knowledge Engine',
    },
    category: {
      type: String,
      required: [true, 'Knowledge category is required.'],
      trim: true,
      default: 'General',
      index: true,
    },
    role: {
      type: String,
      trim: true,
      default: 'General',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    contentType: {
      type: String,
      enum: KNOWLEDGE_CONTENT_TYPES,
      default: 'concept',
    },
    status: {
      type: String,
      enum: KNOWLEDGE_STATUSES,
      default: 'active',
      index: true,
    },
    chunksCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    indexedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

knowledgeDocumentSchema.index({ category: 1, role: 1 });

knowledgeDocumentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
};

export const KnowledgeDocument =
  mongoose.models.KnowledgeDocument ||
  mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
