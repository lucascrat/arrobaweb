import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Search, MoreVertical, Plus, Bell, Loader2, MessageSquare } from 'lucide-react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

interface ChatListScreenProps {
  setScreen: (s: Screen) => void;
  setSelectedChatId: (id: string) => void;
}

interface ChatRow {
  id: string;
  participants: string[];
  is_group: boolean;
  group_name: string | null;
  group_photo: string | null;
  last_message_text: string | null;
  last_message_at: string | null;
  created_at: string;
  // enriched
  name?: string;
  username?: string;
  avatar?: string;
  online?: boolean;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ setScreen, setSelectedChatId }) => {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CHATS' | 'GRUPOS'>('CHATS');
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const enrichChats = async (rows: ChatRow[]): Promise<ChatRow[]> => {
    if (!user) return rows;

    // Pega ids dos "outros" usuários nos chats 1:1
    const otherIds = new Set<string>();
    rows.forEach(c => {
      if (!c.is_group) {
        const other = c.participants.find(id => id !== user.id);
        if (other) otherIds.add(other);
      }
    });

    let othersById: Record<string, any> = {};
    if (otherIds.size > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, photo_url, online')
        .in('id', Array.from(otherIds));
      othersById = Object.fromEntries((data || []).map((p: any) => [p.id, p]));
    }

    return rows.map(c => {
      if (c.is_group) {
        return {
          ...c,
          name: c.group_name || 'Grupo',
          username: '',
          avatar: c.group_photo || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.id}`,
        };
      }
      const otherId = c.participants.find(id => id !== user.id) || '';
      const o = othersById[otherId] || {};
      return {
        ...c,
        name: o.display_name || o.username || 'Usuário',
        username: o.username || '',
        avatar: o.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`,
        online: !!o.online,
      };
    });
  };

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [user.id])
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('chats query error', error);
        setLoading(false);
        return;
      }
      const rows = (data as ChatRow[]) || [];
      const enriched = await enrichChats(rows);
      setChats(enriched);
      setLoading(false);
    };

    load();

    // Realtime nos chats em que o usuário participa
    const ch = supabase.channel(`chats:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'arroba', table: 'chats' }, async () => {
        await load();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const filteredChats = chats.filter(chat => {
    const matchesTab = activeTab === 'GRUPOS' ? chat.is_group : !chat.is_group;
    if (!matchesTab) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (chat.name || '').toLowerCase().includes(q) || (chat.username || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 z-50">
        <div className="h-16 px-4 flex justify-between items-center">
          {!isSearchOpen ? (
            <>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { soundManager.playClick(); setScreen('profile'); }}
                  className="relative active:scale-95"
                >
                  <img
                    src={profile?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || user?.id}`}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10"
                    alt="Profile"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full border-2 border-slate-900" />
                </button>
                <h1 className="text-2xl font-black tracking-tighter text-white">Arroba</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsSearchOpen(true); soundManager.playClick(); }}
                  className="p-2 text-slate-400 rounded-full hover:bg-white/5">
                  <Search className="w-6 h-6" />
                </button>
                <button onClick={() => { soundManager.playClick(); setScreen('notifications'); }}
                  className="p-2 text-slate-400 rounded-full hover:bg-white/5 relative">
                  <Bell className="w-6 h-6" />
                </button>
                <button className="p-2 text-slate-400 rounded-full hover:bg-white/5"><MoreVertical className="w-6 h-6" /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-2 border border-white/10 mx-2">
              <Search className="w-4 h-4 text-indigo-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversas..."
                className="flex-1 bg-transparent outline-none text-white text-sm font-medium placeholder:text-slate-500"
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-1 text-slate-400">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-8 px-4">
          {(['CHATS', 'GRUPOS'] as const).map((label) => (
            <div key={label} className="flex flex-col items-center">
              <button
                onClick={() => setActiveTab(label)}
                className={`py-3 text-sm font-bold tracking-wider ${activeTab === label ? 'text-white' : 'text-slate-500'}`}
              >
                {label}
              </button>
              {activeTab === label && <div className="h-1 w-12 bg-indigo-500 rounded-t-full" />}
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
            <button onClick={() => setScreen('search')}
              className="mt-4 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
              Iniciar Conversa
            </button>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <motion.div
              key={chat.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setSelectedChatId(chat.id); setScreen('chat-room'); }}
              className="flex items-center gap-4 p-4 glass-card cursor-pointer hover:bg-white/10 border border-white/5"
            >
              <div className="relative">
                <img src={chat.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-white/10" alt={chat.name} />
                {chat.online && <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-500 rounded-full border-2 border-slate-900" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-slate-100 truncate">{chat.name}</h3>
                  <span className="text-[10px] font-extrabold text-slate-500">
                    {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {chat.username && <p className="text-[11px] font-bold text-indigo-400/80 mb-0.5">@{chat.username}</p>}
                    <p className="text-sm text-slate-400 truncate">{chat.last_message_text || '...'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </main>

      <button
        onClick={() => { soundManager.playClick(); setScreen('create-group'); }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-90"
      >
        <Plus className="w-7 h-7" />
      </button>

      <BottomNav active="chat-list" setScreen={setScreen} />
    </div>
  );
};
