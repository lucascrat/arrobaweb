import React, { useState } from 'react';
import { AtSign, Lock, ShieldCheck, ChevronRight, User, Store, Briefcase, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { register, login, type AccountType } from '../lib/auth';
import { normalizeSlug, validateSlug } from '../lib/slug';
import { supabase } from '../lib/supabase';

interface RegistrationScreenProps {
  next: () => void;
  onGoToLogin?: () => void;
}

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ next, onGoToLogin }) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanUser = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
  const professionalSlug = normalizeSlug(storeName);

  const submit = async () => {
    setError(null);
    if (cleanUser.length < 3) {
      setError('O usuário precisa de pelo menos 3 caracteres (letras, números ou underline).');
      soundManager.playAlert();
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa de pelo menos 6 caracteres.');
      soundManager.playAlert();
      return;
    }
    setBusy(true);

    try {
      if (mode === 'login') {
        const result = await login(cleanUser, password);
        if (!result.ok) throw new Error(result.error || 'Falha no login.');
        soundManager.playChime();
        next();
        return;
      }

      // === Registro ===
      if (accountType === 'business') {
        if (storeName.trim().length < 3) {
          throw new Error('O nome da loja precisa de pelo menos 3 caracteres.');
        }
        // Garante que o slug não bate com outra loja
        const check = await validateSlug(professionalSlug);
        if (!check.ok) throw new Error(check.message);
      }

      const result = await register({
        username: cleanUser,
        password,
        accountType,
        storeName: accountType === 'business' ? storeName : undefined,
      });
      if (!result.ok || !result.userId) throw new Error(result.error || 'Falha no cadastro.');

      // Aplica slug profissional logo após registro
      if (accountType === 'business' && professionalSlug) {
        await supabase
          .from('profiles')
          .update({ professional_slug: professionalSlug })
          .eq('id', result.userId);
      }

      soundManager.playChime();
      next();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
      soundManager.playAlert();
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: 'register' | 'login') => {
    setMode(m);
    setError(null);
    soundManager.playClick();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-8 overflow-x-hidden relative">
      <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 z-50">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1 bg-indigo-500 rounded-lg shadow-primary-glow">
            <AtSign className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white">Arroba</h1>
        </div>
      </header>

      <main className="flex-1 mt-20 flex flex-col items-center relative z-10 w-full max-w-sm mx-auto">
        {/* Toggle Login / Register */}
        <div className="w-full flex p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 mb-8">
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mode === 'register' ? 'bg-indigo-500 text-white shadow-primary-glow' : 'text-slate-500'
            }`}
          >
            Criar conta
          </button>
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mode === 'login' ? 'bg-fuchsia-500 text-white shadow-primary-glow' : 'text-slate-500'
            }`}
          >
            Entrar
          </button>
        </div>

        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center mb-4 shadow-glass">
            {mode === 'login' ? (
              <Lock className="w-10 h-10 text-fuchsia-400" />
            ) : accountType === 'personal' ? (
              <User className="w-10 h-10 text-indigo-400" fill="currentColor" />
            ) : (
              <Store className="w-10 h-10 text-fuchsia-400" fill="currentColor" />
            )}
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            {mode === 'login'
              ? 'Bem-vindo de volta'
              : accountType === 'personal'
              ? 'Crie seu @único'
              : 'Crie seu @comercial'}
          </h2>
          <p className="text-slate-400 font-bold text-sm">
            {mode === 'login' ? 'Entre com seu usuário e senha.' : 'Sua identidade soberana começa aqui.'}
          </p>
        </div>

        {/* Account Type Toggle (apenas no registro) */}
        {mode === 'register' && (
          <div className="w-full flex p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 mb-6">
            <button
              onClick={() => { setAccountType('personal'); soundManager.playClick(); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                accountType === 'personal' ? 'bg-indigo-500 text-white' : 'text-slate-500'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Pessoal
            </button>
            <button
              onClick={() => { setAccountType('business'); soundManager.playClick(); }}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                accountType === 'business' ? 'bg-fuchsia-500 text-white' : 'text-slate-500'
              }`}
            >
              <Store className="w-3.5 h-3.5" /> Empresarial
            </button>
          </div>
        )}

        <div className="w-full space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + accountType}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {mode === 'register' && accountType === 'business' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-[0.2em]">
                    Nome da Loja
                  </label>
                  <div className="h-14 px-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 focus-within:border-fuchsia-500/30 transition-all">
                    <Briefcase className="w-5 h-5 text-slate-500" />
                    <input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="bg-transparent w-full text-white font-medium outline-none text-sm"
                      placeholder="Minha Incrível Loja"
                    />
                  </div>
                  {professionalSlug && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl">
                      <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" />
                      <span className="text-xs font-black text-fuchsia-300">
                        🌐 {professionalSlug}.arroba.live
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-[0.2em]">
                  Usuário
                </label>
                <div className="px-5 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-glass focus-within:border-indigo-500/50 transition-all">
                  <span className={`text-2xl font-black ${accountType === 'personal' ? 'text-indigo-500' : 'text-fuchsia-500'}`}>@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-transparent text-2xl font-black w-full text-white placeholder-white/20 outline-none"
                    placeholder="seu_usuario"
                    autoCapitalize="none"
                    autoComplete={mode === 'login' ? 'username' : 'off'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-[0.2em]">
                  Senha
                </label>
                <div className="px-5 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center gap-3 shadow-glass focus-within:border-indigo-500/50 transition-all">
                  <Lock className="w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-transparent text-base font-bold w-full text-white placeholder-white/20 outline-none tracking-wider"
                    placeholder="••••••••"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="text-[10px] text-slate-600 px-4 font-bold">Mínimo 6 caracteres.</p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div className={`p-5 bg-white/5 backdrop-blur-md border rounded-[1.5rem] flex gap-3 items-start ${
              accountType === 'personal' ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-fuchsia-500/20 bg-fuchsia-500/5'
            }`}>
              <div className={`p-2.5 rounded-2xl shadow-primary-glow flex-shrink-0 ${
                accountType === 'personal' ? 'bg-indigo-500' : 'bg-fuchsia-500'
              }`}>
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className={`font-bold text-xs ${accountType === 'personal' ? 'text-indigo-100' : 'text-fuchsia-100'}`}>
                  Soberania Digital
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
                  Sem confirmação por email, sem amarras. Lembre-se da sua senha — não há recuperação automática.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="w-full mt-8 pb-12">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={submit}
            disabled={busy}
            className={`w-full text-white font-black py-5 rounded-3xl shadow-primary-glow flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-sm ${
              busy ? 'opacity-50 cursor-wait' : (accountType === 'personal' && mode === 'register' ? 'bg-indigo-500' : 'bg-fuchsia-500')
            }`}
          >
            {busy
              ? 'Processando...'
              : mode === 'login'
              ? 'Entrar'
              : 'Criar conta'}
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          <p className="text-[10px] text-center text-slate-600 mt-4 leading-relaxed font-bold uppercase tracking-wider px-4">
            {mode === 'register'
              ? 'Ao criar conta você concorda com nossos termos de uso.'
              : (
                <button
                  className="text-indigo-400 underline"
                  onClick={() => switchMode('register')}
                >
                  Não tem conta? Criar agora.
                </button>
              )}
          </p>
        </div>
      </main>
    </div>
  );
};
