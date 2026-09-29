import React from 'react';
import {
  Bot,
  Plus,
  MessageSquare,
  User,
  Database,
  Cpu,
  Compass,
  Award,
  BookOpen,
} from 'lucide-react';

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  serverStatus,
  onNewChat,
  onSelectPrompt,
  activeTab = 'chat',
  setActiveTab,
  activeProfile = null,
}) {
  const placeholderHistory = [
    {
      id: 'h1',
      title: 'Amazon SDE: 14-Day DSA Sprint',
      role: 'Software Engineer',
      time: '2 hours ago',
      active: true,
    },
    {
      id: 'h2',
      title: 'Data Analyst: SQL Window Functions',
      role: 'Data Analyst',
      time: 'Yesterday',
      active: false,
    },
    {
      id: 'h3',
      title: 'Google ML: Bias-Variance & Transformers',
      role: 'ML Engineer',
      time: '3 days ago',
      active: false,
    },
  ];

  const upcomingPhases = [
    { name: 'Phase 1: Basic AI Chat', status: 'completed', desc: 'Core chat engine' },
    { name: 'Phase 2: User Profile', status: 'completed', desc: 'MongoDB candidate context' },
    { name: 'Phase 3: Tool Calling', status: 'completed', desc: 'Agentic Tools' },
    { name: 'Phase 4: Structured Memory', status: 'completed', desc: 'Long-term Tracking' },
    { name: 'Phase 5: Placement Engine', status: 'completed', desc: 'Readiness & Skill Gaps' },
    { name: 'Phase 6: Practice Engine', status: 'completed', desc: 'Mock Interviews & Evaluation' },
    { name: 'Phase 7: RAG Engine', status: 'completed', desc: 'Controlled Knowledge Base' },
    { name: 'Phase 8: Web Intelligence', status: 'completed', desc: 'Controlled Web Tools & Citations' },
    { name: 'Phase 9: Observability & Security', status: 'completed', desc: 'Evaluation, Metrics & Hardening' },
  ];

  const isDbConnected = serverStatus?.database?.connected;

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-100 text-sm tracking-tight">Placement Agent</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Engineering Career Co-Pilot</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="p-3 pb-0 space-y-1">
          <button
            onClick={() => {
              setActiveTab('chat');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span>AI Placement Chat</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('placement');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'placement'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Placement Intelligence</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('practice');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Award className="w-4 h-4 text-cyan-400" />
            <span>Practice & Interview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('knowledge');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'knowledge'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Knowledge & Resources</span>
            <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              RAG
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Candidate Profile</span>
            </div>
            {activeProfile?.name ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Profile configured" />
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">NEW</span>
            )}
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3 pt-2">
          <button
            onClick={() => {
              setActiveTab('chat');
              onNewChat();
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-sm shadow-md shadow-indigo-500/10 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Prep Session</span>
          </button>
        </div>

        {/* Sessions & History */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          <div>
            <div className="flex items-center justify-between px-2 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Recent Sessions</span>
              <span className="text-[10px] text-slate-400 font-mono">History</span>
            </div>

            <div className="space-y-1">
              {placeholderHistory.map((item) => (
                <div
                  key={item.id}
                  className={`group w-full text-left p-2.5 rounded-lg text-xs transition cursor-pointer flex items-start gap-2.5 ${
                    item.active && activeTab === 'chat'
                      ? 'bg-slate-800/90 text-slate-200 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  onClick={() => {
                    setActiveTab('chat');
                    if (item.active) return;
                    onSelectPrompt(`Let's focus on: ${item.title}`);
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                >
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400 group-hover:text-cyan-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-slate-200">{item.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>{item.role}</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Roadmap Tracker */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="px-2 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Roadmap</span>
              <span className="text-[10px] text-emerald-400 font-mono">P8 ACTIVE</span>
            </div>

            <div className="space-y-1.5">
              {upcomingPhases.map((phase, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg text-[11px] border ${
                    phase.status === 'active'
                      ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200'
                      : phase.status === 'completed'
                      ? 'bg-slate-950/40 border-slate-850/60 text-slate-300'
                      : 'bg-slate-950/40 border-slate-850/60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium">
                    <span>{phase.name}</span>
                    {phase.status === 'active' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        LIVE
                      </span>
                    ) : phase.status === 'completed' ? (
                      <span className="text-[9px] text-emerald-400 font-mono">DONE</span>
                    ) : (
                      <span className="text-[9px] text-slate-500 font-mono">NEXT</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{phase.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Server & Database Status */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-xs space-y-1.5">
          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <div>
                <p className="text-[11px] font-semibold text-slate-300">MongoDB</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {isDbConnected ? 'Connected' : 'Fallback / In-Memory'}
                </p>
              </div>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                isDbConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400'
              }`}
            />
          </div>

          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <div>
                <p className="text-[11px] font-semibold text-slate-300">AI Server</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {serverStatus?.status === 'online' ? 'Port 5000' : 'Offline'}
                </p>
              </div>
            </div>
            <div
              className={`w-2 h-2 rounded-full ${
                serverStatus?.status === 'online' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
