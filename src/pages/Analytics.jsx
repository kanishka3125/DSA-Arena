import React from 'react';
import Navbar from '../components/Navbar';
import ActivityHeatmap from '../components/ActivityHeatmap';
import { useUserProgress } from '../hooks/useUserProgress';
import { striverA2ZData, getFlatProblems } from '../data/striverA2Z';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Trophy, Flame, HelpCircle, BarChart3, CheckSquare } from 'lucide-react';

export default function Analytics() {
  const { progress, stats, loading } = useUserProgress();
  const allProblems = getFlatProblems();

  // Dynamic calculations based on user progress data
  const getDifficultyData = () => {
    let easyTotal = 0, medTotal = 0, hardTotal = 0;
    let easySolved = 0, medSolved = 0, hardSolved = 0;

    allProblems.forEach((p) => {
      const prog = progress[p.id] || {};
      const isSolved = !!prog.solved;

      if (p.difficulty === 'Easy') {
        easyTotal++;
        if (isSolved) easySolved++;
      } else if (p.difficulty === 'Medium') {
        medTotal++;
        if (isSolved) medSolved++;
      } else if (p.difficulty === 'Hard') {
        hardTotal++;
        if (isSolved) hardSolved++;
      }
    });

    return [
      { name: 'Easy', solved: easySolved, total: easyTotal, color: '#10b981' },
      { name: 'Medium', solved: medSolved, total: medTotal, color: '#f59e0b' },
      { name: 'Hard', solved: hardSolved, total: hardTotal, color: '#ef4444' }
    ];
  };

  const difficultyData = getDifficultyData();

  // Topic progress calculations
  const topicBreakdown = striverA2ZData.map((topic) => {
    const total = topic.problems.length;
    const solved = topic.problems.filter((p) => progress[p.id]?.solved).length;
    return {
      name: topic.title.split('. ')[1],
      solved,
      total,
      percentage: total > 0 ? Math.round((solved / total) * 100) : 0
    };
  }).filter(t => t.solved > 0); // Display active topics

  // Charts colors
  const COLORS = ['#F19696', '#FAB6AD', '#929992', '#6B706B', '#3b82f6'];

  // Mock Solved Trend Line Data (simulates daily incremental increase)
  const trendData = [
    { date: 'Mon', solved: Math.max(0, stats.solvedCount - 4) },
    { date: 'Tue', solved: Math.max(0, stats.solvedCount - 3) },
    { date: 'Wed', solved: Math.max(0, stats.solvedCount - 3) },
    { date: 'Thu', solved: Math.max(0, stats.solvedCount - 2) },
    { date: 'Fri', solved: Math.max(0, stats.solvedCount - 1) },
    { date: 'Sat', solved: Math.max(0, stats.solvedCount - 1) },
    { date: 'Sun', solved: stats.solvedCount }
  ];

  // Mock Streak History Line Chart
  const streakHistoryData = [
    { week: 'Wk 1', streak: stats.solvedCount > 0 ? 3 : 0 },
    { week: 'Wk 2', streak: stats.solvedCount > 5 ? 5 : 0 },
    { week: 'Wk 3', streak: stats.solvedCount > 10 ? 8 : 0 },
    { week: 'Wk 4', streak: stats.solvedCount > 20 ? 12 : 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base text-text-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Visual Progress Analytics
          </h1>
          <p className="text-text-muted text-sm mt-1">Real-time statistics mapping your problem-solving milestones.</p>
        </div>

        {/* Dynamic Activity Heatmap */}
        <section>
          <ActivityHeatmap />
        </section>

        {/* Breakdown details */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Difficulty breakdown widgets */}
          {difficultyData.map((diff) => (
            <div key={diff.name} className="glass p-6 rounded-3xl border border-card-border flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">{diff.name} Difficulty</h4>
                <div className="text-3xl font-black mt-2" style={{ color: diff.color }}>
                  {diff.solved} <span className="text-text-muted text-sm font-semibold">/ {diff.total}</span>
                </div>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mt-6 border border-card-border">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(diff.solved / (diff.total || 1)) * 100}%`, backgroundColor: diff.color }}
                />
              </div>
            </div>
          ))}

        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Line Chart: Solved Trend */}
          <div className="glass p-6 rounded-3xl border border-card-border">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Problems Solved Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSolvedTheme" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F19696" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#F19696" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#929992" fontSize={11} />
                  <YAxis stroke="#929992" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="solved" stroke="#F19696" strokeWidth={3} fillOpacity={1} fill="url(#colorSolvedTheme)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: Topic Completion */}
          <div className="glass p-6 rounded-3xl border border-card-border">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Active Topics Solved Count</h3>
            <div className="h-64">
              {topicBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-text-muted">
                  Solve problems in topics to see breakdown statistics.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicBreakdown}>
                    <XAxis dataKey="name" stroke="#929992" fontSize={10} tickFormatter={(str) => str.slice(0, 10)} />
                    <YAxis stroke="#929992" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
                    <Bar dataKey="solved" fill="#FAB6AD" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Line Chart: Streak History */}
          <div className="glass p-6 rounded-3xl border border-card-border">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Streak History Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={streakHistoryData}>
                  <XAxis dataKey="week" stroke="#929992" fontSize={11} />
                  <YAxis stroke="#929992" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="streak" stroke="#929992" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Doughnut Chart: Distribution */}
          <div className="glass p-6 rounded-3xl border border-card-border">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Active Solves Distribution</h3>
            <div className="h-64 flex flex-col md:flex-row items-center justify-between">
              <div className="w-full md:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={difficultyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="solved"
                    >
                      {difficultyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3 mt-4 md:mt-0">
                {difficultyData.map((diff, index) => (
                  <div key={diff.name} className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-card-border">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: diff.color }} />
                      <span className="text-xs font-bold text-text-base">{diff.name}</span>
                    </div>
                    <span className="text-xs font-black text-text-muted">{diff.solved} Solved</span>
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
