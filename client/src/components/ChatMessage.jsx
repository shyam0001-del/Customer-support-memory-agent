import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  LifeBuoy,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Save,
  BookOpen,
} from 'lucide-react';
import { DEMO_CUSTOMERS } from '../constants/customers';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const [copied, setCopied] = useState(false);

  const customerMeta = DEMO_CUSTOMERS.find((c) => c.id === message.customerId) || {
    name: 'Customer',
    initials: 'C',
    avatarGradient: 'from-slate-700 to-slate-600',
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full py-3 px-4 sm:px-6 flex transition-colors ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-2xl sm:max-w-3xl flex gap-3 ${
          isUser ? 'flex-row-reverse text-right' : 'flex-row text-left'
        }`}
      >
        {/* Avatar */}
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shadow-sm ${
            isUser
              ? `bg-gradient-to-tr ${customerMeta.avatarGradient} text-white ring-1 ring-white/10`
              : isError
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-cyan-900/40 ring-1 ring-cyan-400/20'
          }`}
        >
          {isUser ? (
            <span>{customerMeta.initials}</span>
          ) : isError ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <LifeBuoy className="w-4 h-4" />
          )}
        </div>

        {/* Message Container */}
        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Header Info */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-200">
              {isUser ? customerMeta.name : 'CloudDesk AI Support'}
            </span>

            {isUser && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {message.customerId || 'Customer'}
              </span>
            )}

            {!isUser && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Co-Pilot
              </span>
            )}

            {message.timestamp && (
              <span className="text-[10px] text-slate-400 font-mono">{message.timestamp}</span>
            )}
          </div>

          {/* Phase 3 Indicators: Support Knowledge & Hindsight Memory Badges */}
          {!isUser && (message.knowledge?.used || message.memory) && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Support Knowledge Badge (RAG) */}
              {message.knowledge?.used && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>📚 Used CloudDesk Support Knowledge</span>
                </div>
              )}

              {/* Hindsight Recall Badge (Customer Memory) */}
              {message.memory?.recalled && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>
                    {message.memory.recalledPreference
                      ? '✨ Adapted to customer preference'
                      : message.memory.recalledResolution
                      ? '✨ Remembered previous resolution'
                      : message.memory.recalledCount && message.memory.recalledCount > 1
                      ? `✨ Remembered ${message.memory.recalledCount} previous details`
                      : '✨ Remembered from previous interactions'}
                  </span>
                </div>
              )}

              {/* Hindsight Retain Badge (Learned Resolution / Experience / Preference) */}
              {message.memory?.retained && (
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shadow-sm border ${
                    message.memory.retainedType === 'failed_resolution'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : message.memory.retainedType === 'preference'
                      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  <Save
                    className={`w-3.5 h-3.5 shrink-0 ${
                      message.memory.retainedType === 'failed_resolution'
                        ? 'text-amber-400'
                        : message.memory.retainedType === 'preference'
                        ? 'text-indigo-400'
                        : 'text-emerald-400'
                    }`}
                  />
                  <span>
                    {message.memory.retainedType === 'preference'
                      ? '💾 Saved customer preference'
                      : message.memory.retainedType === 'successful_resolution'
                      ? '💾 Saved successful resolution'
                      : message.memory.retainedType === 'failed_resolution'
                      ? '💾 Saved failed troubleshooting attempt'
                      : '💾 Saved to customer memory'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Chat Bubble Body */}
          <div
            className={`group relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? 'bg-blue-600 text-white rounded-tr-sm shadow-sm'
                : isError
                ? 'bg-rose-950/30 text-rose-200 border border-rose-900/40 rounded-tl-sm'
                : 'bg-slate-800/80 text-slate-100 border border-slate-700/60 rounded-tl-sm shadow-sm'
            }`}
          >
            {/* Markdown message content */}
            <div
              className={`prose prose-sm max-w-none text-left break-words ${
                isUser ? 'prose-invert text-white' : 'prose-invert text-slate-200'
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node: _n, ...props }) => (
                    <a
                      {...props}
                      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  p: ({ node: _n, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                  ul: ({ node: _n, ...props }) => <ul {...props} className="list-disc pl-4 mb-2 space-y-1" />,
                  ol: ({ node: _n, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1" />,
                  li: ({ node: _n, ...props }) => <li {...props} className="text-slate-200" />,
                  strong: ({ node: _n, ...props }) => <strong {...props} className="font-semibold text-white" />,
                  code: ({ node: _n, inline, ...props }) =>
                    inline ? (
                      <code
                        {...props}
                        className="px-1 py-0.5 rounded bg-slate-900/70 text-cyan-300 font-mono text-xs border border-slate-700/50"
                      />
                    ) : (
                      <pre className="p-3 my-2 rounded-lg bg-slate-950/90 text-cyan-300 font-mono text-xs overflow-x-auto border border-slate-800">
                        <code {...props} />
                      </pre>
                    ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Quick Copy Action */}
            {!isUser && (
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700/60 cursor-pointer"
                title="Copy response"
                aria-label="Copy response text"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
