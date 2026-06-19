import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (isResetMode) {
      try {
        setLoading(true);
        await resetPassword(email);
        setMessage('Password reset link sent! Check your inbox.');
      } catch (err) {
        setError('Failed to send reset link. Make sure the email is registered.');
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass max-w-md w-full p-8 rounded-2xl shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center font-bold text-white text-3xl shadow-lg mb-4">
            D
          </div>
          <h2 className="text-3xl font-bold text-white text-center">
            {isResetMode ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400 mt-2">
            {isResetMode ? 'Enter your email to receive a reset link' : 'Login to track your DSA progress'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!isResetMode && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError('');
                    setMessage('');
                  }}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-semibold shadow-lg transition-all disabled:opacity-70 flex justify-center items-center space-x-2 cursor-pointer text-sm"
          >
            <LogIn size={18} />
            <span>{loading ? (isResetMode ? 'Sending...' : 'Signing in...') : (isResetMode ? 'Send Reset Link' : 'Sign In')}</span>
          </button>
        </form>

        {isResetMode && (
          <div className="mt-6 text-center text-gray-400 text-sm">
            <button
              onClick={() => {
                setIsResetMode(false);
                setError('');
                setMessage('');
              }}
              className="text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {!isResetMode && (
          <div className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign up
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
