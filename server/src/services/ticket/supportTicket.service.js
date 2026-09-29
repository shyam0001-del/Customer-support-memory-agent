/**
 * CloudDesk Support Ticket Lifecycle Service (Phase 5)
 * Manages durable support ticket creation, state transitions, unique IDs,
 * customer ownership isolation, and Hindsight escalation memory formatting.
 * 
 * Uses MongoDB / Mongoose as the authoritative durable persistence store,
 * with an in-memory fallback for headless offline test execution.
 */

import { SupportTicket, SUPPORT_TICKET_STATUSES, SUPPORT_TICKET_PRIORITIES } from '../../models/supportTicket.model.js';
import { isDatabaseConnected } from '../../config/db.js';

export const TICKET_STATUSES = SUPPORT_TICKET_STATUSES;
export const TICKET_PRIORITIES = SUPPORT_TICKET_PRIORITIES;

export class SupportTicketService {
  constructor() {
    this.tickets = new Map(); // key: ticketId, value: ticket object (fallback cache)
    this.nextTicketNumber = 1001;
    this._overrideNextNumber = null;
  }

  /**
   * Resets internal store and test counter for test isolation
   * @param {number} [startNumber=1001]
   */
  async resetForTests(startNumber = 1001) {
    this.tickets.clear();
    this.nextTicketNumber = startNumber;
    this._overrideNextNumber = startNumber;

    if (isDatabaseConnected()) {
      try {
        await SupportTicket.deleteMany({
          $or: [
            { customerId: /^customer_/ },
            { ticketId: /^CS-/ },
          ],
        });
      } catch (err) {
        console.warn('[SupportTicketService] Test reset cleanup warning:', err.message);
      }
    }
  }

  /**
   * Generates a deterministic, collision-free ticket ID (e.g. CS-1001).
   * In production, inspects durable store so IDs remain unique across server restarts.
   * @returns {Promise<string>}
   */
  async generateTicketId() {
    if (this._overrideNextNumber !== null) {
      const num = this._overrideNextNumber;
      this._overrideNextNumber += 1;
      return `CS-${num}`;
    }

    if (isDatabaseConnected()) {
      try {
        const lastDoc = await SupportTicket.findOne({ ticketId: /^CS-\d+$/ })
          .sort({ ticketId: -1 })
          .collation({ locale: 'en_US', numericOrdering: true })
          .lean();

        if (lastDoc && lastDoc.ticketId) {
          const match = lastDoc.ticketId.match(/^CS-(\d+)$/);
          if (match) {
            const lastNum = parseInt(match[1], 10);
            if (!isNaN(lastNum) && lastNum >= this.nextTicketNumber) {
              this.nextTicketNumber = lastNum + 1;
            }
          }
        }
      } catch (err) {
        // Fallback to internal counter
      }
    }

    const num = this.nextTicketNumber;
    this.nextTicketNumber += 1;
    return `CS-${num}`;
  }

  /**
   * Normalizes a ticket document or object into standard plain format
   * @param {Object} raw
   * @returns {Object}
   */
  _normalizeTicket(raw) {
    if (!raw) return null;
    const t = raw.toObject ? raw.toObject() : { ...raw };
    delete t._id;
    delete t.__v;
    return {
      ticketId: t.ticketId,
      customerId: t.customerId,
      issue: t.issue,
      status: t.status,
      priority: t.priority || 'normal',
      environment: t.environment || '',
      previousAttempts: Array.isArray(t.previousAttempts) ? t.previousAttempts : [],
      resolution: t.resolution || null,
      escalationReason: t.escalationReason || null,
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Creates a new support ticket with customer ownership, persisting durably
   * @param {Object} params
   * @param {string} params.customerId
   * @param {string} params.issue
   * @param {string} [params.status='open']
   * @param {string} [params.priority='normal']
   * @param {string} [params.environment='']
   * @param {Array<string>} [params.previousAttempts=[]]
   * @param {string} [params.escalationReason='']
   * @returns {Promise<Object>}
   */
  async createTicket({
    customerId,
    issue,
    status = 'open',
    priority = 'normal',
    environment = '',
    previousAttempts = [],
    escalationReason = '',
  }) {
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      throw new Error('customerId is required and must be a non-empty string.');
    }
    if (!issue || typeof issue !== 'string' || !issue.trim()) {
      throw new Error('issue is required and must be a non-empty string.');
    }

    const cleanStatus = TICKET_STATUSES.includes(status?.toLowerCase())
      ? status.toLowerCase()
      : 'open';
    const cleanPriority = TICKET_PRIORITIES.includes(priority?.toLowerCase())
      ? priority.toLowerCase()
      : 'normal';

    const cleanAttempts = Array.isArray(previousAttempts)
      ? previousAttempts.filter(Boolean)
      : typeof previousAttempts === 'string' && previousAttempts.trim()
      ? [previousAttempts.trim()]
      : [];

    const ticketId = await this.generateTicketId();
    const now = new Date();

    const payload = {
      ticketId,
      customerId: customerId.trim(),
      issue: issue.trim(),
      status: cleanStatus,
      priority: cleanPriority,
      environment: environment ? String(environment).trim() : '',
      previousAttempts: cleanAttempts,
      resolution: null,
      escalationReason: escalationReason ? String(escalationReason).trim() : null,
      createdAt: now,
      updatedAt: now,
    };

    if (isDatabaseConnected()) {
      try {
        const created = await SupportTicket.create(payload);
        const normalized = this._normalizeTicket(created);
        this.tickets.set(ticketId, normalized);
        return normalized;
      } catch (dbErr) {
        console.warn(`[SupportTicketService] MongoDB create fallback for ${ticketId}: ${dbErr.message}`);
      }
    }

    // In-memory fallback
    const normalized = this._normalizeTicket(payload);
    this.tickets.set(ticketId, normalized);
    return normalized;
  }

  /**
   * Retrieves a ticket ensuring strict customer ownership isolation
   * @param {Object} params
   * @param {string} params.ticketId
   * @param {string} params.customerId
   * @returns {Promise<Object>}
   */
  async getTicket({ ticketId, customerId }) {
    if (!ticketId || typeof ticketId !== 'string' || !ticketId.trim()) {
      throw new Error('ticketId is required.');
    }
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      throw new Error('customerId is required for authorization.');
    }

    const cleanId = ticketId.trim();
    let ticket = null;

    if (isDatabaseConnected()) {
      try {
        const doc = await SupportTicket.findOne({ ticketId: cleanId }).lean();
        if (doc) {
          ticket = this._normalizeTicket(doc);
        }
      } catch (dbErr) {
        console.warn(`[SupportTicketService] MongoDB findOne fallback for ${cleanId}: ${dbErr.message}`);
      }
    }

    if (!ticket) {
      ticket = this.tickets.get(cleanId);
    }

    if (!ticket) {
      const err = new Error(`Ticket "${cleanId}" not found.`);
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }

    // Critical Customer Ownership Isolation
    if (ticket.customerId !== customerId.trim()) {
      const err = new Error(`Access Denied: Ticket "${cleanId}" does not belong to customer "${customerId}".`);
      err.code = 'ACCESS_DENIED';
      err.statusCode = 403;
      throw err;
    }

    return { ...ticket };
  }

  /**
   * Lists all tickets belonging to a specific customer
   * @param {string} customerId
   * @returns {Promise<Array<Object>>}
   */
  async listTicketsForCustomer(customerId) {
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return [];
    }
    const cleanCustomer = customerId.trim();

    if (isDatabaseConnected()) {
      try {
        const docs = await SupportTicket.find({ customerId: cleanCustomer })
          .sort({ createdAt: -1 })
          .lean();
        return docs.map((d) => this._normalizeTicket(d));
      } catch (dbErr) {
        console.warn(`[SupportTicketService] MongoDB list fallback for ${cleanCustomer}: ${dbErr.message}`);
      }
    }

    // Fallback
    const result = [];
    for (const ticket of this.tickets.values()) {
      if (ticket.customerId === cleanCustomer) {
        result.push({ ...ticket });
      }
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Deletes all tickets belonging to a specific customer (used for clean demo resets)
   * @param {string} customerId
   * @returns {Promise<{deletedCount: number}>}
   */
  async deleteTicketsForCustomer(customerId) {
    if (!customerId || typeof customerId !== 'string' || !customerId.trim()) {
      return { deletedCount: 0 };
    }
    const cleanCustomer = customerId.trim();

    // Remove from in-memory cache
    let inMemoryDeleted = 0;
    for (const [id, ticket] of this.tickets.entries()) {
      if (ticket.customerId === cleanCustomer) {
        this.tickets.delete(id);
        inMemoryDeleted += 1;
      }
    }

    let deletedCount = inMemoryDeleted;
    if (isDatabaseConnected()) {
      try {
        const res = await SupportTicket.deleteMany({ customerId: cleanCustomer });
        deletedCount = res.deletedCount || inMemoryDeleted;
      } catch (dbErr) {
        console.warn(`[SupportTicketService] MongoDB deleteTicketsForCustomer warning: ${dbErr.message}`);
      }
    }

    return { deletedCount };
  }

  /**
   * Updates an existing ticket with customer ownership validation and durable persistence
   * @param {Object} params
   * @param {string} params.ticketId
   * @param {string} params.customerId
   * @param {string} [params.status]
   * @param {string} [params.resolution]
   * @param {string} [params.priority]
   * @param {Array<string>} [params.previousAttempts]
   * @param {string} [params.escalationReason]
   * @returns {Promise<Object>}
   */
  async updateTicket({
    ticketId,
    customerId,
    status,
    resolution,
    priority,
    previousAttempts,
    escalationReason,
  }) {
    // Validates existence and customer ownership
    const existing = await this.getTicket({ ticketId, customerId });

    const updateFields = {
      updatedAt: new Date(),
    };

    if (status) {
      const cleanStatus = status.toLowerCase().trim();
      if (!TICKET_STATUSES.includes(cleanStatus)) {
        throw new Error(`Invalid status "${status}". Allowed statuses: ${TICKET_STATUSES.join(', ')}`);
      }
      updateFields.status = cleanStatus;
    }

    if (priority) {
      const cleanPriority = priority.toLowerCase().trim();
      if (!TICKET_PRIORITIES.includes(cleanPriority)) {
        throw new Error(`Invalid priority "${priority}". Allowed priorities: ${TICKET_PRIORITIES.join(', ')}`);
      }
      updateFields.priority = cleanPriority;
    }

    if (resolution !== undefined) {
      updateFields.resolution = resolution ? String(resolution).trim() : null;
    }

    if (escalationReason !== undefined) {
      updateFields.escalationReason = escalationReason ? String(escalationReason).trim() : null;
    }

    if (Array.isArray(previousAttempts)) {
      updateFields.previousAttempts = Array.from(
        new Set([...(existing.previousAttempts || []), ...previousAttempts.filter(Boolean)])
      );
    }

    if (isDatabaseConnected()) {
      try {
        const updatedDoc = await SupportTicket.findOneAndUpdate(
          { ticketId: existing.ticketId },
          { $set: updateFields },
          { returnDocument: 'after', runValidators: true }
        ).lean();

        if (updatedDoc) {
          const normalized = this._normalizeTicket(updatedDoc);
          this.tickets.set(existing.ticketId, normalized);
          return normalized;
        }
      } catch (dbErr) {
        console.warn(`[SupportTicketService] MongoDB update fallback for ${existing.ticketId}: ${dbErr.message}`);
      }
    }

    // In-memory fallback
    const merged = {
      ...existing,
      ...updateFields,
      updatedAt: updateFields.updatedAt.toISOString(),
    };
    this.tickets.set(existing.ticketId, merged);
    return merged;
  }

  /**
   * Deterministically finds the most relevant ticket for a customer query
   * Distinguishes between multiple tickets (e.g. Reports CS-1001 vs Login CS-1002)
   * @param {Array<Object>} customerTickets
   * @param {string} query
   * @returns {Object|null}
   */
  matchRelevantTicket(customerTickets = [], query = '') {
    if (!Array.isArray(customerTickets) || customerTickets.length === 0) {
      return null;
    }

    const clean = (query || '').toLowerCase().trim();

    // 1. Direct ticket ID match (e.g. "CS-1001" or "1001")
    const idMatch = clean.match(/cs-(\d{4})/i);
    if (idMatch) {
      const matched = customerTickets.find((t) => t.ticketId.toLowerCase() === idMatch[0].toLowerCase());
      if (matched) return matched;
    }

    // 2. Issue topic keyword matching
    let bestTicket = null;
    let maxMatchCount = 0;

    for (const ticket of customerTickets) {
      let score = 0;
      const issueLower = (ticket.issue || '').toLowerCase();

      if (issueLower.includes('report') && (clean.includes('report') || clean.includes('analytics') || clean.includes('export'))) {
        score += 5;
      }
      if (issueLower.includes('login') && (clean.includes('login') || clean.includes('crash') || clean.includes('auth'))) {
        score += 5;
      }
      if (issueLower.includes('dashboard') && (clean.includes('dashboard') || clean.includes('widget'))) {
        score += 5;
      }

      // Prioritize active (open, in_progress, escalated) over resolved
      if (ticket.status !== 'resolved') {
        score += 2;
      }

      if (score > maxMatchCount) {
        maxMatchCount = score;
        bestTicket = ticket;
      }
    }

    if (bestTicket && maxMatchCount > 0) {
      return bestTicket;
    }

    // Fallback: Return most recent unresolved ticket, or most recent ticket
    const unresolved = customerTickets.find((t) => t.status !== 'resolved');
    return unresolved || customerTickets[0] || null;
  }

  /**
   * Formats an escalation ticket memory for Hindsight long-term storage
   * @param {Object} ticket
   * @returns {{content: string, tags: string[], metadata: Object}}
   */
  formatTicketMemory(ticket) {
    const attemptsStr = ticket.previousAttempts && ticket.previousAttempts.length > 0
      ? ` Previous troubleshooting attempted: ${ticket.previousAttempts.join(', ')}.`
      : '';
    const envStr = ticket.environment ? ` Environment: ${ticket.environment}.` : '';
    const reasonStr = ticket.escalationReason ? ` Reason: ${ticket.escalationReason}.` : '';

    const content = `Customer support ticket ${ticket.ticketId}: ${ticket.issue}. Status: ${ticket.status}. Priority: ${ticket.priority}.${envStr}${attemptsStr}${reasonStr}`;

    return {
      content,
      tags: ['support_ticket', 'ticket', ticket.ticketId, ticket.status],
      metadata: {
        type: 'support_ticket',
        ticketId: ticket.ticketId,
        status: ticket.status,
        issue: ticket.issue,
        priority: ticket.priority,
        escalationReason: ticket.escalationReason || 'troubleshooting unsuccessful',
      },
    };
  }

  /**
   * Formats a ticket resolution memory for Hindsight long-term storage
   * @param {Object} ticket
   * @param {string} resolution
   * @returns {{content: string, tags: string[], metadata: Object}}
   */
  formatTicketResolutionMemory(ticket, resolution) {
    const cleanResolution = (resolution || 'Resolved by engineering/support team').trim();
    const content = `Customer support ticket ${ticket.ticketId} for ${ticket.issue} was successfully resolved. Resolution: ${cleanResolution}.`;

    return {
      content,
      tags: ['support_ticket_resolution', 'resolution', ticket.ticketId, 'resolved'],
      metadata: {
        type: 'support_ticket_resolution',
        ticketId: ticket.ticketId,
        status: 'resolved',
        issue: ticket.issue,
        resolution: cleanResolution,
      },
    };
  }
}

export const supportTicketService = new SupportTicketService();
