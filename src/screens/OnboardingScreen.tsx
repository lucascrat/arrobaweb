import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AtSign, ShieldCheck, Zap, Globe, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { soundManager } from '../lib/sounds';
import { 
  signInWithGoogle, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  auth
} from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

interface OnboardingScreenProps {
  next: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ next }) => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorStatus, setErrorStatus] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setErrorStatus(null);
      if (!Capacitor.isNativePlatform() && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setErrorStatus("O Google Login requer conexão segura (HTTPS).");
        soundManager.playAlert();
        return;
      }
      setLoading(true);
      soundManager.playClick();
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Login error:", error);
      soundManager.playAlert();
      const errorCode = error.code || '';
      if (errorCode === 'auth/popup-blocked') {
        setErrorStatus("O popup de login foi bloqueado.");
      } else if (errorCode === 'auth/unauthorized-domain') {
        setErrorStatus(`Domínio não autorizado: ${window.location.hostname}`);
      } else {
        setErrorStatus("Não foi possível conectar com o Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setErrorStatus("Preencha todos os campos.");
      return;
    }

    try {
      setErrorStatus(null);
      setLoading(true);
      soundManager.playClick();

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      soundManager.playAlert();
      const errorCode = error.code;
      if (errorCode === 'auth/email-already-in-use') {
        setErrorStatus("Este e-mail já está em uso.");
      } else if (errorCode === 'auth/invalid-credential') {
        setErrorStatus("E-mail ou senha incorretos.");
      } else if (errorCode === 'auth/weak-password') {
        setErrorStatus("A senha deve ter pelo menos 6 caracteres.");
      } else if (errorCode === 'auth/operation-not-allowed') {
        setErrorStatus("O método de Login com E-mail não está ativado no Firebase Console (Authentication > Sign-in method).");
      } else if (errorCode === 'auth/invalid-email') {
        setErrorStatus("O formato do e-mail é inválido.");
      } else {
        setErrorStatus(`Erro: ${errorCode || 'Tente novamente'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px]" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-600/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex p-4 bg-indigo-500 rounded-2xl shadow-primary-glow mb-2"
          >
            <AtSign className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-4xl font-black text-white tracking-tighter"
          >
            Arroba
          </motion.h1>
          <p className="text-slate-400 font-medium">Sua identidade digital, reimaginada.</p>
        </div>

        {/* Auth Card */}
        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Status/Error Messages */}
      <AnimatePresence mode="wait">
        {errorStatus && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-2xl text-xs font-bold text-red-400 uppercase tracking-wider text-center"
          >
            {errorStatus}
            {errorStatus.includes("Domínio") && (
              <p className="mt-2 text-slate-400 font-bold lowercase normal-case tracking-normal">
                Dica: Vá no Console do Firebase &gt; Auth &gt; Settings &gt; Authorized Domains e adicione "{window.location.hostname}".
              </p>
            )}
            {errorStatus.includes("Sign-in method") && (
              <p className="mt-2 text-slate-400 font-bold lowercase normal-case tracking-normal">
                Dica: Ative o método 'E-mail/Senha' ou 'Google' no Console do Firebase.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

          {/* Tab Switcher */}
          <div className="flex bg-slate-900/50 p-1 rounded-2xl mb-8 border border-white/5">
            <button 
              onClick={() => { setIsLogin(true); setErrorStatus(null); soundManager.playClick(); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${isLogin ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => { setIsLogin(false); setErrorStatus(null); soundManager.playClick(); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${!isLogin ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {!isLogin && (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text"
                  placeholder="Seu Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                />
              </div>
            )}
            
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input 
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 rounded-2xl transition-all shadow-primary-glow flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-widest text-sm">{isLogin ? 'Entrar Agora' : 'Finalizar Cadastro'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
            <span className="relative bg-slate-950 px-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Ou continue com</span>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-slate-900 font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm">Google Account</span>
          </button>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-indigo-400 group hover:bg-indigo-500/10 transition-colors"><ShieldCheck className="w-5 h-5"/></div>
            <span className="text-[9px] font-black uppercase text-slate-500 text-center leading-tight">Privacidade<br/>Total</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-fuchsia-400 group hover:bg-fuchsia-500/10 transition-colors"><Zap className="w-5 h-5"/></div>
            <span className="text-[9px] font-black uppercase text-slate-500 text-center leading-tight">Acesso<br/>Instantâneo</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-cyan-400 group hover:bg-cyan-500/10 transition-colors"><Globe className="w-5 h-5"/></div>
            <span className="text-[9px] font-black uppercase text-slate-500 text-center leading-tight">Alcance<br/>Global</span>
          </div>
        </div>

        <p className="text-[10px] text-center text-slate-600 font-black uppercase tracking-[0.2em]">
          Conexão Segura & Criptografada
        </p>
      </div>
    </div>
  );
};

