import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Brain,
  Sparkles,
  RefreshCw,
  Target,
  BookOpen,
} from 'lucide-react';
import { fetchPlacementRoles, fetchPlacementAnalysis } from '../services/api';

export default function PlacementIntelligenceView({
  activeUserId,
  activeProfile,
  onStartChatWithPrompt,
  onNavigateToProfile,
}) {
  const [roles, setRoles] = useState([]);
  const [roleOverride, setRoleOverride] = useState(null);
  const selectedRole = roleOverride || activeProfile?.targetRole || 'Software Engineer';
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load catalog roles on mount
  useEffect(() => {
    let isMounted = true;
    async function loadRoles() {
      try {
        const available = await fetchPlacementRoles();
        if (isMounted && Array.isArray(available) && available.length > 0) {
          setRoles(available);
        }
      } catch (err) {
        console.warn('Could not load role catalog:', err.message);
      }
    }
    loadRoles();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load placement analysis whenever userId or selectedRole changes
  useEffect(() => {
    let isMounted = true;
    async function loadAnalysis() {
      if (!activeUserId) {
        setAnalysis(null);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchPlacementAnalysis(activeUserId, selectedRole);
        if (isMounted) {
          setAnalysis(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to generate placement intelligence analysis.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadAnalysis();
    return () => {
      isMounted = false;
    };
  }, [activeUserId, selectedRole]);

  const getReadinessBadge = (level) => {
    switch (level) {
      case 'placement_ready':
        return { label: 'Placement Ready', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'progressing':
        return { label: 'Progressing', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      case 'developing':
        return { label: 'Developing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'early':
      default:
        return { label: 'Early Stage', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
    }
  };

  const handleConsultAgent = () => {
    if (!onStartChatWithPrompt) return;
    const prompt = `Am I ready for a ${selectedRole} role? What are my highest priority skill gaps?`;
    onStartChatWithPrompt(prompt);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Placement Intelligence Engine</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PHASE 5 ENGINE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Deterministic readiness scoring, role catalog comparison, and prioritized skill gap analysis based on your candidate profile.
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Target Role:</label>
          <select
            value={selectedRole}
            onChange={(e) => setRoleOverride(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-750 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {roles.length > 0 ? (
              roles.map((r) => (
                <option key={r.title} value={r.title} className="bg-slate-900 text-slate-200">
                  {r.title}
                </option>
              ))
            ) : (
              <>
                <option value="Software Engineer">Software Engineer</option>
                <option value="Backend Developer">Backend Developer</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Full Stack Developer">Full Stack Developer</option>
                <option value="Data Analyst">Data Analyst</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                <option value="AI Engineer">AI Engineer</option>
                <option value="Data Engineer">Data Engineer</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Profile missing notice */}
      {!activeUserId && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-200">No Candidate Profile Detected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Configure your technical skills, experience level, and problem-solving history in the Candidate Profile tab to generate personalized placement intelligence.
          </p>
          <button
            onClick={onNavigateToProfile}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer hover:from-cyan-400 hover:to-indigo-500"
          >
            Configure Profile
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center space-y-3 animate-pulse">
          <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">Analyzing role catalog and candidate competencies...</p>
        </div>
      )}

      {/* Active Intelligence Dashboard */}
      {!isLoading && analysis && (
        <div className="space-y-6">
          {/* Section 1: Placement Readiness Overview Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  PLACEMENT READINESS ASSESSMENT
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">{analysis.role}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getReadinessBadge(analysis.readiness.level).color}`}>
                    {getReadinessBadge(analysis.readiness.level).label}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Preparation indicator calculated from required skills coverage, proficiency depth, and practice milestones.
                </p>
              </div>

              {/* Readiness Score Ring / Gauge */}
              <div className="flex items-center gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">Preparation Score</span>
                  <span className="text-2xl font-black text-cyan-300 font-mono">
                    {Math.round(analysis.readiness.score * 100)}%
                  </span>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-slate-850 border-t-cyan-400 flex items-center justify-center font-mono text-[11px] text-slate-300">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
            </div>

            {/* Score Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Breakdown:</span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                Skill Match: {Math.round(analysis.readiness.breakdown.skillsMatchScore * 100)}%
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                Progress Bonus: +{Math.round(analysis.readiness.breakdown.progressBonus * 100)}%
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                Coding Practice: +{Math.round(analysis.readiness.breakdown.codingPracticeBonus * 100)}%
              </span>
            </div>
          </div>

          {/* Section 2: Strengths & Preparation Focus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths Card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Verified Strengths</h3>
                <span className="ml-auto text-[11px] text-slate-500 font-mono">
                  {analysis.strengths.length} {analysis.strengths.length === 1 ? 'skill' : 'skills'}
                </span>
              </div>

              {analysis.strengths.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 italic">
                  No direct strengths matched yet for this target role. Add relevant technical competencies in your profile.
                </p>
              ) : (
                <div className="space-y-2">
                  {analysis.strengths.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="font-semibold text-slate-200">{item.skill}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                          {item.level || 'verified'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preparation Focus Chips Card */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Target className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-200">Immediate Preparation Focus</h3>
              </div>

              <p className="text-xs text-slate-400">
                Topics calculated as the highest-impact preparation targets for upcoming interviews:
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {analysis.priorities.map((gap, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-mono">
                      {gap.priority}
                    </span>
                    <span>{gap.skill}</span>
                  </span>
                ))}
              </div>

              {/* Consult Agent Prompt Action */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleConsultAgent}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 text-xs font-semibold transition cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Ask AI Agent about these Gaps</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Priority Skill Gaps (With Explainable Reasons) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-200">Priority Skill Gaps & Focus Reasons</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {analysis.skillGaps.length} gaps identified
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Transparent gap analysis explaining why each competency requires attention before placement drives:
            </p>

            <div className="space-y-2.5 pt-1">
              {analysis.skillGaps.map((gap) => (
                <div
                  key={gap.priority}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-5 h-5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs flex items-center justify-center font-bold">
                        {gap.priority}
                      </span>
                      <span className="text-xs font-bold text-slate-200">{gap.skill}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase ${
                          gap.status === 'gap'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {gap.status === 'gap' ? 'Missing' : 'Developing'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        importance: {gap.importance}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 pl-7">{gap.reason}</p>
                  </div>

                  <div className="pl-7 sm:pl-0 text-right shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 block">Target Level</span>
                    <span className="text-xs font-semibold text-cyan-300 capitalize">{gap.targetLevel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Recommended Action Items */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recommended Preparation Strategy</h3>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-850">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
