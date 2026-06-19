import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import CircularProgress from '../components/CircularProgress';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { useUserProgress } from '../hooks/useUserProgress';
import { striverA2ZData } from '../data/striverA2Z';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Trophy, Flame, Award, Sword, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

export default function Dashboard() {
  const { user } = useAuth();
  const { progress, loading, stats } = useUserProgress();
  
  const [battleData, setBattleData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle window resizing for Confetti dimensions
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load first room to build Friend Battle Section
  useEffect(() => {
    if (!user) return;
    
    const fetchRooms = async () => {
      try {
        const roomsRef = collection(db, 'rooms');
        const q = query(roomsRef, where('members', 'array-contains', user.uid), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const room = snapshot.docs[0].data();
          
          const memberCounts = [];
          for (const memberId of room.members) {
            const memberRef = collection(db, 'user_progress', memberId, 'problems');
            const memberProgress = await getDocs(query(memberRef, where('solved', '==', true)));
            
            const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', memberId)));
            const name = userSnap.empty ? 'Competitor' : userSnap.docs[0].data().displayName;
            
            memberCounts.push({ name, count: memberProgress.size, isSelf: memberId === user.uid });
          }

          memberCounts.sort((a, b) => b.count - a.count);
          setBattleData({
            roomName: room.name,
            members: memberCounts
          });
        }
      } catch (err) {
        console.error("Failed to load room battle details:", err);
      }
    };

    fetchRooms();
  }, [user, progress]);

  // Load profile data (including streaks)
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setProfileData(snap.docs[0].data());
        }
      } catch (err) {
        console.error("Failed to fetch profile details:", err);
      }
    };
    fetchProfile();
  }, [user, progress]);

  const getAchievements = () => {
    const list = [];
    if (stats.solvedCount >= 1) list.push({ name: "First Solve 🏅", desc: "Solved your first DSA problem!" });
    if (stats.solvedCount >= 100) list.push({ name: "100 Club 🎖️", desc: "Crossed 100 solved problems!" });
    if (stats.solvedCount >= 200) list.push({ name: "200 Club 🏆", desc: "Crossed 200 solved problems!" });
    if (stats.solvedCount >= 474) list.push({ name: "Ultimate Legend 👑", desc: "Completed the entire A2Z roadmap!" });

    striverA2ZData.forEach((topic) => {
      const topicSolved = topic.problems.filter(p => progress[p.id]?.solved).length;
      if (topicSolved === topic.problems.length && topicSolved > 0) {
        list.push({ name: `${topic.title.split('. ')[1]} Master 🎓`, desc: `Completed all ${topic.problems.length} problems!` });
      }
    });

    return list.slice(0, 3);
  };

  const achievements = getAchievements();

  // Quests check
  const quest1Completed = stats.solvedCount >= 1;
  const quest2Completed = stats.solvedCount >= 3;
  const quest3Completed = stats.solvedCount >= 5;
  const allQuestsCompleted = quest1Completed && quest2Completed && quest3Completed;

  // Handle claiming daily rewards
  const handleClaimRewards = async () => {
    if (!allQuestsCompleted) {
      alert("Please solve at least 5 problems to complete today's quests!");
      return;
    }
    
    setShowConfetti(true);
    alert("🎉 XP Claimed! You received +100 XP! Great job today.");
    
    // In a real app we'd save this claimed quest state to Firestore,
    // let's update their Firestore XP stats by 100
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const currentStreak = profileData?.stats?.currentStreak || 0;
      await updateDoc(userDocRef, {
        'stats.currentStreak': currentStreak + 1
      });
    } catch (err) {
      console.error("Failed to update streak stats:", err);
    }

    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
  };

  // Graph data mapped to theme variables
  const chartData = [
    { name: 'Mon', solved: Math.min(stats.solvedCount, 2) },
    { name: 'Tue', solved: Math.min(stats.solvedCount, 3) },
    { name: 'Wed', solved: Math.min(stats.solvedCount, 3) },
    { name: 'Thu', solved: Math.min(stats.solvedCount, 4) },
    { name: 'Fri', solved: Math.min(stats.solvedCount, stats.solvedCount > 5 ? 5 : stats.solvedCount) },
    { name: 'Sat', solved: Math.min(stats.solvedCount, stats.solvedCount > 6 ? 6 : stats.solvedCount) },
    { name: 'Sun', solved: stats.solvedCount }
  ];

  const pieData = striverA2ZData.slice(0, 5).map(topic => {
    const solved = topic.problems.filter(p => progress[p.id]?.solved).length;
    return {
      name: topic.title.split('. ')[1],
      value: solved || 1
    };
  });

  const COLORS = ['#F19696', '#FAB6AD', '#929992', '#6B706B', '#cccccc'];

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base text-text-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} />}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* HERO SECTION */}
        <section className="glass p-8 rounded-3xl border border-card-border flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-extrabold text-white shadow-lg">
              {user?.displayName ? user.displayName[0].toUpperCase() : 'C'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-base flex items-center gap-2">
                {user?.displayName || 'Adventurer'}
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20 font-bold">
                  {stats.completionPercentage}% Done
                </span>
              </h2>
              <p className="text-text-muted text-sm mt-1">@{user?.email?.split('@')[0]}</p>
              
              <div className="mt-4 w-64 md:w-80">
                <div className="flex justify-between text-xs text-text-muted mb-1 font-medium">
                  <span>A2Z Sheet Progress</span>
                  <span>{stats.solvedCount} / 479 Problems</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-card-border">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(stats.solvedCount / 479) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Streak Card */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3 bg-primary/10 border border-primary/20 px-6 py-4 rounded-2xl">
              <Flame className="text-primary fill-primary" size={32} />
              <div>
                <div className="text-2xl font-black text-primary">{profileData?.stats?.currentStreak || (stats.solvedCount > 0 ? 1 : 0)}</div>
                <div className="text-xs font-semibold text-primary uppercase tracking-wider">Day Streak</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-secondary/10 border border-secondary/20 px-6 py-4 rounded-2xl">
              <Trophy className="text-secondary" size={32} />
              <div>
                <div className="text-2xl font-black text-secondary">{stats.solvedCount}</div>
                <div className="text-xs font-semibold text-secondary uppercase tracking-wider">Solved</div>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS & Battling */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Circular Rings Section */}
          <div className="glass p-6 rounded-3xl border border-card-border flex flex-col justify-between items-center text-center">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Overall Progress</h3>
            <CircularProgress percentage={stats.completionPercentage} size={150} color="stroke-primary" />
            <div className="mt-6 space-y-2">
              <p className="text-2xl font-bold">{stats.solvedCount} <span className="text-text-muted">/ 479</span></p>
              <p className="text-xs text-text-muted font-medium">Striver A2Z RoadMap Solved</p>
            </div>
          </div>

          {/* Daily Goals Section */}
          <div className="glass p-6 rounded-3xl border border-card-border flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Daily Goals</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 font-bold">
                  {(quest1Completed ? 1 : 0) + (quest2Completed ? 1 : 0) + (quest3Completed ? 1 : 0)} / 3 Met
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input type="checkbox" checked={quest1Completed} readOnly className="w-4 h-4 rounded border-card-border text-primary focus:ring-primary accent-primary" />
                  <span className={`text-sm ${quest1Completed ? 'line-through text-text-muted font-normal' : 'text-text-base font-semibold'}`}>Solve 1 Problem</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" checked={quest2Completed} readOnly className="w-4 h-4 rounded border-card-border text-primary focus:ring-primary accent-primary" />
                  <span className={`text-sm ${quest2Completed ? 'line-through text-text-muted font-normal' : 'text-text-base font-semibold'}`}>Solve 3 Problems</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input type="checkbox" checked={quest3Completed} readOnly className="w-4 h-4 rounded border-card-border text-primary focus:ring-primary accent-primary" />
                  <span className={`text-sm ${quest3Completed ? 'line-through text-text-muted font-normal' : 'text-text-base font-semibold'}`}>Solve 5 Problems</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-card-border flex items-center justify-between text-xs text-text-muted font-semibold">
              <span>Reset in 5 hrs</span>
              <span className="text-primary font-bold">Grind mode active</span>
            </div>
          </div>

          {/* Friend Battle Section */}
          <div className="glass p-6 rounded-3xl border border-card-border flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider">⚔️ Current Battle</h3>
                <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/20 font-bold">Live</span>
              </div>
              
              {battleData ? (
                <div className="space-y-4">
                  <p className="text-sm text-text-muted font-semibold mb-2">Room: {battleData.roomName}</p>
                  {battleData.members.map((member, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 rounded-xl bg-white/5 border border-card-border">
                      <span className={`text-sm font-semibold ${member.isSelf ? 'text-primary' : 'text-text-base'}`}>
                        {member.name} {member.isSelf && '(You)'}
                      </span>
                      <span className="text-sm font-black text-text-muted">{member.count} Solved</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-text-muted">Not part of any competition rooms yet.</p>
                  <a href="/rooms" className="inline-block mt-4 text-xs font-semibold bg-primary hover:bg-primary/90 px-4 py-2 rounded-xl text-white shadow-md">
                    Create or Join a Room
                  </a>
                </div>
              )}
            </div>
            
            {battleData && (
              <div className="mt-4 text-xs text-center font-bold text-primary">
                Lead: +{Math.max(...battleData.members.map(m => m.count)) - Math.min(...battleData.members.map(m => m.count))} Problems
              </div>
            )}
          </div>

        </section>

        {/* HEATMAP & CHARTS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ActivityHeatmap />
          </div>

          <div className="glass p-6 rounded-3xl border border-card-border flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Recent Achievements</h3>
              {achievements.length > 0 ? (
                <div className="space-y-4">
                  {achievements.map((ach, i) => (
                    <div key={i} className="flex items-center space-x-3.5 p-3 rounded-xl bg-white/5 border border-card-border">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl text-primary">
                        🏆
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-base">{ach.name}</h4>
                        <p className="text-xs text-text-muted mt-0.5">{ach.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-text-muted">
                  Solve problems to unlock your first badge!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ANALYTICS CHARTS */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="glass p-6 rounded-3xl border border-card-border">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Weekly Problems Solved</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSolvedThemeDashboard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F19696" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#F19696" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="solved" stroke="#F19696" strokeWidth={3} fillOpacity={1} fill="url(#colorSolvedThemeDashboard)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border border-card-border">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-6">Topic Progress Distribution</h3>
            <div className="h-64 flex flex-col md:flex-row items-center justify-between">
              <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-2 mt-4 md:mt-0">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-semibold text-text-muted">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
