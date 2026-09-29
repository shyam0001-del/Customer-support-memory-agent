/**
 * Web Citation and Context Formatting Service
 */

export class WebCitationService {
  /**
   * Format a single search result into a clean citation item
   * @param {Object} result
   * @returns {Object}
   */
  formatSource(result = {}) {
    if (!result || typeof result !== 'object') {
      return { title: 'Web Reference', url: '', source: 'Web' };
    }
    return {
      title: result.title || 'Web Reference',
      url: result.url || '',
      source: result.source || 'Web Resource',
      publishedAt: result.publishedAt || null,
    };
  }

  /**
   * Format an array of search results into clean deduplicated citation objects
   * @param {Array<Object>} results
   * @returns {Array<Object>}
   */
  formatSources(results = []) {
    if (!Array.isArray(results)) return [];
    const seenUrls = new Set();
    const sources = [];

    for (const res of results) {
      if (!res?.url) continue;
      const canonical = res.url.toLowerCase();
      if (seenUrls.has(canonical)) continue;
      seenUrls.add(canonical);
      sources.push(this.formatSource(res));
    }

    return sources;
  }

  /**
   * Format citations into a clean markdown footer for model answers
   * e.g.
   * Sources:
   * - [Microsoft Careers: Software Engineering](https://careers.microsoft.com)
   * - [Glassdoor: Data Analyst Interview Experiences](https://glassdoor.com)
   * @param {Array<Object>} results
   * @returns {string}
   */
  formatSourcesMarkdown(results = []) {
    const citations = this.formatSources(results);
    if (citations.length === 0) return '';

    const lines = citations.map((c) => {
      const label = c.title ? c.title.replace(/[\[\]]/g, '') : c.source;
      return `- [${label}](${c.url})`;
    });

    return `\n\n**Sources:**\n${lines.join('\n')}`;
  }

  /**
   * Build structured citation context block for agent prompting
   * @param {Array<Object>} results
   * @param {string} [query]
   * @returns {string}
   */
  createCitationContext(results = [], query = '') {
    if (!Array.isArray(results) || results.length === 0) {
      return '';
    }

    const items = results.map((r, idx) => {
      const pubInfo = r.publishedAt ? ` | Published: ${r.publishedAt.slice(0, 10)}` : '';
      return [
        `[Web Source ${idx + 1}: "${r.title}" | Publisher: ${r.source}${pubInfo}]`,
        `URL: ${r.url}`,
        `Snippet: ${r.snippet}`,
      ].join('\n');
    });

    return [
      '--- RETRIEVED EXTERNAL WEB SOURCES ---',
      query ? `Search Query: "${query}"` : '',
      items.join('\n\n'),
      '--- END OF WEB SOURCES ---',
      'Important: Distinguish direct source claims from general model knowledge. Only state company-specific or current requirements supported by these sources.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Extract web source links from markdown content or tool results
   * @param {Array<Object>} toolCalls
   * @param {string} [content='']
   * @returns {Array<{ title: string, url: string, source: string }>}
   */
  extractWebSources(toolCalls = [], content = '') {
    const sources = [];
    const seenUrls = new Set();

    // 1. From toolCalls
    if (Array.isArray(toolCalls)) {
      for (const t of toolCalls) {
        if (t.name === 'search_web' && Array.isArray(t.result?.results)) {
          for (const item of t.result.results) {
            if (item.url && !seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              sources.push({
                title: item.title,
                url: item.url,
                source: item.source || 'Web',
              });
            }
          }
        }
      }
    }

    // 2. From markdown text if formatted as [Title](url)
    if (content && typeof content === 'string') {
      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const title = match[1].trim();
        const url = match[2].trim();
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          sources.push({
            title,
            url,
            source: 'Web',
          });
        }
      }
    }

    return sources;
  }
}

export const webCitationService = new WebCitationService();
