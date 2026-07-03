import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AnimatePresence } from 'framer-motion';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Problems from './pages/Problems';
import Leaderboard from './pages/Leaderboard';
import Friends from './pages/Friends';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Rooms from './pages/Rooms';
import Compare from './pages/Compare';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/problems" 
          element={
            <ProtectedRoute>
              <Problems />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/leaderboard" 
          element={
            <ProtectedRoute>
              <Leaderboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/compare/:compareUserId" 
          element={
            <ProtectedRoute>
              <Compare />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/friends" 
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/rooms" 
          element={
            <ProtectedRoute>
              <Rooms />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AnimatedRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
