/**
 * CloudDesk Support Knowledge Base Service (Phase 3)
 * Represents organizational company knowledge (distinct from customer-specific Hindsight memory).
 */

export const CLOUDDESK_SUPPORT_DOCS = [
  {
    id: 'kb-login-01',
    title: 'CloudDesk Login Troubleshooting',
    category: 'Authentication & Access',
    tags: ['login', 'crash', 'authentication', 'extension', 'chrome', 'windows', 'browser'],
    content:
      'When troubleshooting CloudDesk login crashes or authentication errors:\n' +
      '1. Verify browser compatibility: CloudDesk supports Google Chrome (v115+), Microsoft Edge (v115+), Mozilla Firefox (v118+), and Apple Safari (v16.4+).\n' +
      '2. Try a private/incognito window to isolate extension and cookie conflicts.\n' +
      '3. Disable third-party browser extensions: Ad-blockers, script-blockers, and password managers can interfere with CloudDesk OAuth tokens and cause crashes right after login.\n' +
      '4. Clear browser site cache and local storage for app.clouddesk.internal.\n' +
      '5. Collect client environment: Confirm operating system (e.g., Windows 11, macOS) and exact browser version.\n' +
      '6. Escalation: If crash persists after disabling extensions and clearing cache, inspect browser console for unhandled JS exceptions and escalate to CloudDesk Tier 2 Operations.',
  },
  {
    id: 'kb-dashboard-02',
    title: 'CloudDesk Dashboard Troubleshooting',
    category: 'Navigation & Dashboard',
    tags: ['dashboard', 'loading', 'widgets', 'refresh', 'blank', 'freeze', 'timeout'],
    content:
      'When CloudDesk operational dashboard fails to load, hangs, or displays blank widgets:\n' +
      '1. Perform a hard refresh (Ctrl+F5 or Cmd+Shift+R) to bypass stale bundle assets.\n' +
      '2. Open dashboard in a private/incognito window to rule out stale cached session state.\n' +
      '3. Check browser console conceptually for 401 Unauthorized or 504 Gateway Timeout responses from widget microservices.\n' +
      '4. Clear site cache and cookies for app.clouddesk.internal.\n' +
      '5. Supported browser: Ensure browser meets minimum WebGL and modern ES2022 requirements.\n' +
      '6. Escalation condition: If multiple widgets return 500/503 or websocket real-time sync fails, file a priority ticket for the Core Platform team.',
  },
  {
    id: 'kb-reports-03',
    title: 'CloudDesk Reports Troubleshooting',
    category: 'Reporting & Analytics',
    tags: ['reports', 'export', 'analytics', 'timeout', 'charts', 'filter', 'loading'],
    content:
      'When CloudDesk reports fail to load, export times out, or analytics charts remain in an endless loading spinner:\n' +
      '1. Check date range filters: Large queries exceeding 180 days can cause query timeout (>30s) on standard tenants. Reduce date range to 30 days and re-test.\n' +
      '2. Browser compatibility: Ensure hardware acceleration is enabled in Chrome/Edge settings if SVG/Canvas charts fail to render.\n' +
      '3. Stale cache: Clear local cache to force fresh retrieval of cached report schema.\n' +
      '4. Retry with background export: If browser export times out, utilize asynchronous CSV/PDF scheduled export.\n' +
      '5. Escalation: If query times out for date ranges under 7 days, check for database indexing bottlenecks and escalate to Analytics Engineering.',
  },
  {
    id: 'kb-compatibility-04',
    title: 'CloudDesk Browser Compatibility & System Requirements',
    category: 'System Requirements',
    tags: ['compatibility', 'system', 'requirements', 'browser', 'os', 'windows', 'macos', 'linux'],
    content:
      'Official compatibility matrix for CloudDesk B2B SaaS:\n' +
      '- Supported Operating Systems: Windows 10/11, macOS Sonoma/Ventura, modern Linux distributions (Ubuntu 22.04+).\n' +
      '- Supported Browsers: Google Chrome, Microsoft Edge, Safari, Firefox.\n' +
      '- Known Incompatibilities: Internet Explorer and legacy Edge are completely unsupported. Outdated browser extensions hooking into authentication headers or DOM mutation observers can trigger security policy violations.',
  },
];

export class SupportKnowledgeService {
  constructor(documents = CLOUDDESK_SUPPORT_DOCS) {
    this.documents = documents;
  }

  /**
   * Search support knowledge base deterministically
   * @param {string} query
   * @param {Object} [options]
   * @param {number} [options.limit=3]
   * @returns {Array<{title: string, content: string, category: string, source: string, score: number}>}
   */
  search(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [];
    }

    const limit = Math.min(Math.max(Number(options.limit) || 3, 1), 5);
    const cleanTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    if (cleanTokens.length === 0) {
      return [];
    }

    const scored = this.documents.map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();

      for (const token of cleanTokens) {
        if (titleLower.includes(token)) score += 5;
        if (doc.tags.some((tag) => tag.includes(token))) score += 4;
        if (contentLower.includes(token)) score += 1;
      }

      return {
        title: doc.title,
        content: doc.content,
        category: doc.category,
        source: 'CloudDesk Support Knowledge',
        score,
      };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Format support knowledge results into safe system context prompt block
   * @param {Array<Object>} results
   * @returns {string}
   */
  formatKnowledgeContext(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return '';
    }

    const formattedDocs = results
      .map(
        (doc, index) =>
          `[Support Doc ${index + 1}: "${doc.title}"]\n${doc.content}`
      )
      .join('\n\n');

    return (
      '=== CloudDesk Support Knowledge (Company Reference) ===\n' +
      'The following standard technical procedures represent verified CloudDesk product documentation:\n\n' +
      `${formattedDocs}\n` +
      '=== End Support Knowledge ==='
    );
  }
}

export const supportKnowledgeService = new SupportKnowledgeService();
