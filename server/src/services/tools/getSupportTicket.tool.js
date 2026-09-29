import { supportTicketService } from '../ticket/supportTicket.service.js';

export const getSupportTicketTool = {
  name: 'get_support_ticket',
  description:
    'Retrieves details and status of an existing customer support ticket. Enforces customer isolation.',
  parameters: {
    type: 'object',
    properties: {
      ticketId: {
        type: 'string',
        description: 'The support ticket ID (e.g. CS-1001).',
      },
      customerId: {
        type: 'string',
        description: 'Customer identifier requesting access for ownership verification.',
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
      const ticket = await supportTicketService.getTicket({
        ticketId: args.ticketId.trim(),
        customerId: args.customerId.trim(),
      });

      return {
        success: true,
        ticket,
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'TICKET_LOOKUP_ERROR',
        message: err.message,
      };
    }
  },
};
