import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function ActivityHeatmap() {
  const { user } = useAuth();
  const [activity, setActivity] = useState({});

  useEffect(() => {
    if (!user) return;

    const fetchActivityLogs = async () => {
      try {
        const logsRef = collection(db, 'activity_logs');
        const q = query(logsRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        
        const counts = {};
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const dateStr = data.date; // YYYY-MM-DD
          counts[dateStr] = (counts[dateStr] || 0) + 1;
        });
        setActivity(counts);
      } catch (err) {
        console.error("Failed to load activity logs:", err);
      }
    };

    fetchActivityLogs();
  }, [user]);

  // Generate grid dates (last 16 weeks)
  const columns = 16;
  const daysInGrid = columns * 7;
  const gridCells = [];
  
  const today = new Date();
  // Start from the Sunday of 16 weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysInGrid + (7 - today.getDay() - 1));

  for (let i = 0; i < daysInGrid; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    const count = activity[dateString] || 0;
    gridCells.push({ date: dateString, count });
  }

  // Helper to color cells based on solves count
  const getCellColor = (count) => {
    if (count === 0) return 'bg-white/5 border border-white/5';
    if (count <= 2) return 'bg-cyan-950/60 border border-cyan-800/30 text-cyan-400';
    if (count <= 5) return 'bg-cyan-800/70 border border-cyan-600/40 text-cyan-200';
    return 'bg-cyan-500/90 border border-cyan-300/50 text-white shadow-glow';
  };

  return (
    <div className="glass p-6 rounded-2xl border border-white/10 w-full overflow-hidden">
      <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Activity Heatmap</h3>
      
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide py-2">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 mx-auto">
          {gridCells.map((cell, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.2, zIndex: 10 }}
              className={`w-3.5 h-3.5 rounded-sm transition-colors cursor-pointer ${getCellColor(cell.count)}`}
              title={`${cell.count} solved on ${cell.date}`}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500 mt-4 px-2">
        <span>16 Weeks Ago</span>
        <div className="flex items-center space-x-1.5">
          <span>Less</span>
          <span className="w-3.5 h-3.5 rounded-sm bg-white/5 border border-white/5" />
          <span className="w-3.5 h-3.5 rounded-sm bg-cyan-950/60 border border-cyan-800/30" />
          <span className="w-3.5 h-3.5 rounded-sm bg-cyan-800/70 border border-cyan-600/40" />
          <span className="w-3.5 h-3.5 rounded-sm bg-cyan-500/90 border border-cyan-300/50 shadow-glow" />
          <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
}
