import React from 'react';
import { Menu, Trash2, CheckCircle2, Building2, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { DEMO_CUSTOMERS } from '../constants/customers';

export default function Header({
  sidebarOpen,
  setSidebarOpen,
  serverStatus,
  onClearChat,
  hasMessages,
  customerId = 'customer_001',
  memoryPanelOpen,
  setMemoryPanelOpen,
}) {
  const isAiReady = serverStatus?.aiReady;
  const isHindsightConfigured = serverStatus?.hindsight?.configured ?? true;
  const currentCustomer = DEMO_CUSTOMERS.find((c) => c.id === customerId) || {
    name: customerId,
    initials: 'C',
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shrink-0">
      {/* Left Branding / Mobile Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          aria-label="Toggle customer list"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 text-base tracking-tight">CloudDesk</span>
            <span className="text-slate-400 text-sm hidden sm:inline">|</span>
            <span className="text-slate-400 text-xs sm:text-sm font-medium">Technical Support</span>
          </div>
        </div>

        {/* Active Customer Indicator */}
        <div className="hidden sm:flex items-center gap-2 ml-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200">
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 font-normal">Active Account:</span>
          <span className="font-semibold text-white">{currentCustomer.name}</span>
        </div>
      </div>

      {/* Right Status Indicators & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Subtle Hindsight Connected Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isHindsightConfigured
              ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}
          title="Hindsight Persistent Memory Cloud Connection"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Hindsight Connected</span>
          <span className="sm:hidden">Hindsight</span>
        </div>

        {/* AI Support Online Status */}
        <div
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
            isAiReady
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}
          title={isAiReady ? 'AI Support Ready' : 'AI Service Initializing'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isAiReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium">
            {isAiReady ? 'AI Support Online' : 'Connecting'}
          </span>
        </div>

        {/* Clear / Reset Conversation */}
        {hasMessages && (
          <button
            onClick={onClearChat}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
            title="Start new conversation session"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset Session</span>
          </button>
        )}

        {/* Memory Panel Toggle Button */}
        {setMemoryPanelOpen && (
          <button
            onClick={() => setMemoryPanelOpen(!memoryPanelOpen)}
            className={`p-2 rounded-lg border transition cursor-pointer ${
              memoryPanelOpen
                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
            title={memoryPanelOpen ? 'Hide Customer Memory' : 'Show Customer Memory'}
            aria-label="Toggle Customer Memory Panel"
          >
            {memoryPanelOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
