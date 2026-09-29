import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  Database,
  Info,
  Globe,
  ExternalLink,
  Calendar,
  Building2,
} from 'lucide-react';
import {
  fetchKnowledgeDocuments,
  createKnowledgeDocument,
  ingestKnowledgeDocument,
  deleteKnowledgeDocument,
  searchKnowledgeApi,
  searchWebApi,
} from '../services/api';

const CATEGORIES = [
  'All',
  'SQL',
  'DBMS',
  'DSA',
  'Backend',
  'React',
  'Data Science',
  'Machine Learning',
  'System Design',
  'HR / Behavioral',
  'General',
];

const ROLES = [
  'All',
  'Software Engineer',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Data Analyst',
  'Data Scientist',
  'Machine Learning Engineer',
  'General',
];

export default function KnowledgeView({ onStartChatWithPrompt }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // New Document modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: 'SQL',
    role: 'Data Analyst',
    contentType: 'concept',
    source: 'Placement Prep Notes',
    tags: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail Modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Tab: 'rag' | 'web'
  const [activeTab, setActiveTab] = useState('rag');

  // Web Research state (Phase 8)
  const [webQuery, setWebQuery] = useState('');
  const [webRecency, setWebRecency] = useState('any'); // 'any' | '7' | '30' | '90'
  const [webIntent, setWebIntent] = useState('general');
  const [webDomain, setWebDomain] = useState('');
  const [webResults, setWebResults] = useState(null);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [webSearchMeta, setWebSearchMeta] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchDocs() {
      try {
        setIsLoading(true);
        setError(null);
        const filter = {};
        if (selectedCategory !== 'All') filter.category = selectedCategory;
        if (selectedRole !== 'All') filter.role = selectedRole;

        const docs = await fetchKnowledgeDocuments(filter);
        if (isMounted) {
          setDocuments(docs);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load knowledge documents');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchDocs();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, selectedRole, refreshKey]);

  const loadDocuments = () => setRefreshKey((k) => k + 1);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const res = await searchKnowledgeApi({
        query: searchQuery.trim(),
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        role: selectedRole !== 'All' ? selectedRole : undefined,
        limit: 5,
      });
      setSearchResults(res.results || []);
    } catch (err) {
      setError(err.message || 'Semantic search failed');
    } finally {
      setIsSearching(false);
    }
  }

  async function handleIngest(docId) {
    try {
      setError(null);
      const res = await ingestKnowledgeDocument(docId, true);
      setSuccessMessage(
        res.skipped
          ? `Document unchanged (contentHash matched). Re-indexing skipped.`
          : `Ingested ${res.chunksCount} chunks into vector store!`
      );
      setTimeout(() => setSuccessMessage(''), 4000);
      loadDocuments();
    } catch (err) {
      setError(err.message || 'Ingestion failed');
    }
  }

  async function handleDelete(docId, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}" and its vector chunks?`)) {
      return;
    }
    try {
      await deleteKnowledgeDocument(docId);
      setSuccessMessage(`Document "${title}" and associated chunks removed.`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadDocuments();
      if (selectedDoc?.id === docId) setSelectedDoc(null);
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    }
  }

  async function handleCreateDoc(e) {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.content.trim()) {
      setError('Title and content are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const tagsArray = newDoc.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const created = await createKnowledgeDocument({
        ...newDoc,
        tags: tagsArray,
      });

      // Auto-ingest new document
      await ingestKnowledgeDocument(created.id, true);

      setShowAddModal(false);
      setNewDoc({
        title: '',
        category: 'SQL',
        role: 'Data Analyst',
        contentType: 'concept',
        source: 'Placement Prep Notes',
        tags: '',
        content: '',
      });
      setSuccessMessage(`Knowledge document created and indexed into vector store!`);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadDocuments();
    } catch (err) {
      setError(err.message || 'Failed to create document');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWebSearch(e) {
    if (e) e.preventDefault();
    if (!webQuery.trim()) return;

    try {
      setIsWebSearching(true);
      setError(null);
      const recencyDays = webRecency === 'any' ? undefined : parseInt(webRecency, 10);
      const res = await searchWebApi({
        query: webQuery.trim(),
        recencyDays,
        domain: webDomain.trim() || undefined,
        intent: webIntent !== 'all' ? webIntent : undefined,
        limit: 5,
      });
      setWebResults(res.results || []);
      setWebSearchMeta({
        provider: res.provider,
        count: res.count,
        query: res.query,
      });
    } catch (err) {
      setError(err.message || 'Web search failed');
    } finally {
      setIsWebSearching(false);
    }
  }

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunksCount || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`p-2 rounded-xl border ${
              activeTab === 'rag'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {activeTab === 'rag' ? <BookOpen className="w-6 h-6" /> : <Globe className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">
                  {activeTab === 'rag' ? 'Knowledge & Resources Engine' : 'Live Web Intelligence & Tools'}
                </h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'rag'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {activeTab === 'rag' ? 'PHASE 7 RAG' : 'PHASE 8 WEB'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeTab === 'rag'
                  ? 'Controlled technical knowledge retrieval grounded with semantic vector embeddings'
                  : 'Current external market requirements, recent company interview bars, and public resources'}
              </p>
            </div>
          </div>
        </div>

        {activeTab === 'rag' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Document</span>
            </button>
            <button
              onClick={() => loadDocuments()}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
              title="Reload documents"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900/90 border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('rag')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'rag'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Internal Technical Knowledge (RAG)</span>
        </button>
        <button
          onClick={() => setActiveTab('web')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'web'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Live Web Research (Web Tools)</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            NEW
          </span>
        </button>
      </div>

      {/* Status / Alert notifications */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* RAG View Content */}
      {activeTab === 'rag' && (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">Total Documents</span>
              <p className="text-xl font-bold text-slate-100 mt-1">{documents.length}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">Indexed Chunks</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">{totalChunks}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">Categories</span>
              <p className="text-xl font-bold text-indigo-400 mt-1">
                {new Set(documents.map((d) => d.category)).size}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">Vector Store Engine</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-medium text-emerald-400">Active / Hybrid</span>
              </div>
            </div>
          </div>

          {/* Semantic Retrieval Playground */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">Test Semantic Retrieval</h2>
              </div>
              <span className="text-[11px] text-slate-400">Top-K = 5 with Cosine Similarity</span>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="E.g., What are SQL window functions like ROW_NUMBER and RANK?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Semantic Search</span>
              </button>
              {searchResults && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchResults(null);
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </form>

            {/* Semantic Search Results Preview */}
            {searchResults && (
              <div className="pt-2 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Retrieved {searchResults.length} relevant chunk(s)</span>
                  <span className="text-[11px] text-cyan-400 font-mono">Ranked by Cosine Score</span>
                </div>

                {searchResults.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 text-center text-xs text-slate-400">
                    No matching knowledge chunks found for this query in the internal knowledge base.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {searchResults.map((res, idx) => (
                      <div
                        key={res.chunkId || idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{res.title}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Score: {typeof res.score === 'number' ? res.score.toFixed(3) : 'N/A'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-mono line-clamp-3 bg-slate-900/60 p-2 rounded-lg">
                          {res.content}
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <span className="capitalize">{res.metadata?.category || 'General'}</span>
                          {onStartChatWithPrompt && (
                            <button
                              onClick={() =>
                                onStartChatWithPrompt(`Explain this concept: ${res.title}`)
                              }
                              className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              Ask Agent <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter and Explore Documents */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-slate-100">Internal Technical Documents</h2>
                <span className="text-xs text-slate-400">({documents.length})</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      Category: {c}
                    </option>
                  ))}
                </select>

                {/* Role filter */}
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      Role: {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Document Grid */}
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading knowledge documents...</div>
            ) : documents.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <p className="text-xs text-slate-400">No documents match the selected filters.</p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSelectedRole('All');
                  }}
                  className="text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {doc.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {doc.chunksCount > 0 ? (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>{doc.chunksCount} chunks</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-slate-200 line-clamp-1">{doc.title}</h3>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {doc.description || doc.content.slice(0, 100)}
                      </p>

                      {/* Metadata tags */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          Role: {doc.role}
                        </span>
                        {Array.isArray(doc.tags) &&
                          doc.tags.slice(0, 2).map((t, idx) => (
                            <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400">
                              #{t}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Card footer actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium text-[11px] cursor-pointer"
                      >
                        View Document
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleIngest(doc.id)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
                          title="Re-index / Ingest into vector store"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Web Research View Content (Phase 8) */}
      {activeTab === 'web' && (
        <div className="space-y-6">
          {/* Web Research Query Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-100">Live External Web Search</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Controlled tool retrieval with canonical deduplication
              </span>
            </div>

            <form onSubmit={handleWebSearch} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="E.g., What are companies currently asking Data Analysts to know in 2026?"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isWebSearching || !webQuery.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {isWebSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search Web</span>
                </button>
                {webResults && (
                  <button
                    type="button"
                    onClick={() => {
                      setWebResults(null);
                      setWebQuery('');
                      setWebSearchMeta(null);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 text-xs transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Filters Row: Recency + Intent + Domain */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                {/* Recency Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Recency:
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: 'Any', value: 'any' },
                      { label: '7 days', value: '7' },
                      { label: '30 days', value: '30' },
                      { label: '90 days', value: '90' },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setWebRecency(opt.value)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                          webRecency === opt.value
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intent Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] font-medium">Intent:</span>
                  <select
                    value={webIntent}
                    onChange={(e) => setWebIntent(e.target.value)}
                    className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300 focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="jobs">Job Postings</option>
                    <option value="company">Company Specific</option>
                    <option value="interview">Interview Experiences</option>
                    <option value="learning">Learning Resources</option>
                  </select>
                </div>

                {/* Domain Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    Domain:
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. microsoft.com"
                    value={webDomain}
                    onChange={(e) => setWebDomain(e.target.value)}
                    className="w-32 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Quick Presets / Starter Queries */}
          {!webResults && !isWebSearching && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Suggested Web Queries
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  'What are the latest skills companies want for Data Analysts?',
                  'What skills does Microsoft currently mention for software engineering roles?',
                  'Find recent SQL interview experiences for Data Analyst roles',
                  'What are the latest AI engineering tools and trends in 2026?',
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWebQuery(preset);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/60 hover:border-emerald-500/40 transition cursor-pointer text-left"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Web Search Results Cards */}
          {webResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Found <strong className="text-slate-200">{webResults.length}</strong> normalized web result(s)
                  {webSearchMeta?.provider && (
                    <span className="ml-2 font-mono text-[10px] text-emerald-400">
                      via {webSearchMeta.provider} provider
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">Deduplicated & Filtered</span>
              </div>

              {webResults.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <p className="text-xs text-slate-400">No web results found for this query or filters.</p>
                  <p className="text-[11px] text-slate-500">
                    Try broadening your search query or removing recency/domain filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {webResults.map((item, idx) => (
                    <div
                      key={item.url || idx}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Header: source badge + date */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 truncate max-w-[200px]">
                            {item.source}
                          </span>
                          {item.publishedAt && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Calendar className="w-2.5 h-2.5 text-slate-500" />
                              {item.publishedAt.slice(0, 10)}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-xs font-bold text-slate-100 hover:text-emerald-300 transition line-clamp-2">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.title}
                          </a>
                        </h3>

                        {/* Snippet */}
                        <p className="text-[11px] text-slate-300 mt-2 line-clamp-3 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                          {item.snippet}
                        </p>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          <span>Open source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {onStartChatWithPrompt && (
                          <button
                            type="button"
                            onClick={() =>
                              onStartChatWithPrompt(
                                `What can you tell me about: "${item.title}" based on current web research?`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Ask Agent →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {selectedDoc.category}
                  </span>
                  <span className="text-[10px] text-slate-400">Target: {selectedDoc.role}</span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{selectedDoc.title}</h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-300">Description:</span>
                <p className="text-slate-400 mt-0.5">{selectedDoc.description || 'No description provided.'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-300">Content Preview:</span>
                <pre className="mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedDoc.content}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-500">Source:</span> {selectedDoc.source}
                </div>
                <div>
                  <span className="text-slate-500">Content Type:</span> {selectedDoc.contentType}
                </div>
                <div>
                  <span className="text-slate-500">Indexed Chunks:</span> {selectedDoc.chunksCount}
                </div>
                <div className="truncate">
                  <span className="text-slate-500">Content Hash:</span> {selectedDoc.contentHash?.slice(0, 12)}...
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-between items-center">
              {onStartChatWithPrompt && (
                <button
                  onClick={() => {
                    const prompt = `Explain the key concepts in "${selectedDoc.title}" and give me 2 interview questions.`;
                    setSelectedDoc(null);
                    onStartChatWithPrompt(prompt);
                  }}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Placement Agent about this</span>
                </button>
              )}
              <button
                onClick={() => setSelectedDoc(null)}
                className="ml-auto px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add Knowledge Document</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., React Fiber Architecture & Reconciliation"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newDoc.category}
                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Role</label>
                  <select
                    value={newDoc.role}
                    onChange={(e) => setNewDoc({ ...newDoc, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                  >
                    {ROLES.filter((r) => r !== 'All').map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="React, Virtual DOM, Fiber, Diffing"
                  value={newDoc.tags}
                  onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Content *</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Provide technical concepts, rules, interview tips, code patterns..."
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Indexing...' : 'Create & Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
