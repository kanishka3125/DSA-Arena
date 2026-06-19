import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, where, updateDoc, arrayUnion, arrayRemove, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Link, Copy, Check, Users, Sword, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Rooms() {
  const { user } = useAuth();
  
  // Lists
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  // Create Room state
  const [newRoomName, setNewRoomName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Join Room state
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Selected Room Details
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch Rooms User is in
  useEffect(() => {
    if (!user) return;
    
    const fetchRooms = async () => {
      setRoomsLoading(true);
      try {
        const q = query(collection(db, 'rooms'), where('members', 'array-contains', user.uid));
        const snap = await getDocs(q);
        const roomsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setJoinedRooms(roomsData);
      } catch (err) {
        console.error("Failed to load rooms:", err);
      } finally {
        setRoomsLoading(false);
      }
    };

    fetchRooms();
  }, [user]);

  // Create Room handler
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName || createLoading) return;
    setCreateLoading(true);

    // Generate random code e.g. ROOM-8239
    const code = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
    const newRoomId = doc(collection(db, 'rooms')).id;

    try {
      const roomPayload = {
        name: newRoomName,
        inviteCode: code,
        hostId: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid]
      };

      await setDoc(doc(db, 'rooms', newRoomId), roomPayload);
      setJoinedRooms(prev => [...prev, { id: newRoomId, ...roomPayload }]);
      setNewRoomName('');
      alert(`Room created! Share code: ${code}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create room.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Join Room handler
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim().toUpperCase();
    if (!cleanCode || joinLoading) return;
    setJoinLoading(true);

    try {
      const q = query(collection(db, 'rooms'), where('inviteCode', '==', cleanCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        alert("Invalid invite code. Room not found.");
      } else {
        const roomDoc = snap.docs[0];
        const roomData = roomDoc.data();

        if (roomData.members.includes(user.uid)) {
          alert("You are already a member of this room!");
        } else {
          await updateDoc(doc(db, 'rooms', roomDoc.id), {
            members: arrayUnion(user.uid)
          });
          setJoinedRooms(prev => [...prev, { id: roomDoc.id, ...roomData, members: [...roomData.members, user.uid] }]);
          setInviteCodeInput('');
          alert(`Successfully joined room: ${roomData.name}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to join room.');
    } finally {
      setJoinLoading(false);
    }
  };

  // Copy Code to Clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Show detailed leaderboard for a room
  const handleSelectRoom = async (room) => {
    setSelectedRoom(room);
    
    // Fetch members profile and progress details
    const membersDetails = [];
    try {
      for (const mId of room.members) {
        // Fetch User profile doc
        const uSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', mId)));
        const uData = uSnap.empty ? {} : uSnap.docs[0].data();
        
        // Fetch User solved problems count
        const progressSnap = await getDocs(query(collection(db, 'user_progress', mId, 'problems'), where('solved', '==', true)));
        
        membersDetails.push({
          uid: mId,
          displayName: uData.displayName || 'Explorer',
          username: uData.username || 'unknown',
          solved: progressSnap.size,
          streak: uData.stats?.currentStreak || 0
        });
      }
      
      membersDetails.sort((a, b) => b.solved - a.solved);
      setSelectedRoom(prev => ({ ...prev, membersDetails }));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Room (Host only)
  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'rooms', roomId));
      setJoinedRooms(prev => prev.filter(r => r.id !== roomId));
      setSelectedRoom(null);
      alert('Room deleted successfully.');
    } catch (err) {
      console.error("Failed to delete room:", err);
      alert('Failed to delete room.');
    }
  };

  // Leave Room (Member only)
  const handleLeaveRoom = async (roomId) => {
    if (!window.confirm("Are you sure you want to leave this room?")) return;
    try {
      await updateDoc(doc(db, 'rooms', roomId), {
        members: arrayRemove(user.uid)
      });
      setJoinedRooms(prev => prev.filter(r => r.id !== roomId));
      setSelectedRoom(null);
      alert('Left the room successfully.');
    } catch (err) {
      console.error("Failed to leave room:", err);
      alert('Failed to leave room.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-base">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-8">
          Competition Rooms
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Join/Create Forms Panel */}
          <div className="space-y-6">
            
            {/* Create Room */}
            <div className="glass p-6 rounded-3xl border border-card-border">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Create New Room</h3>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer DSA Grind"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-text-base text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={createLoading}
                  className="w-full py-2.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <PlusCircle size={16} />
                  <span>{createLoading ? 'Creating...' : 'Create'}</span>
                </button>
              </form>
            </div>

            {/* Join Room */}
            <div className="glass p-6 rounded-3xl border border-card-border">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">Join Room via Invite Code</h3>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="e.g. ROOM-1234"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-text-base text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <button
                  type="submit"
                  disabled={joinLoading}
                  className="w-full py-2.5 bg-secondary hover:bg-secondary/95 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <ArrowRight size={16} />
                  <span>{joinLoading ? 'Joining...' : 'Join'}</span>
                </button>
              </form>
            </div>

          </div>

          {/* Rooms List Panel */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Joined Rooms List */}
            <div className="glass p-6 rounded-3xl border border-card-border">
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Your Competition Rooms</h3>
              
              {roomsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 w-full bg-white/5 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : joinedRooms.length === 0 ? (
                <div className="text-center text-text-muted py-8 text-sm">
                  You are not part of any competition rooms yet. Create one or join with a code!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {joinedRooms.map((room) => (
                    <div 
                      key={room.id}
                      onClick={() => handleSelectRoom(room)}
                      className="p-4 rounded-2xl bg-white/5 border border-card-border hover:bg-white/10 transition-all cursor-pointer flex justify-between items-center group"
                    >
                      <div>
                        <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{room.name}</h4>
                        <span className="text-xs text-text-muted mt-1 inline-flex items-center space-x-1.5">
                          <Users size={12} />
                          <span>{room.members?.length || 1} Members</span>
                        </span>
                      </div>
                      <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded text-text-muted">
                        {room.inviteCode}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Room Leaderboard Drawer (if selected) */}
            <AnimatePresence mode="wait">
              {selectedRoom && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="glass p-6 rounded-3xl border border-card-border"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-black">{selectedRoom.name} Leaderboard</h3>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-xs font-mono text-text-muted">Invite Code: {selectedRoom.inviteCode}</span>
                        <button 
                          onClick={() => handleCopyCode(selectedRoom.inviteCode)}
                          className="text-text-muted hover:text-text-base cursor-pointer"
                        >
                          {copiedCode ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <button 
                        onClick={() => setSelectedRoom(null)}
                        className="text-xs font-bold text-text-muted hover:text-text-base cursor-pointer"
                      >
                        Close Details
                      </button>
                      {selectedRoom.hostId === user.uid ? (
                        <button 
                          onClick={() => handleDeleteRoom(selectedRoom.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer transition-colors"
                        >
                          Delete Room
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleLeaveRoom(selectedRoom.id)}
                          className="text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer transition-colors"
                        >
                          Leave Room
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedRoom.membersDetails ? (
                      selectedRoom.membersDetails.map((member, idx) => (
                        <div 
                          key={member.uid}
                          className="flex justify-between items-center p-3 rounded-2xl bg-white/5 border border-card-border"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-black text-text-muted w-4">{idx + 1}</span>
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                              {member.displayName?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-text-base">{member.displayName}</div>
                              <div className="text-[10px] text-text-muted">@{member.username}</div>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-primary">{member.solved} Solved</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-text-muted text-center py-4">Loading leaderboard data...</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </main>
    </div>
  );
}
