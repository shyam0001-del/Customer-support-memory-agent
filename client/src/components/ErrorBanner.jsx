import React from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export default function ErrorBanner({ error, onRetry }) {
  if (!error) return null;

  const isConfigMissing = error.message?.includes('OPENAI_API_KEY') || error.message?.includes('AI configuration missing');

  return (
    <div className="max-w-3xl mx-auto px-4 py-2">
      <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-rose-300">
              {isConfigMissing ? 'API Configuration Required' : 'Communication Error'}
            </p>
            <p className="text-rose-200/90 mt-0.5">{error.message}</p>
            {isConfigMissing && (
              <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] bg-rose-950/80 px-2 py-1 rounded text-rose-300 border border-rose-900/50">
                <Terminal className="w-3.5 h-3.5" />
                <span>Configure OPENAI_API_KEY and OPENAI_MODEL in server/.env</span>
              </div>
            )}
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-white font-medium transition cursor-pointer border border-rose-700/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
}
