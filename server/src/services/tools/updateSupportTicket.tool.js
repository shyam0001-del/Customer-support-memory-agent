import { supportTicketService } from '../ticket/supportTicket.service.js';

export const updateSupportTicketTool = {
  name: 'update_support_ticket',
  description:
    'Updates the status or resolution of an existing CloudDesk support ticket. Enforces customer isolation.',
  parameters: {
    type: 'object',
    properties: {
      ticketId: {
        type: 'string',
        description: 'The support ticket ID (e.g. CS-1001).',
      },
      customerId: {
        type: 'string',
        description: 'Customer identifier requesting update for ownership verification.',
      },
      status: {
        type: 'string',
        description: 'New status: "open", "in_progress", "escalated", or "resolved".',
        enum: ['open', 'in_progress', 'escalated', 'resolved'],
      },
      resolution: {
        type: 'string',
        description: 'Resolution details if ticket is being resolved.',
      },
      escalationReason: {
        type: 'string',
        description: 'Updated escalation reason if applicable.',
      },
    },
    required: ['ticketId', 'customerId'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.ticketId || typeof args.ticketId !== 'string' || !args.ticketId.trim()) {
      throw new Error('Invalid argument: "ticketId" is required.');
    }
    if (!args.customerId || typeof args.customerId !== 'string' || !args.customerId.trim()) {
      throw new Error('Invalid argument: "customerId" is required for authorization.');
    }
  },

  async execute(args) {
    this.validate(args);

    try {
      const updated = await supportTicketService.updateTicket({
        ticketId: args.ticketId.trim(),
        customerId: args.customerId.trim(),
        status: args.status,
        resolution: args.resolution,
        escalationReason: args.escalationReason,
      });

      return {
        success: true,
        ticket: updated,
        message: `Support ticket ${updated.ticketId} updated successfully. Status: ${updated.status}.`,
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'TICKET_UPDATE_ERROR',
        message: err.message,
      };
    }
  },
};
