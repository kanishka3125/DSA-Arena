import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { Trophy, Flame, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';

export default function Leaderboard() {
  const { user } = useAuth();
  const { stats: myStats } = useUserProgress();
  const mySolved = myStats?.solvedCount || 0;

  const [usersList, setUsersList] = useState([]);
  const [filterType, setFilterType] = useState('global'); // 'global', 'weekly', 'monthly', 'room'
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch all users sorted by totalSolved count
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        let q = query(usersRef, orderBy('stats.totalSolved', 'desc'), limit(50));
        
        if (filterType === 'weekly' || filterType === 'monthly') {
          // Time-based filtering (simulated progress sorting based on actual total solved)
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => {
            const u = doc.data();
            const solved = u.stats?.totalSolved || 0;
            const streak = u.stats?.currentStreak || 0;
            return {
              ...u,
              displaySolved: solved,
              streak
            };
          });
          data.sort((a, b) => b.displaySolved - a.displaySolved);
          setUsersList(data);
        } else if (filterType === 'room' && selectedRoomId) {
          // Room filter
          const roomsRef = collection(db, 'rooms');
          const roomSnap = await getDocs(query(roomsRef, where('inviteCode', '==', selectedRoomId)));
          if (!roomSnap.empty) {
            const roomData = roomSnap.docs[0].data();
            const members = roomData.members || [];
            if (members.length > 0) {
              const membersSnap = await getDocs(query(usersRef, where('uid', 'in', members)));
              const data = membersSnap.docs.map(doc => {
                const u = doc.data();
                return {
                  ...u,
                  displaySolved: u.stats?.totalSolved || 0,
                  streak: u.stats?.currentStreak || 0
                };
              });
              data.sort((a, b) => b.displaySolved - a.displaySolved);
              setUsersList(data);
            } else {
              setUsersList([]);
            }
          } else {
            setUsersList([]);
          }
        } else {
          // Global
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => {
            const u = doc.data();
            return {
              ...u,
              displaySolved: u.stats?.totalSolved || 0,
              streak: u.stats?.currentStreak || 0
            };
          });
          setUsersList(data);
        }
      } catch (err) {
        console.error("Failed to load leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [filterType, selectedRoomId]);

  const leaderSolved = usersList[0]?.displaySolved || 0;
  const leaderIsMe = usersList[0]?.uid === user?.uid;

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Arena Leaderboards
            </h1>
            <p className="text-text-muted text-sm mt-1">Focused purely on actual DSA problem solving progress.</p>
          </div>

          {/* Filters toggle */}
          <div className="flex bg-white/5 border border-card-border p-1 rounded-2xl">
            {['global', 'weekly', 'monthly', 'room'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                  filterType === type 
                    ? 'bg-primary text-white shadow-md' 
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Room selector if Room Filter is selected */}
        {filterType === 'room' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 rounded-2xl flex items-center justify-between"
          >
            <span className="text-sm font-semibold text-text-muted">Enter Room Invite Code to filter:</span>
            <input
              type="text"
              placeholder="e.g. ROOM-1234"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value.toUpperCase())}
              className="px-4 py-2 rounded-xl bg-white/5 border border-card-border focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono text-text-base"
            />
          </motion.div>
        )}

        {/* Summary Card */}
        {!loading && usersList.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-6 rounded-3xl border border-card-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 shadow-sm"
          >
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Current Leader</span>
              <span className="text-lg font-extrabold mt-1 text-primary flex items-center gap-1.5 truncate">
                👑 {usersList[0]?.displayName}
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Problems Solved</span>
              <span className="text-lg font-black mt-1 text-text-base">
                {usersList[0]?.displaySolved} <span className="text-xs text-text-muted font-semibold">/ 479</span>
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Who is Ahead</span>
              <span className="text-sm font-bold mt-1 text-text-base truncate">
                {leaderIsMe ? "🏆 You are in the lead!" : `👤 ${usersList[0]?.displayName}`}
              </span>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Difference</span>
              <span className="text-sm font-bold mt-1 text-text-base">
                {leaderIsMe 
                  ? (usersList.length > 1 ? `You lead by ${usersList[0].displaySolved - usersList[1].displaySolved} problems` : "No competitors yet")
                  : `${usersList[0]?.displayName} leads by ${usersList[0].displaySolved - mySolved} problems`
                }
              </span>
            </div>
          </motion.div>
        )}

        {/* Leaderboard Table list */}
        <div className="glass rounded-3xl overflow-hidden shadow-md">
          {loading ? (
            <div className="p-12 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 w-full bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : usersList.length === 0 ? (
            <div className="p-12 text-center text-text-muted">
              {filterType === 'room' && !selectedRoomId 
                ? 'Please specify a room code above.' 
                : 'No users found matching criteria.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-card-border bg-white/5 text-xs font-bold text-text-muted uppercase tracking-wider">
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6 text-center">Problems Solved</th>
                    <th className="py-4 px-6 text-center">Completion %</th>
                    <th className="py-4 px-6 text-center">Current Streak</th>
                    <th className="py-4 px-6 text-center">Lead Difference</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {usersList.map((u, index) => {
                    const isRank1 = index === 0;
                    const leadDiff = u.displaySolved - leaderSolved;
                    const completionPct = ((u.displaySolved / 479) * 100).toFixed(1);
                    
                    return (
                      <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                        {/* Rank */}
                        <td className="py-4 px-6 text-center font-black text-sm">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </td>
                        
                        {/* User Profile */}
                        <td className="py-4 px-6 flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary/30 to-secondary/30 flex items-center justify-center font-bold text-primary">
                            {u.displayName?.[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-text-base">{u.displayName}</div>
                            <div className="text-xs text-text-muted">@{u.username || 'username'}</div>
                          </div>
                        </td>

                        {/* Problems Solved */}
                        <td className="py-4 px-6 text-center font-black text-sm text-text-base">
                          {u.displaySolved}
                        </td>

                        {/* Completion % */}
                        <td className="py-4 px-6 text-center font-mono text-sm text-text-muted font-bold">
                          {completionPct}%
                        </td>

                        {/* Current Streak */}
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <Flame size={16} className="text-orange-500 fill-orange-500" />
                            <span className="text-sm font-bold text-orange-400">{u.streak || 0}</span>
                          </div>
                        </td>

                        {/* Lead Difference */}
                        <td className="py-4 px-6 text-center font-mono text-sm font-semibold">
                          {isRank1 ? (
                            <span className="text-primary text-xs font-bold uppercase tracking-wider">Leader</span>
                          ) : (
                            <span className="text-text-muted">
                              ({leadDiff})
                            </span>
                          )}
                        </td>

                        {/* Action: View Progress Button */}
                        <td className="py-4 px-6 text-center">
                          <Link 
                            to={`/compare/${u.uid}`}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>View Progress</span>
                          </Link>
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
