import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useUserProgress } from '../hooks/useUserProgress';
import { striverA2ZData, getFlatProblems } from '../data/striverA2Z';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { Search, Filter, BookOpen, Users, Sword, CheckSquare, Square, Check, X, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Problems() {
  const { user } = useAuth();
  const { progress: myProgress, toggleProblemSolved, loading: myProgressLoading } = useUserProgress();
  const allProblems = getFlatProblems();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [comparisonFilter, setComparisonFilter] = useState('All'); // 'All', 'solved_by_me', 'solved_by_friend', 'solved_by_others_not_me', 'solved_by_everyone', 'not_solved_by_anyone'

  // Room & Comparison States
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomMembers, setRoomMembers] = useState([]); // [{ uid, displayName }]
  const [selectedCompareMemberId, setSelectedCompareMemberId] = useState('');
  const [membersProgress, setMembersProgress] = useState({}); // { memberId: { problemId: { solved: true/false } } }

  // Load user's rooms
  useEffect(() => {
    if (!user) return;
    const fetchRooms = async () => {
      try {
        const q = query(collection(db, 'rooms'), where('members', 'array-contains', user.uid));
        const snap = await getDocs(q);
        const roomsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRooms(roomsData);
        if (roomsData.length > 0) {
          setSelectedRoomId(roomsData[0].id);
        }
      } catch (err) {
        console.error("Failed to load rooms:", err);
      }
    };
    fetchRooms();
  }, [user]);

  // Sync Room Members and their progress in real-time
  useEffect(() => {
    if (!selectedRoomId || !user) {
      setRoomMembers([]);
      setMembersProgress({});
      return;
    }

    const roomRef = doc(db, 'rooms', selectedRoomId);
    
    // Listen to active room members list
    const unsubscribeRoom = onSnapshot(roomRef, async (roomSnap) => {
      if (!roomSnap.exists()) return;
      const roomData = roomSnap.data();
      const memberIds = roomData.members || [];

      // Fetch profile details for all members
      const membersList = [];
      const unsubscribesProgress = [];

      for (const mId of memberIds) {
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', mId)));
        const name = userSnap.empty ? 'Explorer' : userSnap.docs[0].data().displayName;
        membersList.push({ uid: mId, displayName: name });

        // Set up real-time listener for each member's progress subcollection
        const progRef = collection(db, 'user_progress', mId, 'problems');
        const unsubProg = onSnapshot(progRef, (progSnap) => {
          const userProg = {};
          progSnap.forEach((doc) => {
            userProg[doc.id] = doc.data();
          });
          setMembersProgress((prev) => ({
            ...prev,
            [mId]: userProg
          }));
        });
        unsubscribesProgress.push(unsubProg);
      }

      setRoomMembers(membersList);
      
      // Auto-select first member that isn't me to compare with
      const firstFriend = membersList.find(m => m.uid !== user.uid);
      if (firstFriend) {
        setSelectedCompareMemberId(firstFriend.uid);
      }

      return () => {
        unsubscribesProgress.forEach(unsub => unsub());
      };
    });

    return () => unsubscribeRoom();
  }, [selectedRoomId, user]);

  const handleCheckboxToggle = async (problemId, currentSolvedState) => {
    try {
      await toggleProblemSolved(problemId, !currentSolvedState);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering Logic
  const filteredProblems = allProblems.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === 'All' || p.topicId === selectedTopic;
    const matchesDifficulty = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;

    // Advanced comparison filters
    let matchesComparison = true;
    if (selectedRoomId) {
      const isSolvedByMe = !!myProgress[p.id]?.solved;

      if (comparisonFilter === 'solved_by_me') {
        matchesComparison = isSolvedByMe;
      } else if (comparisonFilter === 'solved_by_friend' && selectedCompareMemberId) {
        const isSolvedByFriend = !!membersProgress[selectedCompareMemberId]?.[p.id]?.solved;
        matchesComparison = isSolvedByFriend;
      } else if (comparisonFilter === 'solved_by_others_not_me') {
        const isSolvedByOthers = roomMembers.some(m => m.uid !== user?.uid && !!membersProgress[m.uid]?.[p.id]?.solved);
        matchesComparison = isSolvedByOthers && !isSolvedByMe;
      } else if (comparisonFilter === 'solved_by_everyone') {
        matchesComparison = roomMembers.every(m => {
          const state = m.uid === user?.uid ? myProgress : membersProgress[m.uid];
          return !!state?.[p.id]?.solved;
        });
      } else if (comparisonFilter === 'not_solved_by_anyone') {
        matchesComparison = roomMembers.every(m => {
          const state = m.uid === user?.uid ? myProgress : membersProgress[m.uid];
          return !state?.[p.id]?.solved;
        });
      }
    }

    return matchesSearch && matchesTopic && matchesDifficulty && matchesComparison;
  });

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Problems Sheet
            </h1>
            <p className="text-text-muted text-sm mt-1">Spreadsheet checklist for tracking and friend comparisons.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Room Selector */}
            <div className="flex items-center space-x-2 bg-white/5 border border-card-border rounded-xl px-3 py-2">
              <Users size={16} className="text-primary" />
              <select
                className="bg-transparent text-sm text-text-base font-bold focus:outline-none cursor-pointer"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="">No Active Room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Friend Comparison Dropdown */}
            {selectedRoomId && (
              <div className="flex items-center space-x-2 bg-white/5 border border-card-border rounded-xl px-3 py-2">
                <Sword size={16} className="text-secondary" />
                <span className="text-xs text-text-muted font-bold whitespace-nowrap">View Progress Of:</span>
                <select
                  className="bg-transparent text-sm text-text-base font-bold focus:outline-none cursor-pointer"
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
            {selectedRoomId && (
              <div className="flex items-center space-x-1.5 bg-white/5 border border-card-border rounded-xl px-3 py-1.5 text-xs font-semibold text-text-muted">
                <Sword size={14} className="text-primary" />
                <select
                  className="bg-transparent focus:outline-none cursor-pointer"
                  value={comparisonFilter}
                  onChange={(e) => setComparisonFilter(e.target.value)}
                >
                  <option value="All">All Comparisons</option>
                  <option value="solved_by_me">Solved By Me</option>
                  {selectedCompareMemberId && (
                    <option value="solved_by_friend">
                      Solved By {roomMembers.find(m => m.uid === selectedCompareMemberId)?.displayName || 'Friend'}
                    </option>
                  )}
                  <option value="solved_by_others_not_me">Solved By Others, Not Me</option>
                  <option value="solved_by_everyone">Solved By Everyone</option>
                  <option value="not_solved_by_anyone">Not Solved By Anyone</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Spreadsheet Checkbox Grid */}
        <div className="glass rounded-3xl overflow-hidden border border-card-border shadow-md">
          {myProgressLoading ? (
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
                    <th className="py-4 px-6 w-3/5">Problem Name</th>
                    <th className="py-4 px-6 w-1/5">Difficulty</th>
                    <th className="py-4 px-6 text-center w-1/10">Me</th>
                    {selectedRoomId && selectedCompareMemberId && (
                      <th className="py-4 px-6 text-center w-1/10 truncate max-w-[120px]">
                        {roomMembers.find(m => m.uid === selectedCompareMemberId)?.displayName || 'Friend'}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {filteredProblems.map((p) => {
                    const isSolvedByMe = !!myProgress[p.id]?.solved;
                    const isSolvedByFriend = selectedCompareMemberId && !!membersProgress[selectedCompareMemberId]?.[p.id]?.solved;
                    
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

                        {/* Read-only Checkbox for Selected Friend */}
                        {selectedRoomId && selectedCompareMemberId && (
                          <td className="py-4 px-6 text-center text-lg">
                            {isSolvedByFriend ? (
                              <span className="text-green-500" title="Solved">✅</span>
                            ) : (
                              <span className="text-text-muted opacity-30" title="Not Solved">❌</span>
                            )}
                          </td>
                        )}

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
