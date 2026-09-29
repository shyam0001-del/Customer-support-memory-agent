import React from 'react';
import {
  Sparkles,
  Monitor,
  Globe,
  Cloud,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  RefreshCw,
  Info,
  Building2,
  Sliders,
  Ticket,
} from 'lucide-react';

/**
 * Cleanly extracts resolution step description from memory text
 */
function cleanStepText(text = '') {
  // Strip metadata formatting if present
  let cleaned = text
    .replace(/^.*resolved after attempting:\s*/i, '')
    .replace(/^.*troubleshooting attempt failed:\s*/i, '')
    .replace(/on (windows|chrome|macos|linux).*$/i, '')
    .replace(/\.$/, '')
    .trim();

  if (/extension/i.test(cleaned)) {
    return 'Disable Chrome extensions';
  }
  if (/cache/i.test(cleaned)) {
    return 'Clear browser cache';
  }
  if (/incognito|private/i.test(cleaned)) {
    return 'Use private / incognito window';
  }
  if (/hardware/i.test(cleaned)) {
    return 'Disable hardware acceleration';
  }
  return cleaned.length > 50 ? cleaned.slice(0, 47) + '...' : cleaned;
}

/**
 * Parses raw recalled memory facts from Hindsight into structured UI indicators
 */
function parseMemoryFacts(items = [], rawSuccessful = [], rawFailed = [], rawPreferences = []) {
  const combined = items.join(' ');
  const lower = combined.toLowerCase();

  // 1. Environment detection
  let os = null;
  if (lower.includes('windows 11')) os = 'Windows 11';
  else if (lower.includes('windows 10')) os = 'Windows 10';
  else if (lower.includes('macos') || lower.includes('mac os')) os = 'macOS';
  else if (lower.includes('linux')) os = 'Linux';

  let browser = null;
  if (lower.includes('chrome')) browser = 'Google Chrome';
  else if (lower.includes('safari')) browser = 'Safari';
  else if (lower.includes('firefox')) browser = 'Firefox';
  else if (lower.includes('edge')) browser = 'Microsoft Edge';

  // 2. Customer Preferences detection (Phase 4)
  const preferences = new Set();
  for (const p of rawPreferences) {
    if (typeof p === 'string') {
      const pLower = p.toLowerCase();
      if (pLower.includes('troubleshooting_style') || pLower.includes('one troubleshooting step') || pLower.includes('one step at a time')) {
        preferences.add('One troubleshooting step at a time');
      } else if (pLower.includes('communication_style') || pLower.includes('concise instructions') || pLower.includes('prefers concise')) {
        preferences.add('Prefers concise instructions');
      } else if (pLower.includes('technical_level') || pLower.includes('advanced / skip basic') || pLower.includes('skip basic')) {
        preferences.add('Advanced technical background');
      } else if (pLower.includes('detailed explanations')) {
        preferences.add('Needs detailed explanations');
      } else {
        preferences.add(p);
      }
    } else if (p && typeof p === 'object') {
      preferences.add(p.display || p.value || String(p));
    }
  }

  for (const item of items) {
    const itemLower = item.toLowerCase();
    if (
      itemLower.includes('troubleshooting_style') ||
      itemLower.includes('one troubleshooting step at a time') ||
      itemLower.includes('one step at a time')
    ) {
      preferences.add('One troubleshooting step at a time');
    }
    if (
      itemLower.includes('communication_style') ||
      itemLower.includes('concise instructions') ||
      itemLower.includes('prefers concise')
    ) {
      preferences.add('Prefers concise instructions');
    }
    if (
      itemLower.includes('technical_level') ||
      itemLower.includes('advanced / skip basic') ||
      itemLower.includes('skip basic explanations')
    ) {
      preferences.add('Advanced technical background');
    }
    if (itemLower.includes('detailed explanations')) {
      preferences.add('Needs detailed explanations');
    }
  }

  // 3. Previous Issues detection
  const issues = new Set();
  if (lower.includes('crash') || lower.includes('crashing')) {
    issues.add('Login crash');
  }
  if (lower.includes('dashboard')) {
    issues.add('Dashboard not loading');
  }
  if (lower.includes('report') || lower.includes('reports')) {
    issues.add('Reports not loading');
  }
  if (lower.includes('compatibility') || lower.includes('unsupported browser')) {
    issues.add('Browser compatibility');
  }

  // 4. Successful Resolutions
  const resolutions = new Set();
  // Check backend categorized list first
  for (const s of rawSuccessful) {
    resolutions.add(cleanStepText(s));
  }
  // Also check items directly
  for (const item of items) {
    const itemLower = item.toLowerCase();
    if (
      itemLower.includes('successful_resolution') ||
      itemLower.includes('resolved after attempting') ||
      (itemLower.includes('resolved') && itemLower.includes('extension'))
    ) {
      resolutions.add(cleanStepText(item));
    }
  }

  // 5. Previous Failed Attempts
  const failedAttempts = new Set();
  for (const f of rawFailed) {
    failedAttempts.add(cleanStepText(f));
  }
  for (const item of items) {
    const itemLower = item.toLowerCase();
    if (
      itemLower.includes('failed_resolution') ||
      itemLower.includes('troubleshooting attempt failed') ||
      itemLower.includes('did not resolve') ||
      itemLower.includes('did not work')
    ) {
      failedAttempts.add(cleanStepText(item));
    }
  }

  return {
    os,
    browser,
    preferences: Array.from(preferences),
    issues: Array.from(issues),
    resolutions: Array.from(resolutions),
    failedAttempts: Array.from(failedAttempts),
  };
}

export default function CustomerMemoryPanel({
  customerId,
  customerName = 'Acme Corp',
  customerMemory,
  onRefresh,
  className = '',
}) {
  const {
    hasMemory,
    memoryCount,
    items = [],
    preferences: rawPreferences = [],
    tickets = [],
    successfulResolutions = [],
    failedAttempts = [],
    isLoading,
  } = customerMemory || {};
  const parsed = parseMemoryFacts(items, successfulResolutions, failedAttempts, rawPreferences);

  return (
    <aside
      className={`w-80 shrink-0 border-l border-slate-800 bg-slate-900/70 flex flex-col h-full overflow-hidden ${className}`}
      aria-label="Customer Memory Panel"
    >
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Customer Memory
            </h2>
            <p className="text-[11px] text-slate-400">Hindsight Persistent Store</p>
          </div>
        </div>

        <button
          onClick={() => onRefresh && onRefresh(customerId)}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          title="Refresh memory from Hindsight"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Customer Identity Bar */}
      <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100 truncate">{customerName}</div>
            <div className="text-[11px] font-mono text-cyan-400">{customerId}</div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          {hasMemory ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              New Customer
            </span>
          )}
        </div>
      </div>

      {/* Memory Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mb-2" />
            <p className="text-xs text-slate-400">Recalling Hindsight memories...</p>
          </div>
        ) : !hasMemory || items.length === 0 ? (
          /* Empty State as explicitly specified in requirements */
          <div className="py-10 px-3 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-3">
              <Database className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              No previous support memory yet.
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              Start helping this customer and useful information will be remembered for future conversations.
            </p>
            <div className="mt-4 p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-left w-full text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <span>Memories are isolated per customer bank in Hindsight cloud.</span>
            </div>
          </div>
        ) : (
          /* Active Recalled Memory Display */
          <div className="space-y-4">
            {/* Status Pill */}
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-purple-300 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Memory Status</span>
              </div>
              <span className="font-semibold text-purple-200 text-[11px]">
                {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'} recalled
              </span>
            </div>

            {/* Customer Preferences Section (Phase 4) */}
            {parsed.preferences.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-400" />
                  <span>Customer Preferences</span>
                </h4>
                <div className="space-y-1.5">
                  {parsed.preferences.map((pref, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2 shadow-sm"
                    >
                      <span className="text-purple-400 font-bold">•</span>
                      <span className="font-medium">{pref}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Support Tickets Section (Phase 5) */}
            {tickets && tickets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  <span>Support Tickets</span>
                </h4>
                <div className="space-y-2">
                  {tickets.map((t) => (
                    <div
                      key={t.ticketId}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5 text-xs shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-400 text-xs">{t.ticketId}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            t.status === 'resolved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : t.status === 'escalated'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : t.status === 'in_progress'
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {t.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="font-medium text-slate-100">{t.issue}</div>
                      {t.previousAttempts && t.previousAttempts.length > 0 && (
                        <div className="text-[11px] text-slate-400">
                          <span className="text-slate-500">Attempted:</span> {t.previousAttempts.join(', ')}
                        </div>
                      )}
                      {t.resolution && (
                        <div className="text-[11px] text-emerald-300 bg-emerald-950/40 p-1.5 rounded border border-emerald-900/50">
                          <span className="font-semibold">Resolution:</span> {t.resolution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Environment Section */}
            {(parsed.os || parsed.browser) && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Environment</span>
                </h4>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 space-y-2 text-xs">
                  {parsed.os && (
                    <div className="flex items-center gap-2 text-slate-200">
                      <Monitor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-slate-400 font-medium">OS:</span>
                      <span className="font-semibold text-slate-100">{parsed.os}</span>
                    </div>
                  )}
                  {parsed.browser && (
                    <div className="flex items-center gap-2 text-slate-200">
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-slate-400 font-medium">Browser:</span>
                      <span className="font-semibold text-slate-100">{parsed.browser}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-200">
                    <Cloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-400 font-medium">App:</span>
                    <span className="font-semibold text-cyan-300">CloudDesk SaaS</span>
                  </div>
                </div>
              </div>
            )}

            {/* Previous Issues Section */}
            {parsed.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Previous Issues</span>
                </h4>
                <div className="space-y-1.5">
                  {parsed.issues.map((issue, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="font-medium">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Successful Resolutions Section */}
            {parsed.resolutions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Successful Resolutions</span>
                </h4>
                <div className="space-y-1.5">
                  {parsed.resolutions.map((res, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="font-medium">{res}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Failed Attempts Section */}
            {parsed.failedAttempts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Previous Failed Attempts</span>
                </h4>
                <div className="space-y-1.5">
                  {parsed.failedAttempts.map((fail, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="font-medium">{fail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recalled Memory Facts from Hindsight */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Verified Hindsight Facts</span>
                <span className="text-[10px] text-purple-400 font-mono">bank: {customerId}</span>
              </h4>
              <div className="space-y-2">
                {items.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed font-mono"
                  >
                    <div className="flex items-center gap-1.5 text-purple-400 text-[10px] font-sans font-semibold mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Retained Fact #{idx + 1}</span>
                    </div>
                    <p className="font-sans text-slate-300">{fact}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Hindsight Cloud</span>
        </span>
        <span className="text-emerald-400 font-medium">Bank Isolated</span>
      </div>
    </aside>
  );
}
