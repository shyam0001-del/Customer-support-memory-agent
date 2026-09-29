import mongoose from 'mongoose';

export const PRACTICE_MODES = [
  'practice',
  'technical_interview',
  'hr_interview',
  'mixed_interview',
];

export const QUESTION_TYPES = [
  'conceptual',
  'coding',
  'sql',
  'behavioral',
  'scenario',
];

export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'];

export const SESSION_STATUSES = ['active', 'in_progress', 'completed', 'abandoned'];

const EvaluationSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100, default: 0 },
    correctness: { type: Number, min: 0, max: 100, default: 0 },
    relevance: { type: Number, min: 0, max: 100, default: 0 },
    clarity: { type: Number, min: 0, max: 100, default: 0 },
    depth: { type: Number, min: 0, max: 100, default: 0 },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    missingConcepts: { type: [String], default: [] },
    feedback: { type: String, default: '' },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTIES,
      default: 'medium',
    },
    type: {
      type: String,
      enum: QUESTION_TYPES,
      default: 'conceptual',
    },
    expectedConcepts: { type: [String], default: [] },
    answer: { type: String, default: null },
    answeredAt: { type: Date, default: null },
    evaluation: { type: EvaluationSchema, default: null },
    score: { type: Number, min: 0, max: 100, default: null },
  },
  { _id: false }
);

const SessionSummarySchema = new mongoose.Schema(
  {
    averageScore: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    answeredQuestions: { type: Number, default: 0 },
    strongAreas: { type: [String], default: [] },
    weakAreas: { type: [String], default: [] },
    weakTopics: { type: [String], default: [] },
    recommendations: { type: mongoose.Schema.Types.Mixed, default: '' },
  },
  { _id: false }
);

const practiceSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: PRACTICE_MODES,
      default: 'practice',
    },
    role: {
      type: String,
      default: 'Software Engineer',
      trim: true,
    },
    topic: {
      type: String,
      default: 'General',
      trim: true,
    },
    difficulty: {
      type: String,
      enum: QUESTION_DIFFICULTIES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      default: 'in_progress',
      index: true,
    },
    questionCount: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    questions: {
      type: [QuestionSchema],
      default: [],
    },
    score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    summary: {
      type: SessionSummarySchema,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for candidate history lookups and active sessions
practiceSessionSchema.index({ userId: 1, createdAt: -1 });
practiceSessionSchema.index({ userId: 1, status: 1 });

practiceSessionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  obj.currentQuestion = Array.isArray(obj.questions) && obj.questions.length > 0
    ? obj.questions[obj.currentQuestionIndex || 0] || null
    : null;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export const PracticeSession =
  mongoose.models.PracticeSession || mongoose.model('PracticeSession', practiceSessionSchema);
