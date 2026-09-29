import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [50, 'Skill name cannot exceed 50 characters'],
    },
    level: {
      type: String,
      enum: {
        values: ['beginner', 'intermediate', 'advanced', 'expert'],
        message: '{VALUE} is not a valid skill level (beginner, intermediate, advanced, expert)',
      },
      default: 'intermediate',
      trim: true,
      lowercase: true,
    },
  },
  { _id: false }
);

const progressItemSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      trim: true,
      maxlength: [100, 'Topic cannot exceed 100 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['completed', 'in_progress', 'needs_review', 'weak'],
        message: '{VALUE} is not a valid progress status',
      },
      default: 'in_progress',
      trim: true,
      lowercase: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      maxlength: [100, 'Email cannot exceed 100 characters'],
    },
    degree: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Degree cannot exceed 100 characters'],
    },
    specialization: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Specialization cannot exceed 100 characters'],
    },
    skills: {
      type: [skillSchema],
      default: [],
    },
    targetRole: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Target role cannot exceed 100 characters'],
    },
    targetCompanies: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      default: [],
    },
    experienceLevel: {
      type: String,
      trim: true,
      default: 'Student',
      maxlength: [50, 'Experience level cannot exceed 50 characters'],
    },
    leetcodeSolved: {
      type: Number,
      default: 0,
      min: [0, 'LeetCode solved count cannot be negative'],
    },
    weakAreas: {
      type: [{ type: String, trim: true, maxlength: 80 }],
      default: [],
    },
    progress: {
      type: [progressItemSchema],
      default: [],
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

// Prevent re-compilation in development or test reload
export const User = mongoose.models.User || mongoose.model('User', userSchema);
