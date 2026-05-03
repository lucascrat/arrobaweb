import React from 'react';
import { motion } from 'motion/react';
import { AtSign, ShieldCheck, Zap, Globe } from 'lucide-react';
import { soundManager } from '../lib/sounds';
import { signInWithGoogle } from '../lib/firebase';

interface OnboardingScreenProps {
  next: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ next }) => {
  const [errorStatus, setErrorStatus] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setErrorStatus(null);
      soundManager.playClick();
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login error details:", error);
      soundManager.playAlert();
      
      const errorCode = error.code || '';
      
      if (errorCode === 'auth/popup-blocked') {
        setErrorStatus("O popup de login foi bloqueado. Por favor, permita janelas pop-up para este site.");
      } else if (errorCode === 'auth/unauthorized-domain' || error.message?.includes('unauthorized-domain')) {
        setErrorStatus(`Domínio não autorizado: ${window.location.hostname}. Adicione este domínio no Console do Firebase > Authentication > Settings > Authorized Domains.`);
      } else if (errorCode === 'auth/operation-not-allowed') {
        setErrorStatus("O login com Google não está ativado no Firebase. Ative-o em Authentication > Sign-in method.");
      } else {
        setErrorStatus("Não foi possível conectar com o Google. Verifique sua permissão de domínio no Firebase.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-between p-8 overflow-hidden relative font-sans">
      {/* Animated BG Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] bg-indigo-600/30 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-600/20 rounded-full blur-[100px]" />

      <div className="flex-1 flex flex-col items-center justify-center gap-10 relative z-10 w-full max-w-sm text-center">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mb-4 border border-white/10 shadow-primary-glow"
        >
          <div className="p-4 bg-indigo-500 rounded-2xl shadow-primary-glow">
            <AtSign className="w-10 h-10 text-white" />
          </div>
        </motion.div>

        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white tracking-tighter">Arroba</h1>
          <p className="text-slate-400 font-bold text-xl leading-snug">
            Sua identidade <span className="text-indigo-400">é</span> sua soberania.
          </p>
        </div>

        {errorStatus && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-[10px] font-black text-red-400 uppercase tracking-wider leading-relaxed"
          >
            {errorStatus}
            {errorStatus.includes("Domínio") && (
              <p className="mt-2 text-slate-400 font-bold lowercase normal-case">
                Dica: Vá no console do Firebase &gt; Authentication &gt; Settings &gt; Authorized Domains e adicione este domínio: {window.location.hostname}
              </p>
            )}
          </motion.div>
        )}

        <div className="grid grid-cols-3 gap-2 w-full pt-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-indigo-400"><ShieldCheck className="w-5 h-5"/></div>
            <span className="text-[8px] font-black uppercase text-slate-500">Privado</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-fuchsia-400"><Zap className="w-5 h-5"/></div>
            <span className="text-[8px] font-black uppercase text-slate-500">Rápido</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-cyan-400"><Globe className="w-5 h-5"/></div>
            <span className="text-[8px] font-black uppercase text-slate-500">Universal</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-sm pb-12 flex flex-col gap-4 relative z-10">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          className="w-full bg-white text-slate-900 font-black py-5 rounded-3xl shadow-xl flex items-center justify-center gap-4 transition-all hover:bg-slate-50 border-b-4 border-slate-200 active:border-b-0"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <span className="text-lg">Entrar com Google</span>
        </motion.button>
        
        <p className="text-[10px] text-center text-slate-500 font-black uppercase tracking-[0.2em] py-4">
          Conexão Segura & Criptografada
        </p>

        <div className="flex justify-center gap-2">
          <div className="w-8 h-1.5 bg-indigo-500 rounded-full shadow-primary-glow" />
          <div className="w-2 h-1.5 bg-white/10 rounded-full" />
          <div className="w-2 h-1.5 bg-white/10 rounded-full" />
        </div>
      </div>
    </div>
  );
};

