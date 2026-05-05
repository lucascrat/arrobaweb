import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Store, MessageCircle, ShoppingBag, Calendar, AtSign, Lock, ArrowRight, Loader, Star, MapPin } from 'lucide-react';

interface PublicStoreScreenProps {
  slug: string;
}

interface StoreData {
  uid: string;
  storeName: string;
  username: string;
  storeMode: 'store' | 'store+ai' | 'scheduling';
  storeDescription: string;
  storeLogo: string;
  photoURL: string;
  accessCodeEnabled: boolean;
  storeTheme: string;
  displayName: string;
}

export const PublicStoreScreen: React.FC<PublicStoreScreenProps> = ({ slug }) => {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        // Search by professionalSlug
        const q = query(
          collection(db, 'users'),
          where('professionalSlug', '==', slug),
          where('accountType', '==', 'business'),
          limit(1)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setNotFound(true);
        } else {
          const data = snap.docs[0].data() as StoreData;
          setStoreData(data);
          // If no access code required, grant access immediately
          if (!data.accessCodeEnabled) {
            setAccessGranted(true);
          }
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [slug]);

  const handleAccessCode = async () => {
    if (!accessCode.trim() || !storeData) return;
    setCheckingCode(true);
    setAccessError('');

    try {
      const codeRef = doc(db, 'stores', storeData.uid, 'accessCodes', accessCode.trim().toUpperCase());
      const codeSnap = await getDoc(codeRef);

      if (codeSnap.exists()) {
        const codeData = codeSnap.data();
        const now = Date.now();
        if (codeData.expiresAt?.toMillis() > now) {
          setAccessGranted(true);
        } else {
          setAccessError('Código expirado. Solicite um novo código.');
        }
      } else {
        setAccessError('Código inválido. Verifique e tente novamente.');
      }
    } catch {
      setAccessError('Erro ao verificar código. Tente novamente.');
    } finally {
      setCheckingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-500 font-black uppercase tracking-widest text-[10px]">Carregando loja...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Store className="w-10 h-10 text-slate-600" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Loja não encontrada</h1>
          <p className="text-slate-500 text-sm">O link <span className="text-indigo-400 font-bold">{slug}.arroba.live</span> não existe ou foi removido.</p>
          <a href="https://arroba.live" className="mt-6 inline-flex items-center gap-2 text-indigo-400 font-bold text-sm hover:underline">
            <AtSign className="w-4 h-4" /> Criar minha loja no Arroba
          </a>
        </div>
      </div>
    );
  }

  // Access Code Gate
  if (storeData?.accessCodeEnabled && !accessGranted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[10%] left-[-5%] w-[200px] h-[200px] bg-fuchsia-500/10 rounded-full blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm z-10"
        >
          <div className="text-center mb-8">
            <img
              src={storeData.storeLogo || storeData.photoURL}
              className="w-24 h-24 rounded-3xl object-cover mx-auto mb-4 border-4 border-white/10 shadow-2xl"
              alt={storeData.storeName}
            />
            <h1 className="text-2xl font-black text-white">{storeData.storeName}</h1>
            <p className="text-slate-400 text-sm mt-1">@{storeData.username}</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">Código de Acesso</h2>
                <p className="text-slate-400 text-xs">Esta loja é privada. Insira seu código.</p>
              </div>
            </div>

            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="000000"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-2xl font-black text-white tracking-[0.5em] placeholder-white/20 focus:outline-none focus:border-indigo-500/50 mb-3"
            />

            {accessError && (
              <p className="text-red-400 text-xs text-center mb-3 font-bold">{accessError}</p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAccessCode}
              disabled={checkingCode || accessCode.length < 4}
              className="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {checkingCode ? <Loader className="w-5 h-5 animate-spin" /> : <>Acessar <ArrowRight className="w-4 h-4" /></>}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Main Store Page
  const modeIcon = storeData?.storeMode === 'scheduling' ? <Calendar className="w-5 h-5" /> :
    storeData?.storeMode === 'store+ai' ? <MessageCircle className="w-5 h-5" /> :
    <ShoppingBag className="w-5 h-5" />;

  const modeLabel = storeData?.storeMode === 'scheduling' ? 'Agendamentos' :
    storeData?.storeMode === 'store+ai' ? 'Loja + Atendimento IA' : 'Catálogo de Produtos';

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-x-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-indigo-900/30 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 p-6 pt-12 text-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <img
            src={storeData?.storeLogo || storeData?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${storeData?.storeName}`}
            className="w-28 h-28 rounded-3xl object-cover mx-auto mb-4 border-4 border-white/10 shadow-2xl"
            alt={storeData?.storeName}
          />
          <h1 className="text-3xl font-black text-white mb-1">{storeData?.storeName}</h1>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-3">
            <AtSign className="w-4 h-4" />
            <span>{storeData?.username}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-bold">
            {modeIcon}
            {modeLabel}
          </div>
        </motion.div>
      </header>

      {/* Description */}
      {storeData?.storeDescription && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-6 mb-6"
        >
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <p className="text-slate-300 text-sm leading-relaxed text-center">{storeData.storeDescription}</p>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-6 mb-8 space-y-3"
      >
        {storeData?.storeMode === 'scheduling' && (
          <button className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
            <Calendar className="w-5 h-5" /> Fazer Agendamento
          </button>
        )}
        {(storeData?.storeMode === 'store' || storeData?.storeMode === 'store+ai') && (
          <button className="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
            <ShoppingBag className="w-5 h-5" /> Ver Produtos
          </button>
        )}
        {storeData?.storeMode === 'store+ai' && (
          <button className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            <MessageCircle className="w-5 h-5 text-indigo-400" /> Falar com Atendente IA
          </button>
        )}
        <button className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-3 text-sm active:scale-95 transition-all">
          <MessageCircle className="w-4 h-4 text-slate-400" /> Enviar Mensagem
        </button>
      </motion.div>

      {/* Footer Arroba Branding */}
      <div className="text-center pb-8">
        <a href="https://arroba.live" className="inline-flex items-center gap-1.5 text-slate-600 text-xs font-bold hover:text-slate-400 transition-colors">
          <AtSign className="w-3.5 h-3.5" /> Criado com Arroba
        </a>
      </div>
    </div>
  );
};
