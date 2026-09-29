import mongoose from 'mongoose';

export const ALLOWED_MEMORY_TYPES = [
  'preference',
  'strength',
  'weakness',
  'goal',
  'achievement',
  'learning_progress',
  'interview',
  'career',
  'study_habit',
];

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      index: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Memory type is required'],
      enum: {
        values: ALLOWED_MEMORY_TYPES,
        message: '{VALUE} is not a valid memory type. Allowed types: ' + ALLOWED_MEMORY_TYPES.join(', '),
      },
      index: true,
      trim: true,
      lowercase: true,
    },
    key: {
      type: String,
      required: [true, 'Memory key is required'],
      trim: true,
      maxlength: [120, 'Memory key cannot exceed 120 characters'],
    },
    value: {
      type: String,
      required: [true, 'Memory value is required'],
      trim: true,
      maxlength: [1000, 'Memory value cannot exceed 1000 characters'],
    },
    source: {
      type: String,
      default: 'conversation',
      trim: true,
      maxlength: [50, 'Memory source cannot exceed 50 characters'],
    },
    confidence: {
      type: Number,
      required: true,
      min: [0.0, 'Confidence must be at least 0.0'],
      max: [1.0, 'Confidence cannot exceed 1.0'],
      default: 0.9,
    },
    importance: {
      type: Number,
      required: true,
      min: [0.0, 'Importance must be at least 0.0'],
      max: [1.0, 'Importance cannot exceed 1.0'],
      default: 0.7,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for fast candidate memory lookups
memorySchema.index({ userId: 1, type: 1 });
memorySchema.index({ userId: 1, key: 1 });

export const Memory = mongoose.models.Memory || mongoose.model('Memory', memorySchema);
