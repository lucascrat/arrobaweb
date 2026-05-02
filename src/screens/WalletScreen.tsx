import React from 'react';
import { AtSign, Search, Wallet, ArrowUpRight, ArrowDownLeft, QrCode, PiggyBank, Lock, Check, History } from 'lucide-react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';

interface WalletScreenProps {
  setScreen: (s: Screen) => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({ setScreen }) => {
  const recentTransactions = [
    { id: 1, name: 'Alice Mendes', username: '@alicem', amount: -450.00, encrypted: true, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
    { id: 2, name: 'Ricardo Silva', username: '@rick_dev', amount: 1200.00, received: true, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
    { id: 3, name: 'Bruno Costa', username: '@b.costa', amount: -85.20, pending: true, avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24">
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500 rounded-lg shadow-primary-glow">
            <AtSign className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-extrabold text-white tracking-tighter">Arroba</h1>
        </div>
        <div className="flex items-center gap-4">
          <Search className="w-6 h-6 text-slate-400" />
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop" className="w-8 h-8 rounded-full border-2 border-white/10 shadow-sm" alt="Me" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-cyan-500 rounded-full border-2 border-slate-900" />
          </div>
        </div>
      </header>

      <main className="mt-20 px-4 flex flex-col gap-6">
        <div className="bg-indigo-600/40 backdrop-blur-xl p-8 rounded-[2.5rem] text-white shadow-primary-glow border border-white/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/20 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Saldo Arroba</p>
                <h2 className="text-4xl font-extrabold tracking-tight">R$ 12.450,00</h2>
              </div>
              <Wallet className="w-8 h-8 text-indigo-300/40" strokeWidth={1.5} />
            </div>
            
            <div className="flex gap-3">
              <button className="flex-1 bg-white/10 border border-white/20 backdrop-blur-md text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs uppercase tracking-wider hover:bg-white/20">
                <ArrowUpRight className="w-5 h-5" /> Enviar
              </button>
              <button className="flex-1 bg-white/10 border border-white/20 backdrop-blur-md text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform text-xs uppercase tracking-wider hover:bg-white/20">
                <ArrowDownLeft className="w-5 h-5" /> Receber
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 flex flex-col gap-3 group active:scale-95 transition-all border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <QrCode className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-extrabold text-slate-300 leading-none">Escaneamento</p>
          </div>
          <div className="glass-card p-5 flex flex-col gap-3 group active:scale-95 transition-all border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <PiggyBank className="w-6 h-6 text-cyan-400" />
            </div>
            <p className="text-sm font-extrabold text-slate-300 leading-none">Cofres</p>
          </div>
        </div>

        <div className="relative">
          <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input className="w-full h-14 pl-12 pr-4 bg-white/5 border border-white/10 rounded-2xl font-medium text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500/50" placeholder="Buscar por @username..." />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-extrabold text-white">Histórico recente</h3>
            <button className="text-indigo-400 font-bold text-sm">Ver tudo</button>
          </div>

          <div className="space-y-2">
            {recentTransactions.map((tr) => (
              <div key={tr.id} className="glass-card p-4 flex items-center justify-between border border-white/5 active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-4">
                  <img src={tr.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white/10 shadow-sm" alt={tr.name} />
                  <div>
                    <h4 className="font-extrabold text-sm leading-tight mb-0.5 text-white">{tr.name}</h4>
                    <p className="text-[11px] font-black text-indigo-400 uppercase tracking-wide">{tr.username}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm mb-0.5 ${tr.amount > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                    {tr.amount > 0 ? '+' : ''} R$ {Math.abs(tr.amount).toFixed(2).replace('.', ',')}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {tr.encrypted && <><Lock className="w-3 h-3 text-indigo-500" /> CRIPTOGRAFADO</>}
                    {tr.received && <><Check className="w-3 h-3 text-cyan-500" /> RECEBIDO</>}
                    {tr.pending && <><History className="w-3 h-3 text-yellow-500" /> PENDENTE</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav active="wallet" setScreen={setScreen} />
    </div>
  );
};
