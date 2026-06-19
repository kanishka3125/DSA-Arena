import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useUserProgress } from '../hooks/useUserProgress';
import { striverA2ZData, getFlatProblems } from '../data/striverA2Z';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { Search, Filter, BookOpen, ChevronLeft, CheckSquare, Square, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Compare() {
  const { compareUserId } = useParams();
  const { progress: myProgress, toggleProblemSolved, loading: myProgressLoading } = useUserProgress();
  const allProblems = getFlatProblems();

  // Selected comparison user profile and progress
  const [compareUser, setCompareUser] = useState(null);
  const [compareProgress, setCompareProgress] = useState({});
  const [loadingCompare, setLoadingCompare] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [filterComparison, setFilterComparison] = useState('All'); // 'All', 'both', 'me_only', 'them_only', 'neither'

  // Fetch target user's info & listen to progress
  useEffect(() => {
    if (!compareUserId) return;

    const fetchCompareUser = async () => {
      try {
        const q = query(collection(db, 'users'), where('uid', '==', compareUserId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setCompareUser(snap.docs[0].data());
        } else {
          setCompareUser({ displayName: 'Friend', username: 'friend' });
        }
      } catch (err) {
        console.error("Error fetching comparison user:", err);
      }
    };

    fetchCompareUser();

    // Set up real-time listener for friend's progress
    const progressRef = collection(db, 'user_progress', compareUserId, 'problems');
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const progData = {};
      snapshot.forEach((doc) => {
        progData[doc.id] = doc.data();
      });
      setCompareProgress(progData);
      setLoadingCompare(false);
    }, (error) => {
      console.error("Error fetching comparison progress:", error);
      setLoadingCompare(false);
    });

    return () => unsubscribe();
  }, [compareUserId]);

  const handleCheckboxToggle = async (problemId, currentSolvedState) => {
    try {
      await toggleProblemSolved(problemId, !currentSolvedState);
    } catch (err) {
      console.error("Failed to toggle checkbox:", err);
    }
  };

  // Stats calculations
  const totalProblemsCount = allProblems.length;
  
  const mySolvedCount = Object.values(myProgress).filter(p => p.solved).length;
  const compareSolvedCount = Object.values(compareProgress).filter(p => p.solved).length;

  const mutualSolvedCount = allProblems.filter(p => {
    return myProgress[p.id]?.solved && compareProgress[p.id]?.solved;
  }).length;

  // Filtered problems list
  const filteredProblems = allProblems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'All' || p.topicId === selectedTopic;
    const matchesDifficulty = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;

    const solvedByMe = !!myProgress[p.id]?.solved;
    const solvedByThem = !!compareProgress[p.id]?.solved;

    let matchesComparison = true;
    if (filterComparison === 'both') {
      matchesComparison = solvedByMe && solvedByThem;
    } else if (filterComparison === 'me_only') {
      matchesComparison = solvedByMe && !solvedByThem;
    } else if (filterComparison === 'them_only') {
      matchesComparison = !solvedByMe && solvedByThem;
    } else if (filterComparison === 'neither') {
      matchesComparison = !solvedByMe && !solvedByThem;
    }

    return matchesSearch && matchesTopic && matchesDifficulty && matchesComparison;
  });

  const isLoading = myProgressLoading || loadingCompare;

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Back Link */}
        <div>
          <Link to="/leaderboard" className="inline-flex items-center text-xs font-bold text-text-muted hover:text-primary transition-colors gap-1">
            <ChevronLeft size={16} />
            Back to Leaderboards
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Progress Comparison
            </h1>
            <p className="text-text-muted text-sm mt-1">
              Comparing your progress side-by-side with <span className="font-bold text-text-base">{compareUser?.displayName || 'Friend'}</span>.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl border border-card-border flex flex-col justify-between">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Your Progress</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-primary">{mySolvedCount}</span>
              <span className="text-sm font-semibold text-text-muted">/ {totalProblemsCount}</span>
            </div>
            <p className="text-xs text-text-muted mt-1 font-medium">({((mySolvedCount / totalProblemsCount) * 100).toFixed(1)}% Completed)</p>
          </div>

          <div className="glass p-6 rounded-2xl border border-card-border flex flex-col justify-between">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">{compareUser?.displayName || 'Friend'}'s Progress</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-secondary">{compareSolvedCount}</span>
              <span className="text-sm font-semibold text-text-muted">/ {totalProblemsCount}</span>
            </div>
            <p className="text-xs text-text-muted mt-1 font-medium">({((compareSolvedCount / totalProblemsCount) * 100).toFixed(1)}% Completed)</p>
          </div>

          <div className="glass p-6 rounded-2xl border border-card-border flex flex-col justify-between">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Mutual Solved</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-accent">{mutualSolvedCount}</span>
              <span className="text-sm font-semibold text-text-muted">/ {totalProblemsCount}</span>
            </div>
            <p className="text-xs text-text-muted mt-1 font-medium">Problems solved by both of you</p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="glass p-6 rounded-3xl border border-card-border flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full lg:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Search size={18} />
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 text-text-base bg-white/5 border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="Search problems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {/* Topic dropdown */}
            <div className="flex items-center space-x-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 text-xs font-semibold text-text-muted">
              <BookOpen size={14} className="text-primary" />
              <select
                className="bg-transparent focus:outline-none cursor-pointer"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
              >
                <option value="All">All Topics</option>
                {striverA2ZData.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            {/* Difficulty dropdown */}
            <div className="flex items-center space-x-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 text-xs font-semibold text-text-muted">
              <Filter size={14} className="text-secondary" />
              <select
                className="bg-transparent focus:outline-none cursor-pointer"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Comparison filters dropdown */}
            <div className="flex items-center space-x-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 text-xs font-semibold text-text-muted">
              <Filter size={14} className="text-accent" />
              <select
                className="bg-transparent focus:outline-none cursor-pointer"
                value={filterComparison}
                onChange={(e) => setFilterComparison(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="both">Solved By Both</option>
                <option value="me_only">Solved By Me Only</option>
                <option value="them_only">Solved By {compareUser?.displayName || 'Them'} Only</option>
                <option value="neither">Solved By Neither</option>
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="glass rounded-3xl overflow-hidden border border-card-border shadow-md">
          {isLoading ? (
            <div className="p-12 space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 w-full bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredProblems.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-sm">
              No matching problems found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-card-border bg-white/5 text-xs font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-4 px-6 w-1/2">Problem Name</th>
                    <th className="py-4 px-6 w-1/6">Difficulty</th>
                    <th className="py-4 px-6 text-center w-1/6">Me</th>
                    <th className="py-4 px-6 text-center w-1/6 truncate max-w-[150px]">
                      {compareUser?.displayName || 'Friend'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredProblems.map((p) => {
                    const isSolvedByMe = !!myProgress[p.id]?.solved;
                    const isSolvedByFriend = !!compareProgress[p.id]?.solved;
                    
                    return (
                      <tr key={p.id} className="hover:bg-white/5 transition-colors">
                        {/* Title */}
                        <td className="py-4 px-6">
                          <span className="font-bold text-sm text-text-base">{p.title}</span>
                        </td>
                        
                        {/* Difficulty */}
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                            p.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {p.difficulty}
                          </span>
                        </td>
                        
                        {/* Interactive Checkbox for Me */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleCheckboxToggle(p.id, isSolvedByMe)}
                            className="inline-flex items-center justify-center p-1 rounded hover:bg-white/10 transition-colors text-primary cursor-pointer"
                          >
                            {isSolvedByMe ? (
                              <CheckSquare size={20} className="text-primary" />
                            ) : (
                              <Square size={20} className="text-text-muted opacity-50" />
                            )}
                          </button>
                        </td>

                        {/* Read-only status for Selected User */}
                        <td className="py-4 px-6 text-center text-lg">
                          {isSolvedByFriend ? (
                            <span className="text-green-500" title="Solved">✅</span>
                          ) : (
                            <span className="text-text-muted opacity-30" title="Not Solved">❌</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
