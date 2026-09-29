import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';
import EmptyState from './EmptyState';
import ErrorBanner from './ErrorBanner';
import { Bot, Sparkles } from 'lucide-react';

export default function ChatArea({
  messages,
  isLoading,
  error,
  onRetry,
  onSelectPrompt,
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col justify-between">
      {messages.length === 0 ? (
        <div className="my-auto">
          <EmptyState onSelectPrompt={onSelectPrompt} />
        </div>
      ) : (
        <div className="flex-1 divide-y divide-slate-800/40">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Thinking / Loading skeleton */}
          {isLoading && (
            <div className="w-full py-4 px-4 sm:px-6 bg-slate-900/30 border-y border-slate-850">
              <div className="max-w-3xl mx-auto flex gap-3.5 sm:gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shrink-0 ring-1 ring-cyan-400/30">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">AI Placement Agent</span>
                    <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-mono">
                      <Sparkles className="w-3 h-3 animate-spin" /> Thinking...
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="h-3.5 bg-slate-800 rounded-md w-3/4 animate-pulse" />
                    <div className="h-3.5 bg-slate-800 rounded-md w-5/6 animate-pulse" />
                    <div className="h-3.5 bg-slate-800 rounded-md w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error Banner */}
      {error && <ErrorBanner error={error} onRetry={onRetry} />}
    </div>
  );
}
