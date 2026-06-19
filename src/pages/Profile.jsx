import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useUserProgress } from '../hooks/useUserProgress';
import { db, auth } from '../firebase';
import { updatePassword, deleteUser, sendPasswordResetEmail, updateProfile as updateAuthProfile } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDocs, writeBatch, collection, query, where, deleteDoc } from 'firebase/firestore';
import { User, ShieldAlert, Key, Trash2, Mail, Award, Flame, UserCog, Edit3, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
  const { user, logout } = useAuth();
  const { stats, progress } = useUserProgress();
  
  // Settings Tab/View state
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'settings'
  
  // Edit Profile States
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Change Password States
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete Account States
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load custom user details from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      const q = query(collection(db, 'users'), where('uid', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uData = snap.docs[0].data();
        setUsername(uData.username || '');
        setBio(uData.bio || 'Algorithm Explorer crafting optimal solutions.');
      }
    };
    fetchUserData();
  }, [user]);

  // Update Profile Logic
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    try {
      // 1. Update Auth DisplayName
      await updateAuthProfile(auth.currentUser, { displayName });
      
      // 2. Update Firestore User Doc
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName,
        username: username.toLowerCase().trim().replace(/\s/g, ''),
        bio
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Change Password Logic
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      await updatePassword(auth.currentUser, newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setPasswordError(err.message.includes('requires-recent-login') 
        ? 'Security re-authentication required. Please sign out and sign back in to change password.' 
        : 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Forgot Password / Password Reset Email trigger
  const handleResetPasswordEmail = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert(`Password reset email sent to ${user.email}`);
    } catch (err) {
      console.error(err);
      alert('Failed to send reset email.');
    }
  };

  // Permanently Delete Account Logic
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.email) {
      alert("Email mismatch. Deletion cancelled.");
      return;
    }
    setDeleteLoading(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete Firestore user document
      batch.delete(doc(db, 'users', user.uid));

      // 2. Sweep Firestore progress subcollection
      const progressRef = collection(db, 'user_progress', user.uid, 'problems');
      const progressDocs = await getDocs(progressRef);
      progressDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Sweep Firestore friend relationships
      const friendsRef = collection(db, 'friends', user.uid, 'user_friends');
      const friendsDocs = await getDocs(friendsRef);
      friendsDocs.forEach((doc) => {
        batch.delete(doc.ref);
        // Also delete the relationship in the other person's document
        batch.delete(doc(db, 'friends', doc.id, 'user_friends', user.uid));
      });

      await batch.commit();

      // 4. Delete Auth User Account
      await deleteUser(auth.currentUser);
      logout();
    } catch (err) {
      console.error(err);
      alert(err.message.includes('requires-recent-login')
        ? 'Deletion requires recent re-login. Please sign out and sign back in, then retry deletion.'
        : 'Failed to delete account.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Profile Tabs Toggle */}
        <div className="flex bg-white/5 border border-card-border p-1 rounded-2xl max-w-xs mx-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-base'
            }`}
          >
            Digital Gamer ID
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-base'
            }`}
          >
            Account Settings
          </button>
        </div>

        <AnimatePresence mode="wait">
          
          {/* DIGITAL GAMER ID TAB */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-center"
            >
              {/* Premium Gamer ID Card */}
              <div className="glass max-w-md w-full rounded-3xl overflow-hidden border border-card-border shadow-2xl relative">
                
                {/* ID Header Graphic Accent */}
                <div className="h-32 bg-gradient-to-r from-primary via-secondary to-accent relative flex items-end justify-center pb-4">
                  <div className="absolute top-4 left-6 text-white font-mono text-[10px] tracking-widest opacity-80 uppercase">
                    DSA Arena Access Card
                  </div>
                  <div className="w-20 h-20 rounded-2xl bg-bg-base border-4 border-card-border flex items-center justify-center font-black text-primary text-3xl shadow-lg translate-y-8">
                    {user?.displayName?.[0]?.toUpperCase() || 'P'}
                  </div>
                </div>

                <div className="pt-12 p-8 text-center space-y-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-text-base tracking-wide uppercase">{displayName || 'Explorer'}</h2>
                    <p className="text-xs text-text-muted mt-1">@{username || 'username'}</p>
                    <p className="text-xs text-text-muted mt-3 italic max-w-xs mx-auto px-4">"{bio}"</p>
                  </div>

                  <hr className="border-card-border" />

                  {/* Gamer Stats Dashboard */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-white/5 border border-card-border rounded-2xl">
                      <h4 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Level</h4>
                      <p className="text-lg font-black text-primary mt-0.5">{stats.level}</p>
                    </div>
                    <div className="p-3 bg-white/5 border border-card-border rounded-2xl">
                      <h4 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Solved</h4>
                      <p className="text-lg font-black text-text-base mt-0.5">{stats.solvedCount}</p>
                    </div>
                    <div className="p-3 bg-white/5 border border-card-border rounded-2xl">
                      <h4 className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Rank</h4>
                      <p className="text-lg font-black text-secondary mt-0.5">#1</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center space-x-2 text-xs text-text-muted font-semibold">
                      <Flame className="text-orange-500 fill-orange-500" size={16} />
                      <span>{stats.attemptedCount > 0 ? 1 : 0} Day Streak</span>
                    </div>
                    <div className="text-[10px] text-text-muted font-bold font-mono">
                      JOINED: {new Date(user?.metadata.creationTime).toLocaleDateString()}
                    </div>
                  </div>
                  
                </div>
              </div>
            </motion.div>
          )}

          {/* ACCOUNT SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              
              {/* Profile Details Edit */}
              <div className="glass p-6 rounded-3xl border border-card-border space-y-6">
                <h3 className="text-base font-bold flex items-center space-x-2">
                  <UserCog size={18} className="text-primary" />
                  <span>Update Profile Info</span>
                </h3>
                
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-text-base text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1.5">Unique Username</label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-text-base text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Bio Details</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full h-24 px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-text-base text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="btn-primary py-2 px-5 rounded-xl text-xs font-semibold shadow-md flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{profileSuccess ? 'Saved successfully!' : 'Save Details'}</span>
                  </button>
                </form>
              </div>

              {/* Security settings: password */}
              <div className="glass p-6 rounded-3xl border border-card-border space-y-6">
                <h3 className="text-base font-bold flex items-center space-x-2">
                  <Key size={18} className="text-secondary" />
                  <span>Security & Credentials</span>
                </h3>
                
                {passwordError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-xs">
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">New Password</label>
                    <input
                      type="password"
                      required
                      minLength="6"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full md:w-80 px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-text-base text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="btn-primary py-2 px-5 rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                    >
                      {passwordSuccess ? 'Password updated!' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPasswordEmail}
                      className="py-2 px-5 bg-white/5 hover:bg-white/10 text-text-base rounded-xl text-xs font-semibold border border-card-border transition-colors cursor-pointer"
                    >
                      Send Reset Email
                    </button>
                  </div>
                </form>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="glass p-6 rounded-3xl border border-red-500/10 bg-red-500/5 space-y-6">
                <h3 className="text-base font-bold text-red-400 flex items-center space-x-2">
                  <Trash2 size={18} />
                  <span>Danger Zone</span>
                </h3>
                <p className="text-xs text-text-muted max-w-md">
                  Permanently delete your account and remove all solved progress maps, streak stats, activity logs, and rooms details. This action cannot be undone.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="py-2.5 px-5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-lg transition-colors cursor-pointer"
                >
                  Delete Account Permanent
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="glass max-w-md w-full p-6 rounded-3xl border border-card-border shadow-2xl space-y-6"
          >
            <div className="flex items-center space-x-3 text-red-400">
              <ShieldAlert size={24} />
              <h3 className="text-lg font-bold">Are you absolutely sure?</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              This will permanently delete the account credentials and erase all associated logs, profile info, and custom database progress entries for `{user?.email}`.
            </p>
            <div>
              <label className="block text-xs font-bold text-text-muted mb-2">
                Type your email to confirm deletion:
              </label>
              <input
                type="email"
                placeholder={user?.email}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-text-base text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
            <div className="flex justify-end space-x-3 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-base font-semibold border border-card-border rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirmText !== user?.email}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? 'Erasing data...' : 'Confirm Erase'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
