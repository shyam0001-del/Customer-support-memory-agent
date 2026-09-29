import React from 'react';
import {
  LifeBuoy,
  Plus,
  Sparkles,
  Database,
  ShieldCheck,
  ChevronRight,
  Server,
} from 'lucide-react';
import { DEMO_CUSTOMERS } from '../constants/customers';

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  serverStatus,
  onNewChat,
  customerId = 'customer_001',
  setCustomerId,
  activeCustomerMemory = null,
}) {
  const isAiReady = serverStatus?.aiReady;
  const isHindsightConfigured = serverStatus?.hindsight?.configured ?? true;

  const handleSelectCustomer = (id) => {
    if (setCustomerId) {
      setCustomerId(id);
    }
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20 text-white font-bold">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 text-sm tracking-tight">CloudDesk</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  Support
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Technical Support Agent</p>
            </div>
          </div>
        </div>

        {/* Start New Conversation Action */}
        <div className="p-3">
          <button
            onClick={() => onNewChat && onNewChat()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400/60 transition cursor-pointer shadow-sm"
            title="Start fresh conversation for active customer"
          >
            <Plus className="w-4 h-4" />
            <span>New Support Session</span>
          </button>
        </div>

        {/* Customer Accounts Section */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Customers
              </span>
              <span className="text-[10px] font-mono text-slate-400">Isolated Banks</span>
            </div>

            <div className="space-y-1.5">
              {DEMO_CUSTOMERS.map((cust) => {
                const isSelected = cust.id === customerId;
                const hasMem = isSelected && activeCustomerMemory?.hasMemory;

                return (
                  <button
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust.id)}
                    className={`w-full group p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/40 shadow-sm shadow-cyan-950/40'
                        : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-850 hover:border-slate-700/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${cust.avatarGradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
                      >
                        {cust.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-sm font-semibold truncate ${
                              isSelected ? 'text-white' : 'text-slate-200'
                            }`}
                          >
                            {cust.name}
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{cust.tier}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {hasMem && (
                        <span
                          title="Hindsight Memory Retained"
                          className="w-5 h-5 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400"
                        >
                          <Sparkles className="w-3 h-3" />
                        </span>
                      )}
                      <ChevronRight
                        className={`w-4 h-4 transition ${
                          isSelected ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-400'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SLA & Operational Notes */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hindsight Isolation</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Customer support history is cryptographically separated per tenant. TechNova cannot access Acme Corp memories.
            </p>
          </div>
        </div>

        {/* Footer System Status */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
          {/* AI Support Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              AI Support
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isAiReady ? 'Online' : 'Initializing'}
            </span>
          </div>

          {/* Hindsight Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-purple-400" />
              Hindsight Memory
            </span>
            <span className={`flex items-center gap-1.5 font-medium ${isHindsightConfigured ? 'text-purple-300' : 'text-rose-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isHindsightConfigured ? 'bg-purple-400 animate-pulse' : 'bg-rose-400'}`} />
              {isHindsightConfigured ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
