import React from 'react';
import { AtSign, Search, ArrowLeft, Cloud, Verified, Palette, Mic, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';

interface SubscriptionScreenProps {
  setScreen: (s: Screen) => void;
}

export const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ setScreen }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-44 overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chat-list')} className="p-2 text-slate-400 active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-500 rounded-lg shadow-primary-glow">
              <AtSign className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-extrabold text-white tracking-tighter">Plus</h1>
          </div>
        </div>
        <Search className="w-6 h-6 text-slate-400" />
      </header>

      <main className="pt-24 px-6 space-y-8 max-w-lg mx-auto">
        <section className="relative overflow-hidden rounded-[2.5rem] bg-indigo-600/40 backdrop-blur-xl p-10 text-white shadow-primary-glow border border-white/20">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <AtSign className="w-10 h-10 text-indigo-300" />
              <h2 className="text-4xl font-black tracking-tight text-white">Plus</h2>
            </div>
            <p className="text-lg font-bold text-indigo-100 leading-tight">Desbloqueie o potencial máximo da sua soberania digital.</p>
          </div>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-fuchsia-400/10 rounded-full blur-2xl" />
        </section>

        <section className="glass-card p-8 space-y-6 border border-white/5">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 italic">Status do Plano</span>
              <p className="text-2xl font-black text-white">Gratuito</p>
            </div>
            <p className="font-black text-indigo-400 uppercase tracking-widest text-xs">0% Premium</p>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-indigo-500 w-0 rounded-full transition-all duration-1000 shadow-primary-glow" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide leading-relaxed">Assine para liberar 100% dos recursos avançados e suporte prioritário.</p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 border border-white/5 group">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-tight">2GB Cloud</h3>
              <p className="text-[10px] uppercase font-black text-indigo-400 tracking-wider mt-1 italic">Upload sem limites</p>
            </div>
          </div>
          <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 border border-white/5 group">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-white transition-all">
              <Verified className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-tight">Selo Elite</h3>
              <p className="text-[10px] uppercase font-black text-cyan-400 tracking-wider mt-1 italic">Destaque total</p>
            </div>
          </div>
          <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 border border-white/5 group">
            <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 mb-6 border border-fuchsia-500/30 group-hover:bg-fuchsia-500 group-hover:text-white transition-all">
              <Palette className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-tight">Glass UI</h3>
              <p className="text-[10px] uppercase font-black text-fuchsia-400 tracking-wider mt-1 italic">Temas exclusivos</p>
            </div>
          </div>
          <div className="glass-card p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 border border-white/5 group">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 mb-6 border border-yellow-500/30 group-hover:bg-yellow-500 group-hover:text-white transition-all">
              <Mic className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-white text-lg tracking-tight">Voz Smart</h3>
              <p className="text-[10px] uppercase font-black text-yellow-500 tracking-wider mt-1 italic">Transcrição IA</p>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-24 left-0 right-0 p-6 z-40 max-w-lg mx-auto">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-indigo-500 text-white font-black py-5 rounded-3xl shadow-primary-glow flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
        >
          <span>Assinar Arroba Plus</span>
          <Zap className="w-5 h-5 fill-current" />
        </motion.button>
      </div>

      <BottomNav active="subscription" setScreen={setScreen} />
    </div>
  );
};
