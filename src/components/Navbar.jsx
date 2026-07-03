import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { LogOut, LayoutDashboard, Trophy, Users, BarChart3, User, BookOpen, Sword } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center mb-8 shadow-md">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white shadow-lg">
          D
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          DSA Arena
        </span>
      </div>

      <div className="flex items-center space-x-6 text-sm font-medium">
        <Link to="/dashboard" className="flex items-center space-x-1 text-text-muted hover:text-text-base transition-colors">
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        <Link to="/problems" className="flex items-center space-x-1 text-text-muted hover:text-text-base transition-colors">
          <BookOpen size={18} />
          <span>Problems</span>
        </Link>
        <Link to="/leaderboard" className="flex items-center space-x-1 text-text-muted hover:text-text-base transition-colors">
          <Trophy size={18} />
          <span>Leaderboard</span>
        </Link>
        <Link to="/friends" className="flex items-center space-x-1 text-text-muted hover:text-text-base transition-colors">
          <Users size={18} />
          <span>Friends</span>
        </Link>
        <Link to="/rooms" className="flex items-center space-x-1 text-text-muted hover:text-text-base transition-colors">
          <Sword size={18} />
          <span>Rooms</span>
        </Link>
        <Link to="/analytics" className="flex items-center space-x-1 text-text-muted hover:text-text-base transition-colors">
          <BarChart3 size={18} />
          <span>Analytics</span>
        </Link>
        <Link to="/profile" className="flex items-center space-x-1 text-text-muted hover:text-text-base transition-colors">
          <User size={18} />
          <span>Profile</span>
        </Link>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-sm hidden md:block">
          <span className="text-text-muted">Welcome, </span>
          <span className="font-semibold text-text-base">{user.displayName || 'User'}</span>
        </div>
        
        <ThemeToggle />

        <button
          onClick={handleLogout}
          className="flex items-center space-x-1 text-text-muted hover:text-red-400 p-2 rounded-xl bg-white/5 border border-card-border hover:bg-white/10 transition-colors"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
