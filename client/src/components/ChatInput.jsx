import React, { useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  onSend,
  isLoading,
  placeholder = 'Ask a question about your placement preparation...',
}) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSend();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoading && input.trim()) {
      onSend();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-md p-4">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2 p-2 rounded-2xl bg-slate-950 border border-slate-800 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/40 transition-all shadow-lg">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full bg-transparent text-slate-100 text-sm placeholder:text-slate-500 resize-none px-3 py-1.5 focus:outline-none max-h-44 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-semibold transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
          <span>
            Press <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-400">Enter</kbd> to send,{' '}
            <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-400">Shift + Enter</kbd> for new line
          </span>
          <span className="hidden sm:inline font-mono">AI Placement Agent v1.0</span>
        </div>
      </div>
    </div>
  );
}
