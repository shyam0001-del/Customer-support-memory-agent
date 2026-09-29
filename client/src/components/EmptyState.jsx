import React from 'react';
import {
  LifeBuoy,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';
import { DEMO_CUSTOMERS } from '../constants/customers';

export default function EmptyState({ onSelectPrompt, customerId = 'customer_001' }) {
  const currentCustomer = DEMO_CUSTOMERS.find((c) => c.id === customerId) || {
    name: 'Customer',
  };

  const isTicketDemo = customerId.includes('ticket');
  const isPreferenceDemo = customerId.includes('preference');

  const supportPrompts = isTicketDemo
    ? [
        {
          icon: AlertTriangle,
          tag: 'Demo Turn 1 • Report Issue',
          title: 'Reports Not Loading',
          prompt: "My reports aren't loading in CloudDesk. I'm using Chrome on Windows 11.",
          badge: 'Diagnostic Investigation',
        },
        {
          icon: RotateCcw,
          tag: 'Demo Turn 2 • Troubleshooting Fails',
          title: 'Escalate to Ticket',
          prompt: "Clearing the browser cache didn't fix it. It's still broken.",
          badge: 'Creates Support Ticket',
        },
        {
          icon: BarChart3,
          tag: 'Demo Turn 3 • Fresh Session',
          title: 'Check Ticket Status',
          prompt: 'Any update on my reports issue?',
          badge: 'Recalls Ticket & Case Continuity',
        },
        {
          icon: LayoutDashboard,
          tag: 'Demo Turn 4 • Ticket Inquiry',
          title: 'Case Follow-Up',
          prompt: "What's happening with my reports ticket?",
          badge: 'Continuity & Status Update',
        },
      ]
    : isPreferenceDemo
    ? [
        {
          icon: AlertTriangle,
          tag: 'Demo Turn 1 • Teach Preference',
          title: 'Express Support Style',
          prompt: "Please give me one troubleshooting step at a time. I don't want a long list.",
          badge: 'Retains Troubleshooting Preference',
        },
        {
          icon: RotateCcw,
          tag: 'Demo Turn 2 • Verify Adaptation',
          title: 'Fresh Interaction (1 Step)',
          prompt: "I'm having another login problem.",
          badge: 'Recalls Preference & Adapts',
        },
        {
          icon: BarChart3,
          tag: 'Demo Turn 3 • Override Rule',
          title: 'Current Request Override',
          prompt: 'Actually, give me all the steps at once.',
          badge: 'Current Request Overrides Stored Preference',
        },
        {
          icon: LayoutDashboard,
          tag: 'Style 2 • Concise Instructions',
          title: 'Concise Preference',
          prompt: 'Keep the instructions short.',
          badge: 'Concise Communication Style',
        },
      ]
    : [
        {
          icon: AlertTriangle,
          tag: 'Step 1 • Initial Report',
          title: 'Crash After Login',
          prompt: "My application keeps crashing after I log in. I'm using Chrome on Windows 11.",
          badge: 'Retains Environment & Issue',
        },
        {
          icon: RotateCcw,
          tag: 'Step 2 • Test Recall',
          title: 'Recurring Issue',
          prompt: "I'm having the login problem again.",
          badge: 'Recalls Previous Context',
        },
        {
          icon: LayoutDashboard,
          tag: 'Dashboard Access',
          title: 'Dashboard Not Loading',
          prompt: "I can't access my dashboard after the latest CloudDesk update.",
          badge: 'Diagnostic Troubleshooting',
        },
        {
          icon: BarChart3,
          tag: 'Reporting Module',
          title: 'Reports Loading Failure',
          prompt: "My quarterly reports aren't loading and export is timing out.",
          badge: 'Performance & Operations',
        },
      ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center text-center">
      {/* Product & Memory Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-medium mb-4">
        <LifeBuoy className="w-3.5 h-3.5 text-cyan-400" />
        <span>CloudDesk Technical Support Co-Pilot</span>
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
        How can we help {currentCustomer.name}?
      </h1>
      <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">
        Describe the technical issue you are experiencing with CloudDesk. Our AI support agent uses{' '}
        <span className="text-purple-300 font-semibold">Hindsight memory</span> to recall your environment, past errors, and resolutions across interactions.
      </p>

      {/* Prompt Suggestions Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        {supportPrompts.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectPrompt && onSelectPrompt(item.prompt)}
              className="group p-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700/80 transition-all text-left flex flex-col justify-between cursor-pointer"
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

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-purple-300/80 font-mono text-[10px]">{item.badge}</span>
                <span className="text-slate-400 group-hover:text-slate-400 font-medium">Click to send</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Trust & Memory Security Callout */}
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Hindsight multi-tenant isolation active • Customer banks strictly partitioned</span>
      </div>
    </div>
  );
}
