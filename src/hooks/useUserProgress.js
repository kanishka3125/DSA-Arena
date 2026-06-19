import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export function useUserProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProgress({});
      setLoading(false);
      return;
    }

    const progressRef = collection(db, 'user_progress', user.uid, 'problems');
    
    // Listen to user progress subcollection in real-time
    const unsubscribe = onSnapshot(progressRef, (snapshot) => {
      const progressData = {};
      snapshot.forEach((doc) => {
        progressData[doc.id] = doc.data();
      });
      setProgress(progressData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching progress: ", error);
      setProgress({});
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Simplify: Only toggles solved (boolean)
  const toggleProblemSolved = async (problemId, isSolved) => {
    if (!user) return;

    const problemRef = doc(db, 'user_progress', user.uid, 'problems', problemId);
    const activityRef = doc(collection(db, 'activity_logs'));
    const userRef = doc(db, 'users', user.uid);

    try {
      const batch = writeBatch(db);
      
      // Update solve status
      batch.set(problemRef, {
        solved: isSolved,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      // Update user doc stats.totalSolved count
      batch.update(userRef, {
        'stats.totalSolved': increment(isSolved ? 1 : -1)
      });

      // Log activity if checked solved
      if (isSolved) {
        const today = new Date().toISOString().split('T')[0];
        batch.set(activityRef, {
          userId: user.uid,
          problemId,
          date: today,
          action: 'Solved',
          timestamp: serverTimestamp()
        });
      }

      await batch.commit();
    } catch (error) {
      console.error("Failed to toggle solve state: ", error);
      throw error;
    }
  };

  const getStats = () => {
    const totalProblems = 479;
    let solvedCount = 0;

    Object.values(progress).forEach((data) => {
      if (data.solved) {
        solvedCount++;
      }
    });

    const completionPercentage = totalProblems > 0 ? Math.round((solvedCount / totalProblems) * 100) : 0;
    
    // 100 XP per solved problem
    const totalXp = solvedCount * 100;
    const xpPerLevel = 1000;
    const level = Math.floor(totalXp / xpPerLevel) + 1;
    const currentXp = totalXp % xpPerLevel;

    return {
      solvedCount,
      completionPercentage,
      totalXp,
      level,
      currentXp,
      xpNeeded: xpPerLevel
    };
  };

  return {
    progress,
    loading,
    toggleProblemSolved,
    stats: getStats()
  };
}
