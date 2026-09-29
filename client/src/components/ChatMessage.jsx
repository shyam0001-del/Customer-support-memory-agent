import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, AlertCircle, Sparkles, BookOpen, Globe, ExternalLink } from 'lucide-react';

function getFriendlyToolName(name) {
  switch (name) {
    case 'get_user_profile':
      return 'Checked candidate profile';
    case 'get_user_progress':
      return 'Analyzed preparation progress';
    case 'update_user_progress':
      return 'Updated study progress';
    case 'search_knowledge':
      return 'Retrieved placement knowledge';
    case 'search_web':
      return 'Web research';
    case 'get_placement_readiness':
      return 'Analyzed placement readiness';
    case 'get_role_requirements':
      return 'Retrieved role requirements';
    case 'start_practice_session':
      return 'Started practice session';
    case 'submit_practice_answer':
      return 'Evaluated practice answer';
    case 'get_practice_history':
      return 'Fetched practice history';
    case 'get_weak_practice_topics':
      return 'Analyzed weak practice areas';
    default:
      return 'Consulted preparation co-pilot tool';
  }
}

/**
 * Helper to extract unique source titles from search_knowledge tool calls
 */
function extractKnowledgeSources(toolCalls, content = '') {
  const sources = new Set();

  for (const t of toolCalls) {
    if (t.name === 'search_knowledge' && Array.isArray(t.result?.results)) {
      for (const item of t.result.results) {
        if (item.title) sources.add(item.title);
      }
    }
  }

  if (content && typeof content === 'string') {
    const sourcesMatch = content.match(/\*\*Sources:\*\*([\s\S]*?)(?:\n\n|$)/i);
    if (sourcesMatch && sourcesMatch[1]) {
      const lines = sourcesMatch[1].split('\n');
      for (const line of lines) {
        // Only internal sources without http links
        if (!line.includes('http://') && !line.includes('https://')) {
          const clean = line.replace(/^[-*•\d.]\s*/, '').replace(/\[|\]/g, '').trim();
          if (clean) sources.add(clean);
        }
      }
    }
  }

  return Array.from(sources);
}

/**
 * Helper to extract external web sources with clickable URLs
 */
function extractWebSources(toolCalls, content = '') {
  const webSources = [];
  const seenUrls = new Set();

  for (const t of toolCalls) {
    if (t.name === 'search_web' && Array.isArray(t.result?.results)) {
      for (const item of t.result.results) {
        if (item.url && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          webSources.push({
            title: item.title || item.source || 'Web Source',
            url: item.url,
            source: item.source || 'Web',
          });
        }
      }
    }
  }

  if (content && typeof content === 'string') {
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const title = match[1].trim();
      const url = match[2].trim();
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        webSources.push({
          title,
          url,
          source: 'Web',
        });
      }
    }
  }

  return webSources;
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const toolCalls = Array.isArray(message.toolCalls) ? message.toolCalls : [];
  const [copied, setCopied] = useState(false);

  const knowledgeSources = !isUser ? extractKnowledgeSources(toolCalls, message.content) : [];
  const webSources = !isUser ? extractWebSources(toolCalls, message.content) : [];

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group w-full py-4 px-4 sm:px-6 transition-colors ${
        isUser
          ? 'bg-slate-950/40'
          : isError
          ? 'bg-rose-950/20 border-y border-rose-900/30'
          : 'bg-slate-900/40 border-y border-slate-900/80'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-3.5 sm:gap-4 items-start">
        {/* Avatar */}
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-xs font-semibold ${
            isUser
              ? 'bg-gradient-to-tr from-slate-700 to-slate-600 text-slate-100 ring-1 ring-slate-600'
              : isError
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white ring-1 ring-cyan-400/30'
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {isUser ? 'You' : 'AI Placement Agent'}
              </span>
              {message.model && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                  {message.model}
                </span>
              )}
              {message.timestamp && (
                <span className="text-[11px] text-slate-400 font-mono">{message.timestamp}</span>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 cursor-pointer text-xs flex items-center gap-1"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Copied</span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Optional Tool Activity Badges */}
          {toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5 my-2">
              {toolCalls.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-800/80 border border-slate-700 text-cyan-300 font-medium"
                >
                  {t.name === 'search_knowledge' ? (
                    <BookOpen className="w-3 h-3 text-cyan-400" />
                  ) : t.name === 'search_web' ? (
                    <Globe className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                  )}
                  <span>{getFriendlyToolName(t.name)}</span>
                </span>
              ))}
            </div>
          )}

          {/* Render Markdown or plain text */}
          <div className="prose-chat text-sm break-words">
            {isUser ? (
              <p className="whitespace-pre-wrap text-slate-100">{message.content}</p>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Subtle RAG Sources Badges */}
          {knowledgeSources.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3 h-3 text-cyan-400" />
                <span>Knowledge Sources</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {knowledgeSources.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-800/90 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition"
                  >
                    [{s}]
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* External Web Sources Badges */}
          {webSources.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>Web Research Sources</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {webSources.map((ws, idx) => (
                  <a
                    key={idx}
                    href={ws.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 transition group/link"
                  >
                    <span>{ws.title}</span>
                    <ExternalLink className="w-3 h-3 text-emerald-400/70 group-hover/link:text-emerald-300 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
