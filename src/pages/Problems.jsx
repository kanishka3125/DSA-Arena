import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { useUserProgress } from '../hooks/useUserProgress';
import { striverA2ZData } from '../data/striverA2Z';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import {
  Search, Filter, BookOpen, Users, Sword, CheckSquare, Square,
  ChevronDown, ChevronRight, ArrowUpDown
} from 'lucide-react';

// ─── Difficulty helpers ──────────────────────────────────────────────────────
const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 };

function DifficultyBadge({ difficulty }) {
  const cls =
    difficulty === 'Easy'
      ? 'bg-green-500/10 text-green-500'
      : difficulty === 'Medium'
      ? 'bg-yellow-500/10 text-yellow-500'
      : 'bg-red-500/10 text-red-500';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {difficulty}
    </span>
  );
}

// ─── Topic progress bar ──────────────────────────────────────────────────────
function TopicProgressBar({ solved, total }) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-text-muted whitespace-nowrap tabular-nums">
        {solved} / {total}
      </span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Problems() {
  const { user } = useAuth();
  const { progress: myProgress, toggleProblemSolved, loading: myProgressLoading } = useUserProgress();

  // ── Filter / sort state ────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]           = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTopic, setSelectedTopic]     = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [sortOrder, setSortOrder]             = useState('roadmap');
  const [comparisonFilter, setComparisonFilter] = useState('All');

  // ── Accordion state ────────────────────────────────────────────────────────
  const [expandedTopics, setExpandedTopics] = useState(new Set());

  // ── Room / comparison state (unchanged from original) ─────────────────────
  const [rooms, setRooms]                           = useState([]);
  const [selectedRoomId, setSelectedRoomId]         = useState('');
  const [roomMembers, setRoomMembers]               = useState([]);
  const [selectedCompareMemberId, setSelectedCompareMemberId] = useState('');
  const [membersProgress, setMembersProgress]       = useState({});

  // Debounce search input (150 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 150);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Load user's rooms ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchRooms = async () => {
      try {
        const q = query(collection(db, 'rooms'), where('members', 'array-contains', user.uid));
        const snap = await getDocs(q);
        const roomsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRooms(roomsData);
        if (roomsData.length > 0) setSelectedRoomId(roomsData[0].id);
      } catch (err) {
        console.error('Failed to load rooms:', err);
      }
    };
    fetchRooms();
  }, [user]);

  // Sync room members + their progress in real-time ─────────────────────────
  useEffect(() => {
    if (!selectedRoomId || !user) {
      setRoomMembers([]);
      setMembersProgress({});
      return;
    }

    const roomRef = doc(db, 'rooms', selectedRoomId);
    const unsubscribeRoom = onSnapshot(roomRef, async (roomSnap) => {
      if (!roomSnap.exists()) return;
      const memberIds = roomSnap.data().members || [];

      const membersList = [];
      const unsubscribesProgress = [];

      for (const mId of memberIds) {
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', mId)));
        const name = userSnap.empty ? 'Explorer' : userSnap.docs[0].data().displayName;
        membersList.push({ uid: mId, displayName: name });

        const progRef = collection(db, 'user_progress', mId, 'problems');
        const unsubProg = onSnapshot(progRef, (progSnap) => {
          const userProg = {};
          progSnap.forEach((d) => { userProg[d.id] = d.data(); });
          setMembersProgress((prev) => ({ ...prev, [mId]: userProg }));
        });
        unsubscribesProgress.push(unsubProg);
      }

      setRoomMembers(membersList);
      const firstFriend = membersList.find(m => m.uid !== user.uid);
      if (firstFriend) setSelectedCompareMemberId(firstFriend.uid);

      return () => { unsubscribesProgress.forEach(u => u()); };
    });

    return () => unsubscribeRoom();
  }, [selectedRoomId, user]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCheckboxToggle = useCallback(async (problemId, currentSolvedState) => {
    try {
      await toggleProblemSolved(problemId, !currentSolvedState);
    } catch (err) {
      console.error(err);
    }
  }, [toggleProblemSolved]);

  const toggleTopic = useCallback((topicId) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedTopic('All');
    setSelectedDifficulty('All');
    setComparisonFilter('All');
  }, []);

  // ── Sort helper ────────────────────────────────────────────────────────────
  const sortProblems = useCallback((problems, order) => {
    if (order === 'roadmap') return problems;
    const copy = [...problems];
    switch (order) {
      case 'alpha':
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      case 'easy-first':
        return copy.sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
      case 'hard-first':
        return copy.sort((a, b) => DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty]);
      case 'completed-first':
        return copy.sort((a, b) => (!!myProgress[a.id]?.solved ? 0 : 1) - (!!myProgress[b.id]?.solved ? 0 : 1));
      case 'incomplete-first':
        return copy.sort((a, b) => (!!myProgress[a.id]?.solved ? 1 : 0) - (!!myProgress[b.id]?.solved ? 1 : 0));
      default:
        return copy;
    }
  }, [myProgress]);

  // ── Main filtered + sorted topics list ────────────────────────────────────
  const filteredTopics = useMemo(() => {
    const search = debouncedSearch.toLowerCase().trim();

    return striverA2ZData
      .filter(topic => selectedTopic === 'All' || topic.id === selectedTopic)
      .map(topic => {
        const topicTitleMatch = search && topic.title.toLowerCase().includes(search);

        const filteredProblems = topic.problems.filter(p => {
          // Search: show all problems in topic if topic title matches, else match problem name
          if (search && !topicTitleMatch && !p.title.toLowerCase().includes(search)) return false;

          // Difficulty filter
          if (selectedDifficulty !== 'All' && p.difficulty !== selectedDifficulty) return false;

          // Comparison / room filters (unchanged logic)
          if (selectedRoomId) {
            const isSolvedByMe = !!myProgress[p.id]?.solved;
            if (comparisonFilter === 'solved_by_me') {
              if (!isSolvedByMe) return false;
            } else if (comparisonFilter === 'solved_by_friend' && selectedCompareMemberId) {
              if (!membersProgress[selectedCompareMemberId]?.[p.id]?.solved) return false;
            } else if (comparisonFilter === 'solved_by_others_not_me') {
              const solvedByOther = roomMembers.some(
                m => m.uid !== user?.uid && !!membersProgress[m.uid]?.[p.id]?.solved
              );
              if (!solvedByOther || isSolvedByMe) return false;
            } else if (comparisonFilter === 'solved_by_everyone') {
              const allSolved = roomMembers.every(m => {
                const s = m.uid === user?.uid ? myProgress : membersProgress[m.uid];
                return !!s?.[p.id]?.solved;
              });
              if (!allSolved) return false;
            } else if (comparisonFilter === 'not_solved_by_anyone') {
              const noneSolved = roomMembers.every(m => {
                const s = m.uid === user?.uid ? myProgress : membersProgress[m.uid];
                return !s?.[p.id]?.solved;
              });
              if (!noneSolved) return false;
            }
          }

          return true;
        });

        // Solved count uses ALL problems in the topic (for accurate progress bar)
        const solvedInTopic = topic.problems.filter(p => !!myProgress[p.id]?.solved).length;

        return {
          ...topic,
          filteredProblems: sortProblems(filteredProblems, sortOrder),
          solvedInTopic,
          totalInTopic: topic.problems.length,
        };
      })
      .filter(topic => topic.filteredProblems.length > 0);
  }, [
    debouncedSearch, selectedTopic, selectedDifficulty, sortOrder,
    comparisonFilter, selectedCompareMemberId,
    myProgress, membersProgress, roomMembers, selectedRoomId,
    user, sortProblems,
  ]);

  // Auto-expand when search is active or a specific topic is selected
  useEffect(() => {
    if (debouncedSearch || selectedTopic !== 'All') {
      setExpandedTopics(new Set(filteredTopics.map(t => t.id)));
    }
    // If filters are cleared, collapse all
    if (!debouncedSearch && selectedTopic === 'All') {
      setExpandedTopics(new Set());
    }
  }, [debouncedSearch, selectedTopic]); // intentionally not including filteredTopics

  // ── Derived display values ─────────────────────────────────────────────────
  const totalVisible = filteredTopics.reduce((s, t) => s + t.filteredProblems.length, 0);
  const friendName   = roomMembers.find(m => m.uid === selectedCompareMemberId)?.displayName || 'Friend';
  const showFriend   = !!(selectedRoomId && selectedCompareMemberId);

  // Grid template for problem rows
  const rowGrid = showFriend ? '1fr 110px 60px 80px' : '1fr 110px 60px';

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Problems Sheet
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {myProgressLoading
                ? 'Loading…'
                : `${totalVisible} problem${totalVisible !== 1 ? 's' : ''} across ${filteredTopics.length} topic${filteredTopics.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Room selector */}
            <div className="flex items-center gap-2 bg-white/5 border border-card-border rounded-xl px-3 py-2">
              <Users size={15} className="text-primary shrink-0" />
              <select
                className="bg-transparent text-sm text-text-base font-semibold focus:outline-none cursor-pointer"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="">No Active Room</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {/* Friend selector */}
            {selectedRoomId && (
              <div className="flex items-center gap-2 bg-white/5 border border-card-border rounded-xl px-3 py-2">
                <Sword size={15} className="text-secondary shrink-0" />
                <span className="text-xs text-text-muted font-semibold whitespace-nowrap">View:</span>
                <select
                  className="bg-transparent text-sm text-text-base font-semibold focus:outline-none cursor-pointer"
                  value={selectedCompareMemberId}
                  onChange={(e) => setSelectedCompareMemberId(e.target.value)}
                >
                  <option value="">Select Friend</option>
                  {roomMembers.filter(m => m.uid !== user?.uid).map(m => (
                    <option key={m.uid} value={m.uid}>{m.displayName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ── Sticky Filter Bar ── */}
        <div className="sticky top-16 z-40 glass rounded-2xl border border-card-border px-3 py-2.5 flex flex-wrap gap-2 items-center shadow-md">
          {/* Search */}
          <div className="relative flex-1 min-w-44">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              className="w-full pl-8 pr-7 py-1.5 text-text-base bg-white/5 border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Search problems or topics…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base text-lg leading-none"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Topic */}
          <label className="flex items-center gap-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 cursor-pointer">
            <BookOpen size={13} className="text-primary shrink-0" />
            <select
              className="bg-transparent text-xs font-semibold text-text-base focus:outline-none cursor-pointer"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              <option value="All">All Topics</option>
              {striverA2ZData.map(t => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>

          {/* Difficulty */}
          <label className="flex items-center gap-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 cursor-pointer">
            <Filter size={13} className="text-secondary shrink-0" />
            <select
              className="bg-transparent text-xs font-semibold text-text-base focus:outline-none cursor-pointer"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </label>

          {/* Sort */}
          <label className="flex items-center gap-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 cursor-pointer">
            <ArrowUpDown size={13} className="text-accent shrink-0" />
            <select
              className="bg-transparent text-xs font-semibold text-text-base focus:outline-none cursor-pointer"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="roadmap">Roadmap Order</option>
              <option value="alpha">Alphabetical</option>
              <option value="easy-first">Easy → Hard</option>
              <option value="hard-first">Hard → Easy</option>
              <option value="completed-first">Completed First</option>
              <option value="incomplete-first">Incomplete First</option>
            </select>
          </label>

          {/* Comparison (room only) */}
          {selectedRoomId && (
            <label className="flex items-center gap-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 cursor-pointer">
              <Sword size={13} className="text-primary shrink-0" />
              <select
                className="bg-transparent text-xs font-semibold text-text-base focus:outline-none cursor-pointer"
                value={comparisonFilter}
                onChange={(e) => setComparisonFilter(e.target.value)}
              >
                <option value="All">All Comparisons</option>
                <option value="solved_by_me">Solved By Me</option>
                {selectedCompareMemberId && (
                  <option value="solved_by_friend">Solved By {friendName}</option>
                )}
                <option value="solved_by_others_not_me">Others, Not Me</option>
                <option value="solved_by_everyone">Everyone</option>
                <option value="not_solved_by_anyone">No One</option>
              </select>
            </label>
          )}
        </div>

        {/* ── Content ── */}
        {myProgressLoading ? (
          /* Loading skeletons */
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>

        ) : filteredTopics.length === 0 ? (
          /* Empty state */
          <div className="glass rounded-3xl border border-card-border py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl select-none">🔍</div>
            <h3 className="text-lg font-bold text-text-base">No problems found</h3>
            <p className="text-text-muted text-sm max-w-sm">
              No problems match your current filters. Try adjusting the search, topic, or difficulty.
            </p>
            <button
              onClick={clearFilters}
              className="mt-1 px-5 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              Clear all filters
            </button>
          </div>

        ) : (
          /* Accordion topic list */
          <div className="space-y-3">
            {filteredTopics.map((topic) => {
              const isExpanded = expandedTopics.has(topic.id);
              const isComplete = topic.solvedInTopic === topic.totalInTopic && topic.totalInTopic > 0;

              return (
                <div
                  key={topic.id}
                  className="glass rounded-2xl border border-card-border overflow-hidden shadow-sm"
                >
                  {/* ── Topic header (accordion toggle) ── */}
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left group"
                  >
                    <span className="text-text-muted group-hover:text-primary transition-colors shrink-0">
                      {isExpanded ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-text-base">{topic.title}</span>
                        <span className="text-xs text-text-muted bg-white/5 border border-card-border px-2 py-0.5 rounded-full">
                          {topic.filteredProblems.length}
                          {topic.filteredProblems.length !== topic.totalInTopic && ` / ${topic.totalInTopic}`}
                          {' '}problem{topic.filteredProblems.length !== 1 ? 's' : ''}
                        </span>
                        {isComplete && (
                          <span className="text-xs text-green-500 font-bold">✓ Complete</span>
                        )}
                      </div>
                      <TopicProgressBar solved={topic.solvedInTopic} total={topic.totalInTopic} />
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`text-xs font-bold tabular-nums ${isComplete ? 'text-green-500' : 'text-text-muted'}`}>
                        {topic.solvedInTopic}/{topic.totalInTopic}
                      </span>
                    </div>
                  </button>

                  {/* ── Problem rows (only rendered when expanded) ── */}
                  {isExpanded && (
                    <div className="border-t border-card-border">
                      {/* Column headers */}
                      <div
                        className="grid px-5 py-2 text-xs font-bold text-text-muted uppercase tracking-wider bg-white/[0.03]"
                        style={{ gridTemplateColumns: rowGrid }}
                      >
                        <span>Problem</span>
                        <span>Difficulty</span>
                        <span className="text-center">Me</span>
                        {showFriend && <span className="text-center truncate">{friendName}</span>}
                      </div>

                      <div className="divide-y divide-card-border/40">
                        {topic.filteredProblems.map((p) => {
                          const isSolvedByMe     = !!myProgress[p.id]?.solved;
                          const isSolvedByFriend = showFriend && !!membersProgress[selectedCompareMemberId]?.[p.id]?.solved;

                          return (
                            <div
                              key={p.id}
                              className="grid items-center px-5 py-2.5 hover:bg-white/5 transition-colors"
                              style={{ gridTemplateColumns: rowGrid }}
                            >
                              {/* Problem name */}
                              <span
                                className={`text-sm font-medium truncate pr-4 transition-colors ${
                                  isSolvedByMe
                                    ? 'line-through text-text-muted'
                                    : 'text-text-base'
                                }`}
                                title={p.title}
                              >
                                {p.title}
                              </span>

                              {/* Difficulty */}
                              <span>
                                <DifficultyBadge difficulty={p.difficulty} />
                              </span>

                              {/* My checkbox */}
                              <div className="flex justify-center">
                                <button
                                  onClick={() => handleCheckboxToggle(p.id, isSolvedByMe)}
                                  className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                                  title={isSolvedByMe ? 'Mark as unsolved' : 'Mark as solved'}
                                >
                                  {isSolvedByMe
                                    ? <CheckSquare size={19} className="text-primary" />
                                    : <Square size={19} className="text-text-muted opacity-40" />
                                  }
                                </button>
                              </div>

                              {/* Friend checkbox (read-only) */}
                              {showFriend && (
                                <div className="flex justify-center text-base">
                                  {isSolvedByFriend
                                    ? <span title="Solved">✅</span>
                                    : <span className="opacity-25" title="Not solved">❌</span>
                                  }
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
