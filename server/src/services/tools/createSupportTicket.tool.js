import { supportTicketService } from '../ticket/supportTicket.service.js';

export const createSupportTicketTool = {
  name: 'create_support_ticket',
  description:
    'Creates a formal CloudDesk customer support ticket for unresolved technical issues or when troubleshooting has failed and tier-2 escalation is required.',
  parameters: {
    type: 'object',
    properties: {
      customerId: {
        type: 'string',
        description: 'Customer identifier owning this support ticket.',
      },
      issue: {
        type: 'string',
        description: 'Brief description of the customer issue (e.g. reports loading failure).',
      },
      priority: {
        type: 'string',
        description: 'Ticket priority: "low", "normal", "high", or "urgent".',
        enum: ['low', 'normal', 'high', 'urgent'],
      },
      environment: {
        type: 'string',
        description: 'Operating system and browser version (e.g. Windows 11 / Chrome).',
      },
      previousAttempts: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of troubleshooting steps attempted that failed.',
      },
      escalationReason: {
        type: 'string',
        description: 'Reason for escalating to support ticket.',
      },
    },
    required: ['customerId', 'issue'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.customerId || typeof args.customerId !== 'string' || !args.customerId.trim()) {
      throw new Error('Invalid argument: "customerId" is required and must be a non-empty string.');
    }
    if (!args.issue || typeof args.issue !== 'string' || !args.issue.trim()) {
      throw new Error('Invalid argument: "issue" is required and must be a non-empty string.');
    }
  },

  async execute(args) {
    this.validate(args);

    const ticket = await supportTicketService.createTicket({
      customerId: args.customerId.trim(),
      issue: args.issue.trim(),
      status: 'escalated',
      priority: args.priority || 'normal',
      environment: args.environment || '',
      previousAttempts: args.previousAttempts || [],
      escalationReason: args.escalationReason || 'troubleshooting unsuccessful',
    });

    return {
      success: true,
      ticket,
      message: `Support ticket ${ticket.ticketId} created successfully. Status: ${ticket.status}.`,
    };
  },
};
