import React from 'react';
import {
  Sparkles,
  Database,
  Code,
  MessageSquareQuote,
  Target,
  ArrowRight,
} from 'lucide-react';

export default function EmptyState({ onSelectPrompt }) {
  const promptSuggestions = [
    {
      icon: Target,
      tag: '14-Day Roadmap',
      title: 'Data Analyst Sprint',
      prompt: 'I have a Data Analyst interview at a top fintech in 14 days. What topics, SQL concepts, and projects should I prioritize?',
    },
    {
      icon: Database,
      tag: 'Technical Drill',
      title: 'SQL & Indexing Diagnostic',
      prompt: 'Explain the difference between clustered and non-clustered indexes in SQL, and give me a tricky query scenario often asked in interviews.',
    },
    {
      icon: Code,
      tag: 'DSA Strategy',
      title: 'High-Frequency Patterns',
      prompt: 'What are the top 5 algorithmic patterns (like Two Pointers, Sliding Window, Topological Sort) that cover 80% of SDE-1 coding rounds?',
    },
    {
      icon: MessageSquareQuote,
      tag: 'Behavioral Mock',
      title: 'STAR Method Framework',
      prompt: 'How should I structure my answer for "Describe a time when you resolved a critical technical disagreement with a team member"?',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Phase 1 — Core Intelligence Engine</span>
      </div>

      {/* Main Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-3">
        Master Your Engineering Placements
      </h1>
      <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">
        Your dedicated AI placement co-pilot for Software Engineering, Data Science, and Analyst roles.
        Ask about interview roadmaps, technical concepts, mock questions, or behavioral answers.
      </p>

      {/* Quick Starter Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {promptSuggestions.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all text-left flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
                    <Icon className="w-3 h-3 text-cyan-400" />
                    {item.tag}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h2 className="text-sm font-semibold text-slate-200 group-hover:text-white mb-1">
                  {item.title}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
