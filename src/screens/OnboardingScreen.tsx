import React from 'react';
import { motion } from 'motion/react';
import { AtSign, ShieldCheck, Zap, Globe, ArrowRight } from 'lucide-react';
import { soundManager } from '../lib/sounds';

interface OnboardingScreenProps {
  next: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ next }) => {
  const features = [
    { icon: ShieldCheck, color: 'text-indigo-400', label: 'Soberania', desc: 'Identidade @única e privada' },
    { icon: Zap, color: 'text-fuchsia-400', label: 'Loja Própria', desc: 'Subdomínio profissional' },
    { icon: Globe, color: 'text-cyan-400', label: 'Atendimento IA', desc: 'Assistente próprio com Gemini' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10 space-y-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-20 h-20 mx-auto bg-indigo-500/20 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-glass">
            <AtSign className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-3">Arroba</h1>
          <p className="text-slate-400 text-sm font-bold leading-relaxed">
            Mensagens, lojas e identidade soberana em um só app.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl">
              <div className="p-3 bg-white/5 rounded-xl">
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <div>
                <p className="text-white font-black text-sm">{f.label}</p>
                <p className="text-[10px] font-bold text-slate-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { soundManager.playChime(); next(); }}
          className="w-full bg-indigo-500 text-white font-black py-5 rounded-3xl shadow-primary-glow flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
        >
          Começar agora <ArrowRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
};
