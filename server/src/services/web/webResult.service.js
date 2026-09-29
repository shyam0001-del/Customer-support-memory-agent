/**
 * Web Result Normalization, Deduplication, and Quality Filtering Service
 */

// Tracking parameters to strip from URLs safely without breaking routing
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'fbclid',
  'gclid',
  'msclkid',
  '_hsenc',
  '_hsmi',
  'mc_cid',
  'mc_eid',
]);

// Trusted domain authority boosts
const TRUSTED_DOMAINS = [
  'microsoft.com',
  'google.com',
  'amazon.jobs',
  'apple.com',
  'github.com',
  'stackoverflow.com',
  'linkedin.com',
  'glassdoor.com',
  'levels.fyi',
  'indeed.com',
  'geeksforgeeks.org',
  'leetcode.com',
];

// Domains with high spam or low-quality scraped content
const BLOCKED_DOMAINS = [
  'spamdomain.com',
  'lowqualitycontent.biz',
  'clickbait-jobs.xyz',
  'scraped-aggregator.info',
];

export class WebResultService {
  /**
   * Clean and normalize a URL, stripping marketing trackers
   * @param {string} rawUrl
   * @returns {string}
   */
  normalizeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      const parsed = new URL(rawUrl.trim());
      // Remove tracking search params
      for (const param of Array.from(parsed.searchParams.keys())) {
        if (TRACKING_PARAMS.has(param.toLowerCase())) {
          parsed.searchParams.delete(param);
        }
      }
      // Remove trailing slash on root or path
      let clean = parsed.toString();
      if (clean.endsWith('/')) {
        clean = clean.slice(0, -1);
      }
      return clean;
    } catch {
      // Return trimmed raw URL if parsing fails but not malformed
      return rawUrl.trim();
    }
  }

  /**
   * Derive clean source publisher name from URL or provider metadata
   * @param {string} url
   * @param {string} [declaredSource]
   * @returns {string}
   */
  deriveSourceName(url, declaredSource = '') {
    if (declaredSource && typeof declaredSource === 'string' && declaredSource.trim()) {
      return declaredSource.trim();
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/^www\./i, '');
      const parts = host.split('.');
      if (parts.length >= 2) {
        // e.g. "careers.microsoft.com" -> "Microsoft Careers"
        const main = parts[parts.length - 2];
        return main.charAt(0).toUpperCase() + main.slice(1);
      }
      return host;
    } catch {
      return 'Web Resource';
    }
  }

  /**
   * Normalize an individual raw search result object
   * @param {Object} raw
   * @returns {Object|null}
   */
  normalizeSearchResult(raw = {}) {
    if (!raw || typeof raw !== 'object') return null;

    const rawUrl = typeof raw.url === 'string' ? raw.url.trim() : '';
    if (!rawUrl) return null;

    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Web Resource';
    const snippet = typeof raw.snippet === 'string' ? raw.snippet.trim() : typeof raw.content === 'string' ? raw.content.trim() : '';

    const cleanUrl = this.normalizeUrl(rawUrl);
    const source = this.deriveSourceName(cleanUrl, raw.source || raw.publisher);

    let publishedAt = null;
    if (raw.publishedAt || raw.date) {
      const dateVal = new Date(raw.publishedAt || raw.date);
      if (!isNaN(dateVal.getTime())) {
        publishedAt = dateVal.toISOString();
      }
    }

    return {
      title,
      url: cleanUrl,
      snippet,
      source,
      publishedAt,
      relevanceScore: typeof raw.score === 'number' ? Math.max(0, Math.min(1, raw.score)) : 0.8,
      retrievedAt: new Date().toISOString(),
    };
  }

  /**
   * Enforce bounded limit constraint (between 1 and maxLimit)
   * @param {number} limit
   * @param {number} [defaultLimit=5]
   * @param {number} [maxLimit=10]
   * @returns {number}
   */
  clampLimit(limit, defaultLimit = 5, maxLimit = 10) {
    if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
      return defaultLimit;
    }
    return Math.min(Math.floor(limit), maxLimit);
  }

  /**
   * Deduplicate results primarily by normalized canonical URL
   * @param {Array<Object>} results
   * @returns {Array<Object>}
   */
  deduplicateResults(results = []) {
    if (!Array.isArray(results)) return [];
    const seenUrls = new Set();
    const seenTitles = new Set();
    const unique = [];

    for (const item of results) {
      if (!item) continue;
      const cleanUrl = this.normalizeUrl(item.url || '');
      const urlKey = cleanUrl.toLowerCase();
      const titleKey = (item.title || '').toLowerCase().slice(0, 60);

      if (urlKey && seenUrls.has(urlKey)) continue;
      if (titleKey && seenTitles.has(titleKey)) continue;

      if (urlKey) seenUrls.add(urlKey);
      if (titleKey) seenTitles.add(titleKey);
      unique.push({
        ...item,
        url: cleanUrl || item.url,
      });
    }

    return unique;
  }

  /**
   * Filter out low quality, suspicious, or excessively brief snippets
   * @param {Array<Object>} results
   * @param {Object} [options]
   * @returns {Array<Object>}
   */
  filterLowQualityResults(results = [], options = {}) {
    if (!Array.isArray(results)) return [];
    const minSnippetLength = options.minSnippetLength || 25;
    const allowedDomain = options.domain ? options.domain.toLowerCase().trim() : null;

    return results.filter((item) => {
      if (!item || !item.url || !item.snippet) return false;
      if (item.snippet.length < minSnippetLength) return false;

      try {
        const parsed = new URL(item.url);
        const host = parsed.hostname.toLowerCase();

        // Check blocked domains
        if (BLOCKED_DOMAINS.some((b) => host.includes(b))) {
          return false;
        }

        // Apply domain filter if requested
        if (allowedDomain && !host.includes(allowedDomain)) {
          return false;
        }
      } catch {
        return false;
      }

      return true;
    });
  }

  /**
   * Rank results by relevance score, trusted domain boost, and recency
   * @param {Array<Object>} results
   * @param {string} [query]
   * @returns {Array<Object>}
   */
  rankResults(results = [], query = '') {
    if (!Array.isArray(results)) return [];
    const queryTokens = (query || '').toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    const scored = results.map((item) => {
      let score = item.relevanceScore || 0.5;

      // Domain authority boost
      const host = (item.url || '').toLowerCase();
      if (TRUSTED_DOMAINS.some((td) => host.includes(td))) score += 0.15;

      // Query keyword match in title
      const title = (item.title || '').toLowerCase();
      for (const t of queryTokens) {
        if (title.includes(t)) score += 0.08;
      }

      // Recency boost (within 30 days)
      if (item.publishedAt) {
        const daysOld = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld <= 30) score += 0.1;
      }

      return {
        ...item,
        relevanceScore: Math.min(1.0, Math.round(score * 100) / 100),
      };
    });

    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Limit number of results
   * @param {Array<Object>} results
   * @param {number} [limit=5]
   * @returns {Array<Object>}
   */
  limitResults(results = [], limit = 5) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 5, 10));
    return results.slice(0, safeLimit);
  }
}

export const webResultService = new WebResultService();
