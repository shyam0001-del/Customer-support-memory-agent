import mongoose from 'mongoose';

export const SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'escalated', 'resolved'];
export const SUPPORT_TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const supportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: [true, 'ticketId is required'],
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    customerId: {
      type: String,
      required: [true, 'customerId is required'],
      index: true,
      trim: true,
    },
    issue: {
      type: String,
      required: [true, 'issue description is required'],
      trim: true,
      maxlength: [1000, 'issue description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: SUPPORT_TICKET_STATUSES,
        message: '{VALUE} is not a valid ticket status (' + SUPPORT_TICKET_STATUSES.join(', ') + ')',
      },
      default: 'open',
      index: true,
      trim: true,
      lowercase: true,
    },
    priority: {
      type: String,
      enum: {
        values: SUPPORT_TICKET_PRIORITIES,
        message: '{VALUE} is not a valid priority (' + SUPPORT_TICKET_PRIORITIES.join(', ') + ')',
      },
      default: 'normal',
      trim: true,
      lowercase: true,
    },
    environment: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'environment cannot exceed 500 characters'],
    },
    previousAttempts: {
      type: [String],
      default: [],
    },
    resolution: {
      type: String,
      default: null,
      trim: true,
      maxlength: [2000, 'resolution cannot exceed 2000 characters'],
    },
    escalationReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: [1000, 'escalationReason cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for fast tenant-scoped queries
supportTicketSchema.index({ customerId: 1, createdAt: -1 });

export const SupportTicket =
  mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema);
