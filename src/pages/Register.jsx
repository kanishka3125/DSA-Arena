import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await register(email, password, username, displayName);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create an account. ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-bg-base text-text-base relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass max-w-md w-full p-8 rounded-2xl shadow-2xl z-10 border border-card-border"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-white text-3xl shadow-lg mb-4">
            D
          </div>
          <h2 className="text-3xl font-bold text-text-base text-center">Join Arena</h2>
          <p className="text-text-muted mt-2">Start your DSA journey today</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm break-words">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-card-border text-text-base focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-card-border text-text-base focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="johndoe99"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-card-border text-text-base focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Password</label>
            <input
              type="password"
              required
              minLength="6"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-card-border text-text-base focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 px-4 mt-6 btn-primary rounded-lg font-semibold shadow-lg transition-all disabled:opacity-70 flex justify-center items-center space-x-2"
          >
            <UserPlus size={20} />
            <span>{loading ? 'Creating account...' : 'Sign Up'}</span>
          </button>
        </form>

        <div className="mt-6 text-center text-text-muted text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-secondary font-medium">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
