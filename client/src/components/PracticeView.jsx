import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Award,
  Code,
  Database,
  Users,
  Target,
  Clock,
  Sparkles,
  HelpCircle,
  TrendingDown,
  RotateCcw,
} from 'lucide-react';
import {
  createPracticeSession,
  submitPracticeAnswer,
  completePracticeSession,
  fetchPracticeHistory,
  fetchPracticeWeakTopics,
  fetchPlacementRoles,
} from '../services/api';

export default function PracticeView({
  activeUserId,
  activeProfile,
  onStartChatWithPrompt,
  onNavigateToProfile,
}) {
  // Session configuration state
  const [mode, setMode] = useState('practice');
  const [roleOverride, setRoleOverride] = useState(null);
  const role = roleOverride || activeProfile?.targetRole || 'Software Engineer';
  const setRole = (r) => setRoleOverride(r);
  const [topic, setTopic] = useState('SQL');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(3);

  // Active session flow state: 'setup' | 'question' | 'evaluated' | 'completed'
  const [viewState, setViewState] = useState('setup');
  const [currentSession, setCurrentSession] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [latestEvaluation, setLatestEvaluation] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);

  // History & analytics state
  const [history, setHistory] = useState([]);
  const [weakTopics, setWeakTopics] = useState([]);
  const [roles, setRoles] = useState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load catalog roles, history, and weak topics
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const availableRoles = await fetchPlacementRoles().catch(() => []);
        if (isMounted && Array.isArray(availableRoles) && availableRoles.length > 0) {
          setRoles(availableRoles);
        }
      } catch {
        // Fallback roles available in UI
      }

      if (activeUserId) {
        try {
          const [userHistory, userWeakTopics] = await Promise.all([
            fetchPracticeHistory(activeUserId, { limit: 5 }).catch(() => []),
            fetchPracticeWeakTopics(activeUserId).catch(() => []),
          ]);
          if (isMounted) {
            setHistory(userHistory);
            setWeakTopics(userWeakTopics);
          }
        } catch (err) {
          console.warn('Could not load practice data:', err.message);
        }
      }
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [activeUserId]);

  const handleStartSession = async (customTopic = null) => {
    if (!activeUserId) {
      setError('Please select or configure a candidate profile first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const chosenTopic = customTopic || topic;

      const session = await createPracticeSession({
        userId: activeUserId,
        mode,
        role,
        topic: chosenTopic,
        difficulty,
        questionCount: parseInt(questionCount, 10),
      });

      setCurrentSession(session);
      setViewState('question');
      setAnswerInput('');
      setLatestEvaluation(null);
      setSessionSummary(null);
    } catch (err) {
      setError(err.message || 'Failed to start practice session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim() || !currentSession?.id) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await submitPracticeAnswer(currentSession.id, activeUserId, answerInput.trim());

      setLatestEvaluation(result.evaluation);

      // Check if session has finished
      if (result.isCompleted) {
        setSessionSummary(result.summary);
        setViewState('completed');
        // Refresh history & weak topics in background
        fetchPracticeHistory(activeUserId, { limit: 5 }).then(setHistory).catch(() => {});
        fetchPracticeWeakTopics(activeUserId).then(setWeakTopics).catch(() => {});
      } else {
        // Prepare next question
        if (result.nextQuestion) {
          setCurrentSession((prev) => ({
            ...prev,
            currentQuestionIndex: result.currentQuestionIndex,
            currentQuestion: result.nextQuestion,
          }));
        }
        setViewState('evaluated');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    setAnswerInput('');
    setLatestEvaluation(null);
    setViewState('question');
  };

  const handleCompleteEarly = async () => {
    if (!currentSession?.id) return;
    try {
      setIsLoading(true);
      const result = await completePracticeSession(currentSession.id, activeUserId);
      setSessionSummary(result.summary);
      setViewState('completed');
      fetchPracticeHistory(activeUserId, { limit: 5 }).then(setHistory).catch(() => {});
      fetchPracticeWeakTopics(activeUserId).then(setWeakTopics).catch(() => {});
    } catch (err) {
      setError(err.message || 'Failed to complete session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setViewState('setup');
    setCurrentSession(null);
    setAnswerInput('');
    setLatestEvaluation(null);
    setSessionSummary(null);
    setError(null);
  };

  const currentQ = currentSession?.currentQuestion;
  const questionNumber = (currentSession?.currentQuestionIndex ?? 0) + 1;
  const totalQuestions = currentSession?.questionsCount || questionCount;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Practice & Interview Engine
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              PHASE 6 ACTIVE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Interactive practice sessions, mock interviews, semantic concept evaluation, and adaptive question difficulty.
          </p>
        </div>

        {viewState !== 'setup' && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>End / New Session</span>
          </button>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================
          STATE 1: SETUP FORM
          ======================================================== */}
      {viewState === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Missing profile warning banner */}
          {!activeUserId && onNavigateToProfile && (
            <div className="lg:col-span-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>No candidate profile active. Configure your profile so the engine can tailor practice questions to your background.</span>
              </div>
              <button
                onClick={onNavigateToProfile}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold text-amber-200 transition cursor-pointer shrink-0 ml-4"
              >
                Setup Profile
              </button>
            </div>
          )}

          {/* Main Setup Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Target className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Configure Practice Session
                </h2>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Session Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'practice', label: 'Practice', icon: Code, desc: 'Topic drill' },
                    { id: 'technical_interview', label: 'Technical', icon: Database, desc: 'Role tech' },
                    { id: 'hr_interview', label: 'HR / Behavioral', icon: Users, desc: 'STAR & fit' },
                    { id: 'mixed_interview', label: 'Mixed Mock', icon: Sparkles, desc: 'Full interview' },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = mode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-sm shadow-cyan-500/10'
                            : 'bg-slate-850/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-semibold">{m.label}</div>
                          <div className="text-[10px] text-slate-500">{m.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Target Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-750 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <option key={r.title} value={r.title}>
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
                      </>
                    )}
                  </select>
                </div>

                {/* Topic Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Topic / Focus
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. SQL, System Design, React"
                    className="w-full px-3 py-2 rounded-xl bg-slate-850 border border-slate-750 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Quick Topic Chips */}
              <div>
                <span className="text-[11px] text-slate-400 font-medium mr-2">Quick focus:</span>
                <div className="inline-flex flex-wrap gap-1.5 mt-1">
                  {['SQL', 'Data Structures', 'Algorithms', 'System Design', 'React', 'Behavioral', 'Database Indexing'].map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopic(t)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                          topic === t
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Difficulty & Question Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Starting Difficulty
                  </label>
                  <div className="flex gap-2">
                    {['easy', 'medium', 'hard'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize border transition cursor-pointer ${
                          difficulty === d
                            ? d === 'hard'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : d === 'medium'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-850 text-slate-400 border-slate-750 hover:text-slate-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Question Count
                  </label>
                  <div className="flex gap-2">
                    {[3, 5, 8].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setQuestionCount(count)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                          questionCount === count
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-850 text-slate-400 border-slate-750 hover:text-slate-200'
                        }`}
                      >
                        {count} Qs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleStartSession()}
                  disabled={isLoading || !activeUserId}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating Session Questions...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Start Practice Session</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar: Weak Topics & Recent History */}
          <div className="space-y-6">
            {/* Weak Practice Topics */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <TrendingDown className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Needs Review (Weak Topics)
                </h3>
              </div>

              {weakTopics.length > 0 ? (
                <div className="space-y-2">
                  {weakTopics.slice(0, 4).map((item) => (
                    <div
                      key={item.topic}
                      className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{item.topic}</div>
                        <div className="text-[10px] text-amber-400 font-mono">
                          Avg: {item.averageScore}% ({item.attempts} attempts)
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTopic(item.topic);
                          handleStartSession(item.topic);
                        }}
                        className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-semibold text-amber-300 transition cursor-pointer"
                      >
                        Drill
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">
                  No weak topics detected yet. Complete practice sessions to see areas needing review.
                </div>
              )}
            </div>

            {/* Recent History */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Recent Sessions
                </h3>
              </div>

              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.slice(0, 4).map((s) => (
                    <div
                      key={s.id || s._id}
                      className="p-2.5 rounded-xl bg-slate-850/70 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {s.topic || s.role}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {s.mode.replace('_', ' ')} • {s.questionsCount || s.questions?.length} Qs
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-mono font-bold ${
                            s.score >= 75
                              ? 'text-emerald-400'
                              : s.score >= 50
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {s.score}%
                        </span>
                        <div className="text-[9px] text-slate-500 uppercase">{s.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-3 text-center">
                  No previous sessions found. Start your first session above!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STATE 2: LIVE QUESTION SCREEN
          ======================================================== */}
      {viewState === 'question' && currentQ && (
        <div className="space-y-6">
          {/* Progress bar and badges */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-cyan-400">
                Question {questionNumber} of {totalQuestions}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-medium text-slate-300 capitalize">{currentQ.topic}</span>
              <span className="text-slate-600">•</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                  currentQ.difficulty === 'hard'
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    : currentQ.difficulty === 'medium'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {currentQ.difficulty}
              </span>
            </div>

            <button
              onClick={handleCompleteEarly}
              className="text-xs text-slate-400 hover:text-rose-400 transition cursor-pointer"
            >
              Finish Early
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-indigo-400">
              <HelpCircle className="w-4 h-4" />
              <span>{currentQ.type} Question</span>
            </div>

            <h2 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
              {currentQ.question}
            </h2>

            {currentQ.expectedConcepts && currentQ.expectedConcepts.length > 0 && (
              <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">Expected Key Concepts:</span>
                {currentQ.expectedConcepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/50"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Answer Textarea */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">
              Your Answer / Explanation:
            </label>
            <textarea
              rows={6}
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Explain your approach, syntax, principles, trade-offs, or examples clearly..."
              className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40 text-sm text-slate-100 placeholder-slate-500 outline-none transition resize-y font-sans"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Be thorough. The evaluation engine scores correctness, relevance, clarity, and depth.</span>
              <span>{answerInput.length} characters</span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || !answerInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating with AI Engine...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STATE 3: EVALUATED ANSWER SCREEN
          ======================================================== */}
      {viewState === 'evaluated' && latestEvaluation && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white">Answer Evaluation Results</h2>
            </div>
            <span className="text-xs text-slate-400">
              Question {questionNumber} of {totalQuestions}
            </span>
          </div>

          {/* Score overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold mb-1">
                Overall
              </span>
              <span
                className={`text-2xl font-bold font-mono ${
                  latestEvaluation.score >= 80
                    ? 'text-emerald-400'
                    : latestEvaluation.score >= 60
                    ? 'text-cyan-400'
                    : latestEvaluation.score >= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {latestEvaluation.score}
              </span>
              <span className="text-[10px] text-slate-500">out of 100</span>
            </div>

            {[
              { label: 'Correctness', val: latestEvaluation.correctness },
              { label: 'Relevance', val: latestEvaluation.relevance },
              { label: 'Clarity', val: latestEvaluation.clarity },
              { label: 'Depth', val: latestEvaluation.depth },
            ].map((metric) => (
              <div
                key={metric.label}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
              >
                <span className="text-[10px] text-slate-400 font-medium">{metric.label}</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-lg font-bold font-mono text-slate-200">{metric.val}</span>
                  <span className="text-[10px] text-slate-500">/ 100</span>
                </div>
              </div>
            ))}
          </div>

          {/* Feedback & Structured Insights */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            {/* Feedback narrative */}
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Evaluator Feedback
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-850 p-4 rounded-xl border border-slate-800">
                {latestEvaluation.feedback}
              </p>
            </div>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Strengths */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Strengths</span>
                </div>
                {latestEvaluation.strengths && latestEvaluation.strengths.length > 0 ? (
                  <ul className="space-y-1">
                    {latestEvaluation.strengths.map((str, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-emerald-400">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">Answer needs more development to identify clear strengths.</p>
                )}
              </div>

              {/* Weaknesses / Needs Improvement */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Areas to Improve</span>
                </div>
                {latestEvaluation.weaknesses && latestEvaluation.weaknesses.length > 0 ? (
                  <ul className="space-y-1">
                    {latestEvaluation.weaknesses.map((weak, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{weak}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">No major weaknesses detected. Great job!</p>
                )}
              </div>
            </div>

            {/* Missing Concepts */}
            {latestEvaluation.missingConcepts && latestEvaluation.missingConcepts.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-medium text-slate-400 block mb-2">
                  Missing or Incomplete Concepts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {latestEvaluation.missingConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-rose-300 border border-rose-500/30 font-medium"
                    >
                      • {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action to proceed to next question */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Next Question ({questionNumber + 1} of {totalQuestions})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STATE 4: SESSION COMPLETED SUMMARY
          ======================================================== */}
      {viewState === 'completed' && sessionSummary && (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div className="text-center space-y-2 pb-6 border-b border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-lg shadow-cyan-500/20 mb-3">
              <Award className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Session Completed!</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Here is your structured evaluation and diagnostic preparation summary.
            </p>
          </div>

          {/* Score Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400">Average Score</span>
              <div className="text-3xl font-bold font-mono text-cyan-400 mt-1">
                {sessionSummary.averageScore}%
              </div>
              <span className="text-[10px] text-slate-500">{sessionSummary.totalQuestions} Questions Evaluated</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400">Strong Areas</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {sessionSummary.strongAreas?.length || 0} Topics
              </div>
              <span className="text-[10px] text-slate-500">Mastered concepts</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400">Areas to Review</span>
              <div className="text-xl font-bold text-amber-400 mt-1">
                {sessionSummary.weakAreas?.length || 0} Topics
              </div>
              <span className="text-[10px] text-slate-500">Requires follow-up</span>
            </div>
          </div>

          {/* Strengths & Weak Areas List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <h3 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Demonstrated Strengths</span>
              </h3>
              {sessionSummary.strongAreas && sessionSummary.strongAreas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {sessionSummary.strongAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Practice more to establish durable strong areas.</p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <h3 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Topics to Review</span>
              </h3>
              {sessionSummary.weakAreas && sessionSummary.weakAreas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {sessionSummary.weakAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Great performance! No weak topics detected in this run.</p>
              )}
            </div>
          </div>

          {/* Recommendations narrative */}
          {sessionSummary.recommendations && (
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Preparation Next Steps
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {sessionSummary.recommendations}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Again</span>
            </button>

            {onStartChatWithPrompt && (
              <button
                onClick={() => {
                  const weakList = sessionSummary.weakAreas?.join(', ') || 'my weak areas';
                  onStartChatWithPrompt(
                    `I just finished a ${mode.replace('_', ' ')} practice session on ${topic}. Help me create a targeted study plan for: ${weakList}.`
                  );
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-cyan-300 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Brain className="w-4 h-4" />
                <span>Consult AI Agent on Weak Areas</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
        <p className="text-[11px] text-slate-400 italic">
          Disclaimer: Practice scores are preparation feedback, not hiring predictions. Evaluator recommendations are designed to guide active study and mock interview readiness.
        </p>
      </div>
    </div>
  );
}
