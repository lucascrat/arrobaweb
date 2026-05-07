import React, { useEffect, useState } from 'react';
import { AtSign, Search, MessageCircle, UserPlus, Share2, X, Loader2 } from 'lucide-react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

interface SearchScreenProps {
  setScreen: (s: Screen) => void;
  setSelectedChatId: (id: string) => void;
}

interface UserRow {
  id: string;
  username: string | null;
  display_name: string | null;
  photo_url: string | null;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ setScreen, setSelectedChatId }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = searchTerm.trim().replace(/^@/, '').toLowerCase();
    if (term.length <= 1) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, photo_url')
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .neq('id', user?.id || '')
        .limit(20);
      if (cancelled) return;
      if (error) {
        console.error(error);
      } else {
        setResults((data as UserRow[]) || []);
      }
      setLoading(false);
    }, 350);

    return () => { cancelled = true; clearTimeout(t); };
  }, [searchTerm, user?.id]);

  const startChat = async (target: UserRow) => {
    if (!user) return;
    setLoading(true);
    try {
      // Procura chat 1:1 existente
      const { data: existing } = await supabase
        .from('chats')
        .select('id, participants, is_group')
        .contains('participants', [user.id, target.id])
        .eq('is_group', false)
        .limit(5);

      let chatId: string | null = null;
      const found = (existing || []).find((c: any) =>
        Array.isArray(c.participants) &&
        c.participants.length === 2 &&
        c.participants.includes(user.id) &&
        c.participants.includes(target.id)
      );
      if (found) {
        chatId = found.id;
      } else {
        const { data: created, error } = await supabase
          .from('chats')
          .insert({
            participants: [user.id, target.id],
            is_group: false,
            created_by: user.id,
            last_message_text: 'Conversa iniciada',
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        chatId = (created as any)?.id;
      }

      if (chatId) {
        setSelectedChatId(chatId);
        setScreen('chat-room');
      }
    } catch (err) {
      console.error('startChat error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24">
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl flex items-center px-6 justify-between border-b border-white/5 z-50">
        <div className="flex items-center gap-2 text-white">
          <AtSign className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-black tracking-tighter">Buscar</h1>
        </div>
      </header>

      <main className="pt-20 px-6 flex flex-col gap-8">
        <section className="mt-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-16 pl-12 pr-12 bg-white/5 border border-white/10 rounded-2xl font-bold text-white placeholder-slate-600 outline-none"
              placeholder="Digite o @username..."
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Resultados</h2>
            {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
          </div>

          <div className="space-y-4">
            {results.length === 0 && !loading && searchTerm.trim().length > 0 && (
              <div className="text-center py-20 opacity-40">
                <Search className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhum @usuário encontrado</p>
              </div>
            )}

            {results.length === 0 && !loading && searchTerm.trim().length === 0 && (
              <div className="text-center py-20 opacity-30">
                <AtSign className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-xs font-black uppercase tracking-widest">Busque pela @identidade</p>
              </div>
            )}

            {results.map((res) => (
              <div key={res.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={res.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.username || res.id}`}
                    className="w-14 h-14 rounded-[1.5rem] object-cover border border-white/10"
                    alt={res.display_name || ''}
                  />
                  <div>
                    <h4 className="font-black text-sm text-white">{res.display_name || res.username || 'Usuário'}</h4>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">@{res.username || '—'}</p>
                  </div>
                </div>
                <button
                  onClick={() => startChat(res)}
                  className="bg-indigo-500 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Conversar
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center p-8 border border-dashed border-white/10 rounded-[2.5rem] bg-indigo-500/5">
            <UserPlus className="w-10 h-10 text-indigo-500/40 mx-auto mb-4" />
            <h3 className="font-black text-white text-sm">Convide seus amigos</h3>
            <button className="mt-4 text-indigo-400 font-extrabold flex items-center gap-2 mx-auto uppercase text-[10px] tracking-widest">
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
          </div>
        </section>
      </main>

      <BottomNav active="search" setScreen={setScreen} />
    </div>
  );
};
