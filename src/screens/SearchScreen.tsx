import React, { useState, useEffect } from 'react';
import { AtSign, Search, MessageCircle, UserPlus, Share2, Lock, Verified, X, Loader2 } from 'lucide-react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, doc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';

interface SearchScreenProps {
  setScreen: (s: Screen) => void;
  setSelectedChatId: (id: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ setScreen, setSelectedChatId }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const performSearch = async () => {
      if (searchTerm.trim().length <= 2) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '>=', searchTerm.toLowerCase()),
          where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        
        if (!isCancelled) {
          const users = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(u => u.uid !== user?.uid);
          setResults(users);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Search error:", error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    const delayDebounceFn = setTimeout(() => {
      performSearch();
    }, 500);

    return () => {
      isCancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [searchTerm, user?.uid]);

  const startChat = async (targetUser: any) => {
    if (!user) return;
    setLoading(true);
    try {
      // For simplicity, we create a deterministic ID based on the two UIDs
      const chatId = [user.uid, targetUser.uid].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', user.uid)));
      
      // Check if chat already exists in user's active chats (simplified check)
      let existingChat = null;
      chatSnap.docs.forEach(d => {
        const p = d.data().participants;
        if (p.includes(targetUser.uid)) existingChat = d.id;
      });

      if (!existingChat) {
        await setDoc(chatRef, {
          participants: [user.uid, targetUser.uid],
          updatedAt: serverTimestamp(),
          lastMessage: 'Nova conversa iniciada',
          lastMessageAt: serverTimestamp()
        });
        setSelectedChatId(chatId);
      } else {
        setSelectedChatId(existingChat);
      }
      
      setScreen('chat-room');
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24 font-sans">
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl flex items-center px-6 justify-between border-b border-white/5 z-50">
        <div className="flex items-center gap-2 text-white">
          <AtSign className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-black tracking-tighter">Buscar</h1>
        </div>
        <button onClick={() => setScreen('name-store')} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest text-indigo-400">Name Store</button>
      </header>

      <main className="pt-20 px-6 flex flex-col gap-8">
        <section className="mt-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-16 pl-12 pr-12 bg-white/5 border border-white/10 rounded-2xl font-bold text-white placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all shadow-glass" 
              placeholder="Digite o @username..." 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
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
            {results.length === 0 && !loading && (
              <div className="text-center py-20 opacity-30">
                <Search className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                <p className="text-xs font-black uppercase tracking-widest">Aguardando busca...</p>
              </div>
            )}

            {results.map((res) => (
              <div key={res.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 shadow-glass flex items-center justify-between hover:bg-white/10 transition-all active:scale-[0.98] group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={res.photoURL || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop`} className="w-14 h-14 rounded-[1.5rem] object-cover border border-white/10 shadow-sm" alt={res.displayName} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">{res.displayName || 'Usuário'}</h4>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mt-1">@{res.username}</p>
                  </div>
                </div>
                <button 
                  onClick={() => startChat(res)}
                  className="bg-indigo-500 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-primary-glow flex items-center gap-2 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  Conversar
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center p-8 border border-dashed border-white/10 rounded-[2.5rem] bg-indigo-500/5">
            <UserPlus className="w-10 h-10 text-indigo-500/40 mx-auto mb-4" />
            <h3 className="font-black text-white text-sm">Não encontrou quem procurava?</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-2 leading-relaxed uppercase tracking-widest">Convide seus amigos para a rede Arroba e garanta sua soberania digital juntos.</p>
            <button className="mt-6 text-indigo-400 font-extrabold flex items-center gap-2 mx-auto hover:text-white uppercase text-[10px] tracking-widest transition-colors">
              <Share2 className="w-4 h-4" /> Compartilhar link
            </button>
          </div>
        </section>
      </main>

      <BottomNav active="search" setScreen={setScreen} />
    </div>
  );
};
