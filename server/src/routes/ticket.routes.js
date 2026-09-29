import { Router } from 'express';
import {
  createTicketHandler,
  getCustomerTicketsHandler,
  getTicketByIdHandler,
  updateTicketHandler,
} from '../controllers/ticket.controller.js';

const router = Router();

// POST /api/tickets - Create a support ticket
router.post('/tickets', createTicketHandler);

// GET /api/tickets/:customerId - List all tickets for customer
router.get('/tickets/:customerId', getCustomerTicketsHandler);

// GET /api/tickets/:customerId/:ticketId - Get ticket with customer ownership check
router.get('/tickets/:customerId/:ticketId', getTicketByIdHandler);

// PATCH /api/tickets/:customerId/:ticketId - Update ticket status/resolution
router.patch('/tickets/:customerId/:ticketId', updateTicketHandler);

export default router;
