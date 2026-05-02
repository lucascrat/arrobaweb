import React, { useState, useEffect } from 'react';
import { AtSign, Search, Filter, Terminal, Crown, User, Verified, ShoppingCart, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';
import { soundManager } from '../lib/sounds';

interface NameStoreScreenProps {
  setScreen: (s: Screen) => void;
}

export const NameStoreScreen: React.FC<NameStoreScreenProps> = ({ setScreen }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Simulate loading when searching
  useEffect(() => {
    if (searchQuery) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  const collections = [
    { id: 1, title: 'Cidades', tag: 'Destaque', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=300&fit=crop' },
    { id: 2, title: 'Profissões', tag: 'Novo', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=300&fit=crop' },
    { id: 3, title: 'Colecionáveis', tag: 'Web3', image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&h=300&fit=crop' },
  ];

  const premiumNames = [
    { id: 1, username: '@dev', description: 'Software Engineer', price: 1200.00, verified: true, icon: Terminal, color: 'bg-indigo-500/20' },
    { id: 2, username: '@rei', description: 'Exclusividade Real', price: 500.00, icon: Crown, color: 'bg-fuchsia-500/20' },
    { id: 3, username: '@jose', description: 'Nome Próprio', price: 300.00, icon: User, color: 'bg-slate-500/20' },
    { id: 4, username: '@cripto', description: 'Blockchain Enthusiast', price: 850.00, verified: true, icon: Terminal, color: 'bg-cyan-500/20' },
    { id: 5, username: '@vip', description: 'Membro Premium', price: 1500.00, icon: Crown, color: 'bg-yellow-500/20' },
  ];

  const filteredNames = premiumNames.filter(name => 
    name.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    name.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SkeletonItem = () => (
    <div className="glass-card p-6 flex items-center justify-between border border-white/5 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5" />
        <div className="space-y-2">
          <div className="h-5 w-24 bg-white/10 rounded-lg" />
          <div className="h-3 w-32 bg-white/5 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-3">
        <div className="h-5 w-20 bg-white/10 rounded-lg" />
        <div className="h-8 w-24 bg-white/10 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 justify-between z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chat-list')} className="p-2 text-slate-400 active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-500 rounded-lg shadow-primary-glow">
              <AtSign className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white">Market(@)</h1>
          </div>
        </div>
        <ShoppingCart className="w-6 h-6 text-slate-400" />
      </header>

      <main className="pt-24 px-6 flex flex-col gap-10">
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black leading-tight text-white tracking-tight">Loja de Nomes</h2>
            <p className="text-slate-400 font-bold text-sm">Identidade soberana começa com o @ perfeito.</p>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length % 3 === 0) soundManager.playClick();
              }}
              className="w-full h-16 pl-12 pr-4 bg-white/5 border border-white/10 rounded-3xl font-bold text-white placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-glass" 
              placeholder="Encontre seu @ exclusivo..." 
            />
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6 px-1">
            <h3 className="text-xl font-black text-white">Coleções</h3>
            <span className="text-indigo-400 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:text-indigo-300 transition-colors">Ver tudo</span>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4 no-scrollbar">
            {collections.map((col) => (
              <motion.div 
                key={col.id} 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="min-w-[280px] h-48 rounded-[2.5rem] relative overflow-hidden group cursor-pointer border border-white/10 shadow-glass"
              >
                <img src={col.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={col.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <span className="bg-indigo-500 text-white text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest mb-3 inline-block shadow-primary-glow">{col.tag}</span>
                  <h4 className="text-3xl font-black text-white tracking-tight">{col.title}</h4>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xl font-black text-white">
              {searchQuery ? `Resultados (${filteredNames.length})` : 'Nomes Premium'}
            </h3>
            <button className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 active:scale-95 transition-all hover:bg-white/10">
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <SkeletonItem />
                  <SkeletonItem />
                  <SkeletonItem />
                </motion.div>
              ) : (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {filteredNames.length > 0 ? (
                    filteredNames.map((name) => {
                      const Icon = name.icon;
                      return (
                        <motion.div 
                          key={name.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass-card p-6 flex items-center justify-between border border-white/5 group hover:bg-white/10 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-5">
                            <div className={`w-16 h-16 rounded-2xl ${name.color} flex items-center justify-center relative border border-white/5 transition-transform group-hover:scale-105`}>
                              <Icon className="w-8 h-8 text-indigo-100" />
                              {name.verified && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full border-2 border-slate-950 shadow-sm" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-lg text-white leading-none">{name.username}</h4>
                                {name.verified && <Verified className="w-4 h-4 text-cyan-400 fill-current" />}
                              </div>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{name.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-3">
                            <span className="font-black text-lg text-white tabular-nums tracking-tight">R$ {name.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <button 
                              onClick={() => soundManager.playChime()}
                              className="px-6 py-2.5 bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-primary-glow active:scale-90 transition-all hover:bg-indigo-400"
                            >
                              Comprar
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 glass-card">
                      <AtSign className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                      <p className="text-slate-500 font-bold">Nenhum @ encontrado para "{searchQuery}"</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-10 bg-indigo-600/40 backdrop-blur-xl rounded-[3rem] text-white relative overflow-hidden group shadow-primary-glow border border-white/20 mt-8">
            <div className="relative z-10">
              <h4 className="text-4xl font-black mb-2 tracking-tight">Venda seu @</h4>
              <p className="text-sm font-bold text-indigo-100 mb-8 max-w-[200px] leading-relaxed">Transforme seu nome de usuário em um ativo líquido.</p>
              <button className="bg-white/10 backdrop-blur-md border border-white/20 text-white font-black px-10 py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest hover:bg-white/20">Anunciar Agora</button>
            </div>
            <AtSign className="absolute -right-10 -bottom-10 w-56 h-56 opacity-10 rotate-12 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-1000" strokeWidth={1} />
          </div>
        </section>
      </main>

      <BottomNav active="search" setScreen={setScreen} />
    </div>
  );
};
