import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Search, UserPlus, Check, X, ShieldAlert, Sparkles, Trophy, Sword } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Friends() {
  const { user } = useAuth();
  
  // Search state
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Lists state
  const [friendsList, setFriendsList] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Compare state
  const [comparingFriend, setComparingFriend] = useState(null);
  const [friendSolvedCount, setFriendSolvedCount] = useState(0);
  const [mySolvedCount, setMySolvedCount] = useState(0);

  // Real-time friend relationships fetch
  useEffect(() => {
    if (!user) return;

    const friendsRef = collection(db, 'friends', user.uid, 'user_friends');
    
    const unsubscribe = onSnapshot(friendsRef, async (snapshot) => {
      const friends = [];
      const incoming = [];
      const outgoing = [];

      for (const d of snapshot.docs) {
        const relation = d.data();
        const partnerId = d.id;

        // Fetch display profile details for this user
        const partnerSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', partnerId)));
        const partnerData = partnerSnap.empty ? {} : partnerSnap.docs[0].data();

        const friendItem = {
          uid: partnerId,
          displayName: partnerData.displayName || 'Competitor',
          username: partnerData.username || 'unknown',
          solved: partnerData.stats?.totalSolved || 0,
          streak: partnerData.stats?.currentStreak || 0,
          ...relation
        };

        if (relation.status === 'accepted') {
          friends.push(friendItem);
        } else if (relation.status === 'pending' && relation.direction === 'incoming') {
          incoming.push(friendItem);
        } else if (relation.status === 'pending' && relation.direction === 'outgoing') {
          outgoing.push(friendItem);
        }
      }

      setFriendsList(friends);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setFriendsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch my solved count for comparison
  useEffect(() => {
    if (!user) return;
    const fetchMySolved = async () => {
      const qSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
      if (!qSnap.empty) {
        setMySolvedCount(qSnap.docs[0].data().stats?.totalSolved || 0);
      }
    };
    fetchMySolved();
  }, [user]);

  // Handle User Search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchUsername) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const q = query(collection(db, 'users'), where('username', '==', searchUsername.toLowerCase().trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setSearchError('User not found.');
      } else {
        const foundUser = snap.docs[0].data();
        if (foundUser.uid === user.uid) {
          setSearchError("You cannot add yourself!");
        } else {
          setSearchResult(foundUser);
        }
      }
    } catch (err) {
      console.error(err);
      setSearchError('Search failed.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Send Friend Request
  const handleSendRequest = async () => {
    if (!user || !searchResult) return;
    try {
      // 1. Create outgoing request for me
      const myRef = doc(db, 'friends', user.uid, 'user_friends', searchResult.uid);
      await setDoc(myRef, {
        status: 'pending',
        direction: 'outgoing',
        timestamp: serverTimestamp()
      });

      // 2. Create incoming request for them
      const theirRef = doc(db, 'friends', searchResult.uid, 'user_friends', user.uid);
      await setDoc(theirRef, {
        status: 'pending',
        direction: 'incoming',
        timestamp: serverTimestamp()
      });

      setSearchResult(null);
      setSearchUsername('');
      alert("Friend request sent!");
    } catch (err) {
      console.error(err);
      alert("Failed to send request.");
    }
  };

  // Accept Friend Request
  const handleAcceptRequest = async (senderId) => {
    if (!user) return;
    try {
      const batchWrites = [];
      const recipientRef = doc(db, 'friends', user.uid, 'user_friends', senderId);
      const senderRef = doc(db, 'friends', senderId, 'user_friends', user.uid);

      await setDoc(recipientRef, { status: 'accepted', timestamp: serverTimestamp() }, { merge: true });
      await setDoc(senderRef, { status: 'accepted', timestamp: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  // Reject / Remove Friend Request
  const handleRejectRequest = async (senderId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'friends', user.uid, 'user_friends', senderId));
      await deleteDoc(doc(db, 'friends', senderId, 'user_friends', user.uid));
    } catch (err) {
      console.error(err);
    }
  };

  const startComparison = (friend) => {
    setComparingFriend(friend);
    setFriendSolvedCount(friend.solved || 0);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-8">
          Friends & Social Arena
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Social Center */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Search User Form */}
            <div className="glass p-6 rounded-3xl border border-card-border">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Add Friends</h3>
              
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    placeholder="Enter unique username (e.g. kanishka)"
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    className="w-full pl-4 pr-4 py-2.5 rounded-xl bg-white/5 border border-card-border focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-base"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Search Result Overlay */}
              <AnimatePresence>
                {searchLoading && <div className="text-sm text-text-muted mt-3">Searching...</div>}
                
                {searchError && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-red-400 mt-3"
                  >
                    {searchError}
                  </motion.div>
                )}

                {searchResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-between items-center mt-4 p-4 rounded-2xl bg-white/5 border border-card-border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center font-bold text-white">
                        {searchResult.displayName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-text-base">{searchResult.displayName}</div>
                        <div className="text-xs text-text-muted">@{searchResult.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={handleSendRequest}
                      className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl text-xs shadow-md cursor-pointer"
                    >
                      <UserPlus size={14} />
                      <span>Send Request</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Friends List Container */}
            <div className="glass p-6 rounded-3xl border border-card-border">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Friends List</h3>
              
              {friendsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 w-full bg-white/5 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : friendsList.length === 0 ? (
                <div className="text-center text-text-muted py-8 text-sm">
                  You haven't added any friends yet. Use search to expand your circle!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friendsList.map((friend) => (
                    <div 
                      key={friend.uid}
                      className="p-4 rounded-2xl bg-white/5 border border-card-border flex justify-between items-center hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-bold text-primary">
                          {friend.displayName?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-text-base">{friend.displayName}</div>
                          <div className="text-xs text-text-muted">{friend.solved || 0} Solved</div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startComparison(friend)}
                          className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-xs font-semibold cursor-pointer"
                        >
                          Compare
                        </button>
                        <button
                          onClick={() => handleRejectRequest(friend.uid)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove Friend"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Social Notification / Requests Drawer */}
          <div className="space-y-6">
            
            {/* Incoming Requests */}
            <div className="glass p-6 rounded-3xl border border-card-border">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Pending Requests</h3>
              {incomingRequests.length === 0 ? (
                <div className="text-xs text-text-muted py-2">No pending invitations.</div>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((req) => (
                    <div key={req.uid} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-card-border">
                      <div className="text-xs">
                        <div className="font-bold text-text-base">{req.displayName}</div>
                        <div className="text-text-muted mt-0.5">@{req.username}</div>
                      </div>
                      <div className="flex space-x-1.5">
                        <button
                          onClick={() => handleAcceptRequest(req.uid)}
                          className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.uid)}
                          className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Progress comparison card */}
            {comparingFriend && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-6 rounded-3xl border border-primary/20 bg-primary/5 relative"
              >
                <button 
                  onClick={() => setComparingFriend(null)}
                  className="absolute top-4 right-4 text-text-muted hover:text-text-base cursor-pointer"
                >
                  <X size={16} />
                </button>
                <div className="flex items-center space-x-2 text-xs font-bold text-primary uppercase tracking-wider mb-4">
                  <Sword size={14} />
                  <span>Live Arena Battle</span>
                </div>
                <div className="flex justify-between items-center text-center py-4">
                  <div>
                    <h4 className="text-xs text-text-muted font-bold">You</h4>
                    <p className="text-2xl font-black mt-1 text-text-base">{mySolvedCount}</p>
                  </div>
                  <div className="text-xs font-black text-primary">VS</div>
                  <div>
                    <h4 className="text-xs text-text-muted font-bold truncate w-24">{comparingFriend.displayName}</h4>
                    <p className="text-2xl font-black mt-1 text-text-base">{friendSolvedCount}</p>
                  </div>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-4">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${(mySolvedCount / (mySolvedCount + friendSolvedCount || 1)) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-center text-text-muted mt-3">
                  {mySolvedCount >= friendSolvedCount 
                    ? `Leading by +${mySolvedCount - friendSolvedCount} problems!` 
                    : `Behind by ${friendSolvedCount - mySolvedCount} problems. Keep grinding!`}
                </p>
              </motion.div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
