import { supportTicketService } from '../services/ticket/supportTicket.service.js';
import { hindsightService } from '../services/memory/hindsight.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Creates a new support ticket
 * POST /api/tickets
 */
export async function createTicketHandler(req, res, next) {
  try {
    const {
      customerId,
      issue,
      status = 'open',
      priority = 'normal',
      environment = '',
      previousAttempts = [],
      escalationReason = '',
    } = req.body || {};

    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return errorResponse(res, 'customerId is required.', 400, 'INVALID_CUSTOMER_ID');
    }
    if (!issue || typeof issue !== 'string' || !issue.trim()) {
      return errorResponse(res, 'issue is required.', 400, 'INVALID_ISSUE');
    }

    const ticket = await supportTicketService.createTicket({
      customerId: customerId.trim(),
      issue: issue.trim(),
      status,
      priority,
      environment,
      previousAttempts,
      escalationReason,
    });

    // Retain escalation memory in Hindsight
    try {
      const ticketMemory = supportTicketService.formatTicketMemory(ticket);
      await hindsightService.retainMemory({
        customerId: ticket.customerId,
        content: ticketMemory.content,
        tags: ticketMemory.tags,
        metadata: ticketMemory.metadata,
        context: `Support ticket created: ${ticket.ticketId}`,
      });
    } catch (hindsightErr) {
      console.warn(`[Ticket Hindsight Retain Warning] ${hindsightErr.message}`);
    }

    return successResponse(res, ticket, 201);
  } catch (err) {
    return next(err);
  }
}

/**
 * Lists all tickets for a specific customer
 * GET /api/tickets/:customerId
 */
export async function getCustomerTicketsHandler(req, res, next) {
  try {
    const { customerId } = req.params;
    if (!customerId || !customerId.trim()) {
      return errorResponse(res, 'customerId is required.', 400, 'INVALID_CUSTOMER_ID');
    }

    const tickets = await supportTicketService.listTicketsForCustomer(customerId.trim());
    return successResponse(res, {
      customerId: customerId.trim(),
      count: tickets.length,
      tickets,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Retrieves a specific ticket with customer ownership validation
 * GET /api/tickets/:customerId/:ticketId
 */
export async function getTicketByIdHandler(req, res, next) {
  try {
    const { customerId, ticketId } = req.params;
    if (!customerId || !customerId.trim()) {
      return errorResponse(res, 'customerId is required.', 400, 'INVALID_CUSTOMER_ID');
    }
    if (!ticketId || !ticketId.trim()) {
      return errorResponse(res, 'ticketId is required.', 400, 'INVALID_TICKET_ID');
    }

    try {
      const ticket = await supportTicketService.getTicket({
        ticketId: ticketId.trim(),
        customerId: customerId.trim(),
      });
      return successResponse(res, ticket);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return errorResponse(res, err.message, 404, 'NOT_FOUND');
      }
      if (err.code === 'ACCESS_DENIED') {
        return errorResponse(res, err.message, 403, 'ACCESS_DENIED');
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

/**
 * Updates a support ticket status or resolution
 * PATCH /api/tickets/:customerId/:ticketId
 */
export async function updateTicketHandler(req, res, next) {
  try {
    const { customerId, ticketId } = req.params;
    const { status, resolution, priority, previousAttempts, escalationReason } = req.body || {};

    if (!customerId || !customerId.trim()) {
      return errorResponse(res, 'customerId is required.', 400, 'INVALID_CUSTOMER_ID');
    }
    if (!ticketId || !ticketId.trim()) {
      return errorResponse(res, 'ticketId is required.', 400, 'INVALID_TICKET_ID');
    }

    try {
      const updated = await supportTicketService.updateTicket({
        ticketId: ticketId.trim(),
        customerId: customerId.trim(),
        status,
        resolution,
        priority,
        previousAttempts,
        escalationReason,
      });

      // If status is marked resolved, retain resolution in Hindsight
      if (updated.status === 'resolved' && updated.resolution) {
        try {
          const resMemory = supportTicketService.formatTicketResolutionMemory(updated, updated.resolution);
          await hindsightService.retainMemory({
            customerId: updated.customerId,
            content: resMemory.content,
            tags: resMemory.tags,
            metadata: resMemory.metadata,
            context: `Support ticket resolved: ${updated.ticketId}`,
          });
        } catch (hindsightErr) {
          console.warn(`[Ticket Resolution Hindsight Retain Warning] ${hindsightErr.message}`);
        }
      }

      return successResponse(res, updated);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return errorResponse(res, err.message, 404, 'NOT_FOUND');
      }
      if (err.code === 'ACCESS_DENIED') {
        return errorResponse(res, err.message, 403, 'ACCESS_DENIED');
      }
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}
