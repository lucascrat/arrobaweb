import React, { useState } from 'react';
import { Search, AtSign, Check, Lock, ShieldCheck, ChevronRight, User, Store, Briefcase, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import { auth, signInWithGoogle, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs, limit, getDoc, updateDoc } from 'firebase/firestore';

interface RegistrationScreenProps {
  next: () => void;
}

type AccountType = 'personal' | 'business';

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ next }) => {
  const [username, setUsername] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [storeName, setStoreName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from store name
  const professionalSlug = storeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  
  const handleTypeChange = (type: AccountType) => {
    setAccountType(type);
    soundManager.playClick();
  };

  const handleNext = async () => {
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    
    if (cleanUsername.length < 3) {
      setError("O nome de usuário @ deve ter pelo menos 3 caracteres (letras, números ou sublinhados).");
      soundManager.playAlert();
      return;
    }

    if (accountType === 'business' && storeName.trim().length < 3) {
      setError("O nome da loja deve ter pelo menos 3 caracteres.");
      soundManager.playAlert();
      return;
    }
    soundManager.playChime();
    setIsRegistering(true);
    setError(null);

    try {
      // 1. Google Auth
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const result = await signInWithGoogle();
        currentUser = result.user;
      }

      if (!currentUser) throw new Error('Falha na autenticação');

      const isBusiness = accountType === 'business';

      // 1.5 Check if username is taken - query lowercase
      const q = query(
        collection(db, 'users'),
        where('username', '==', cleanUsername),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const existingUser = snapshot.docs[0];
        if (existingUser.id !== currentUser.uid) {
          throw new Error('Este @username já está em uso por outro soberano.');
        }
      }

      // 2. Save/Update to Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Check slug uniqueness for business accounts
        if (isBusiness && professionalSlug) {
          const slugQ = query(
            collection(db, 'users'),
            where('professionalSlug', '==', professionalSlug),
            limit(1)
          );
          const slugSnap = await getDocs(slugQ);
          if (!slugSnap.empty && slugSnap.docs[0].id !== currentUser.uid) {
            throw new Error(`O nome de loja "${professionalSlug}" já está em uso. Escolha outro nome.`);
          }
        }

        const userData = {
          uid: currentUser.uid,
          username: cleanUsername,
          accountType,
          storeName: isBusiness ? (storeName.trim() || 'Minha Loja') : null,
          professionalSlug: isBusiness ? professionalSlug : null,
          storeMode: isBusiness ? null : null, // Set to null initially for business
          storeDescription: '',
          onboardingCompleted: isBusiness ? false : true,
          accessCodeEnabled: false,
          email: currentUser.email || '',
          displayName: currentUser.displayName || cleanUsername,
          photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          online: true,
          lastSeen: serverTimestamp()
        };
        await setDoc(userRef, userData);
      } else {
        // User already exists
        const existingData = userSnap.data();
        if (existingData.username !== cleanUsername) {
           throw new Error('Você já possui um @username. Não é possível alterá-lo.');
        }
        await updateDoc(userRef, {
          online: true,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      soundManager.playChime();
      next();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro ao criar sua conta.');
      soundManager.playAlert();
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-8 overflow-x-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-5%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 justify-between z-50">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1 bg-indigo-500 rounded-lg shadow-primary-glow">
            <AtSign className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-white">Arroba</h1>
        </div>
        <Search className="w-6 h-6 text-slate-400" />
      </header>

      <main className="flex-1 mt-20 flex flex-col items-center relative z-10 w-full max-w-sm mx-auto">
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center mb-4 shadow-glass transition-all hover:scale-105">
            {accountType === 'personal' ? (
              <User className="w-10 h-10 text-indigo-400" fill="currentColor" />
            ) : (
              <Store className="w-10 h-10 text-fuchsia-400" fill="currentColor" />
            )}
          </div>
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
            {accountType === 'personal' ? 'Crie seu @único' : 'Crie seu @comercial'}
          </h2>
          <p className="text-slate-400 font-bold text-sm">
            {accountType === 'personal' ? 'Sua identidade soberana começa aqui.' : 'Sua marca com soberania digital.'}
          </p>
        </div>

        {/* Account Type Toggle */}
        <div className="w-full flex p-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 mb-8">
          <button 
            onClick={() => handleTypeChange('personal')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${accountType === 'personal' ? 'bg-indigo-500 text-white shadow-primary-glow' : 'text-slate-500'}`}
          >
            <User className="w-3.5 h-3.5" /> Pessoal
          </button>
          <button 
            onClick={() => handleTypeChange('business')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${accountType === 'business' ? 'bg-fuchsia-500 text-white shadow-primary-glow' : 'text-slate-500'}`}
          >
            <Store className="w-3.5 h-3.5" /> Empresarial
          </button>
        </div>

        <div className="w-full space-y-8">
          <AnimatePresence mode="wait">
            <motion.div 
              key={accountType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {accountType === 'business' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-[0.2em]">Nome da Loja</label>
                  <div className="h-16 p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 focus-within:border-fuchsia-500/30 transition-all">
                    <Briefcase className="w-5 h-5 text-slate-500" />
                    <input 
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 w-full text-white font-medium outline-none" 
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

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-[0.2em]">Sua Identidade Única</label>
                <div className={`p-6 rounded-[2.5rem] bg-white/5 backdrop-blur-xl border border-white/10 flex items-center gap-2 shadow-glass transition-all ${accountType === 'personal' ? 'focus-within:border-indigo-500/50' : 'focus-within:border-fuchsia-500/50'}`}>
                  <span className={`text-4xl font-black ${accountType === 'personal' ? 'text-indigo-500' : 'text-fuchsia-500'}`}>@</span>
                  <input 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-3xl font-black p-0 w-full text-white placeholder-white/20 outline-none"
                    placeholder="nome"
                  />
                </div>
                <div className="flex items-center gap-2 px-4 transition-all animate-pulse">
                  <Check className={`w-4 h-4 ${accountType === 'personal' ? 'text-cyan-400' : 'text-fuchsia-400'}`} />
                  <span className={`text-xs font-black uppercase tracking-widest ${accountType === 'personal' ? 'text-cyan-400' : 'text-fuchsia-400'}`}>Domínio Disponível!</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="space-y-5">
            <div className="p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl flex items-center gap-4">
              <img 
                src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} 
                className="w-10 h-10 rounded-xl border border-white/10 bg-slate-800" 
                alt="Profile" 
              />
              <div className="flex-1">
                <h4 className="text-white font-bold text-xs">{auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Usuário'}</h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Identidade Validada</p>
              </div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-bold text-center uppercase tracking-wider">
                {error}
              </div>
            )}
          </div>


          <div className={`p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] flex gap-4 items-start shadow-glass ${accountType === 'personal' ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-fuchsia-500/20 bg-fuchsia-500/5'}`}>
            <div className={`p-3 rounded-2xl shadow-primary-glow ${accountType === 'personal' ? 'bg-indigo-500' : 'bg-fuchsia-500'}`}>
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1">
              <h3 className={`font-bold text-sm ${accountType === 'personal' ? 'text-indigo-100' : 'text-fuchsia-100'}`}>Soberania Digital</h3>
              <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
                {accountType === 'personal' 
                  ? 'Seu @único é sua chave universal. Controle total sobre seus dados e conexões em toda a rede.'
                  : 'Sua marca agora com identidade própria e soberania total no ecossistema Arroba.'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="w-full mt-12 pb-12">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={isRegistering}
            className={`w-full text-white font-black py-5 rounded-3xl shadow-primary-glow flex items-center justify-center gap-3 transition-all uppercase tracking-widest text-sm ${isRegistering ? 'opacity-50 cursor-wait' : (accountType === 'personal' ? 'bg-indigo-500' : 'bg-fuchsia-500')}`}
          >
            {isRegistering ? 'Processando Identidade...' : 'Finalizar Cadastro'} <ChevronRight className="w-5 h-5" />
          </motion.button>
          <p className="text-[10px] text-center text-slate-600 mt-6 leading-relaxed font-bold uppercase tracking-wider px-4">
            Ao finalizar, você concorda com nossos termos de privacidade e auto-custódia.
          </p>
        </div>
      </main>
    </div>
  );
};
