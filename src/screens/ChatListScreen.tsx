import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AtSign, Search, MoreVertical, Users, Plus, Bell, Loader2, MessageSquare } from 'lucide-react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';

interface ChatListScreenProps {
  setScreen: (s: Screen) => void;
  setSelectedChatId: (id: string) => void;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ setScreen, setSelectedChatId }) => {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CHATS' | 'GRUPOS' | 'STATUS'>('CHATS');
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const dataPromises = snapshot.docs.map(async (chatDoc) => {
        const data = chatDoc.data();
        let chatInfo: any = { ...data, id: chatDoc.id };

        if (!data.isGroup) {
          const otherId = data.participants.find((id: string) => id !== user.uid);
          if (otherId) {
            const userRef = doc(db, 'users', otherId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              chatInfo = {
                ...chatInfo,
                name: userData.displayName || userData.username,
                username: userData.username,
                avatar: userData.photoURL || `https://ui-avatars.com/api/?name=${userData.username}`
              };
            }
          }
        } else {
          chatInfo = {
            ...chatInfo,
            name: data.groupName,
            username: data.username,
            avatar: data.groupAvatar
          };
        }
        return chatInfo;
      });

      const resolvedChats = await Promise.all(dataPromises);
      setChats(resolvedChats);
      setLoading(false);
    }, (error) => {
      console.error("Chats query error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredChats = chats.filter(chat => {
    // First filter by tab
    const matchesTab = activeTab === 'GRUPOS' ? chat.isGroup : (activeTab === 'CHATS' ? !chat.isGroup : true);
    if (!matchesTab) return false;

    // Then filter by search query
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      chat.name?.toLowerCase().includes(query) || 
      chat.username?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 z-50">
        <div className="h-16 px-4 flex justify-between items-center">
          {!isSearchOpen ? (
            <>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    soundManager.playClick();
                    setScreen('profile');
                  }}
                  className="relative active:scale-95 transition-all"
                >
                  <img 
                    src={profile?.photoURL || user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop'} 
                    className="w-10 h-10 rounded-xl object-cover border border-white/10" 
                    alt="Profile" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full border-2 border-slate-900" />
                </button>
                <h1 className="text-2xl font-black tracking-tighter text-white">Arroba</h1>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsSearchOpen(true);
                    soundManager.playClick();
                  }}
                  className="p-2 text-slate-400 rounded-full hover:bg-white/5 active:scale-90 transition-transform"
                >
                  <Search className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => {
                    soundManager.playClick();
                    setScreen('notifications');
                  }}
                  className="p-2 text-slate-400 rounded-full hover:bg-white/5 relative"
                >
                  <Bell className="w-6 h-6" />
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-indigo-500 rounded-full border border-slate-900 shadow-primary-glow" />
                </button>
                <button className="p-2 text-slate-400 rounded-full hover:bg-white/5"><MoreVertical className="w-6 h-6" /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-2 border border-white/10 mx-2 glass-card">
              <Search className="w-4 h-4 text-indigo-400" />
              <input 
                autoFocus
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversas ou @username..."
                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-medium placeholder:text-slate-500 font-sans"
              />
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                  soundManager.playClick();
                }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-8 px-4 overflow-x-auto no-scrollbar">
          {(['CHATS', 'GRUPOS', 'STATUS'] as const).map((label) => (
            <div key={label} className="flex flex-col items-center">
              <button 
                onClick={() => setActiveTab(label)}
                className={`py-3 text-sm font-bold tracking-wider transition-colors ${activeTab === label ? 'text-white' : 'text-slate-500'}`}
              >
                {label}
              </button>
              {activeTab === label && <div className="h-1 w-12 bg-indigo-500 rounded-t-full shadow-primary-glow" />}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 mt-32 px-4 space-y-4 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-white">Sincronizando...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-20 opacity-30">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <p className="text-xs font-black uppercase tracking-widest text-white">Nada por aqui ainda</p>
            <button 
              onClick={() => setScreen('search')}
              className="mt-4 text-indigo-400 text-[10px] font-black uppercase tracking-widest"
            >
              Iniciar Conversa
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <motion.div 
              key={chat.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedChatId(chat.id);
                setScreen('chat-room');
              }}
              className="flex items-center gap-4 p-4 glass-card cursor-pointer hover:bg-white/10 transition-all border border-white/5"
            >
              <div className="relative">
                <div className="relative group/avatar">
                  <img src={chat.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-white/10 shadow-sm" alt={chat.name} />
                  {chat.online && <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-500 rounded-full border-2 border-slate-900 shadow-sm" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-slate-100 truncate">{chat.name}</h3>
                  <span className={`text-[10px] font-extrabold ${chat.unread > 0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {chat.lastMessageAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-indigo-400/80 mb-0.5 tracking-wide">@{chat.username}</p>
                    <p className="text-sm text-slate-400 truncate font-medium">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="bg-indigo-500 text-white text-[10px] font-black h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-primary-glow">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </main>

      <button 
        onClick={() => {
          soundManager.playClick();
          setScreen('create-group');
        }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-90 transition-transform shadow-primary-glow border border-transparent hover:scale-105"
      >
        <Plus className="w-7 h-7" />
      </button>

      <BottomNav active="chat-list" setScreen={setScreen} />
    </div>
  );
};
