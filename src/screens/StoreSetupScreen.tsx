import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, ShoppingBag, Calendar, MessageCircle, ArrowRight, Eye, CheckCircle, Loader } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { soundManager } from '../lib/sounds';
import { Screen } from '../types';

interface StoreSetupScreenProps {
  setScreen: (s: Screen) => void;
}

interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: {
    storeMode: 'store' | 'store+ai' | 'scheduling';
  };
}

export const StoreSetupScreen: React.FC<StoreSetupScreenProps> = ({ setScreen }) => {
  const { user, profile } = useAuth();
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<StoreTemplate | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'storeTemplates'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreTemplate)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApply = async (tmpl: StoreTemplate) => {
    if (!user) return;
    setApplying(true);
    soundManager.playClick();
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        storeMode: tmpl.config.storeMode,
        storeDescription: tmpl.description,
        templateId: tmpl.id,
        onboardingCompleted: true,
        updatedAt: serverTimestamp()
      });
      soundManager.playSent();
      setScreen('chat-list');
    } catch (err) {
      console.error(err);
      soundManager.playAlert();
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Carregando Modelos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px]" />
      
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 justify-between z-50">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-fuchsia-500 rounded-lg">
            <Store className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">Configurar sua Loja</h1>
        </div>
        <button onClick={() => setScreen('chat-list')} className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pular</button>
      </header>

      <main className="flex-1 mt-20 p-6 pb-32">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black text-white mb-2">Escolha seu Modelo</h2>
          <p className="text-slate-500 text-sm font-bold">Selecione o tipo de negócio que melhor representa sua operação.</p>
        </div>

        <div className="grid gap-4">
          {templates.map((tmpl) => (
            <motion.div
              key={tmpl.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedId(tmpl.id)}
              className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative overflow-hidden group ${
                selectedId === tmpl.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5 bg-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    tmpl.config.storeMode === 'scheduling' ? 'bg-emerald-500/20 text-emerald-400' :
                    tmpl.config.storeMode === 'store+ai' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {tmpl.config.storeMode === 'scheduling' ? <Calendar className="w-5 h-5" /> : 
                     tmpl.config.storeMode === 'store+ai' ? <MessageCircle className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-white font-black">{tmpl.name}</h3>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{tmpl.category}</p>
                  </div>
                </div>
                {selectedId === tmpl.id && (
                  <CheckCircle className="w-5 h-5 text-indigo-500" />
                )}
              </div>
              
              <p className="text-slate-400 text-xs leading-relaxed mb-6 line-clamp-2">{tmpl.description}</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setPreviewTemplate(tmpl); }}
                  className="flex-1 py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                   <Eye className="w-3.5 h-3.5" /> Detalhes
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleApply(tmpl); }}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    selectedId === tmpl.id ? 'bg-indigo-500 text-white shadow-primary-glow' : 'bg-indigo-500/20 text-indigo-400'
                  }`}
                >
                  Confirmar <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-20 bg-white/5 border border-dashed border-white/5 rounded-[2rem]">
            <Store className="w-12 h-12 text-slate-800 mx-auto mb-4" />
            <p className="text-slate-500 font-bold text-sm">Nenhum modelo disponível no momento</p>
          </div>
        )}
      </main>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[200] flex flex-col pt-16"
          >
            <div className="flex-1 overflow-y-auto p-8 text-center">
              <div className="w-24 h-24 bg-white/5 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/10">
                {previewTemplate.config.storeMode === 'scheduling' ? <Calendar className="w-10 h-10 text-emerald-400" /> : 
                 previewTemplate.config.storeMode === 'store+ai' ? <MessageCircle className="w-10 h-10 text-fuchsia-400" /> : <ShoppingBag className="w-10 h-10 text-indigo-400" />}
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{previewTemplate.name}</h2>
              <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px] mb-8">{previewTemplate.category}</p>
              
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 text-left mb-8">
                <p className="text-slate-300 text-sm leading-relaxed">{previewTemplate.description}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><CheckCircle className="w-4 h-4"/></div>
                  <p className="text-xs font-bold text-slate-300">Layout Mobile Profissional</p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><CheckCircle className="w-4 h-4"/></div>
                  <p className="text-xs font-bold text-slate-300">Gestão de Catálogo Integrada</p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><CheckCircle className="w-4 h-4"/></div>
                  <p className="text-xs font-bold text-slate-300">Subdomínio @arroba.live</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 flex gap-3">
              <button 
                onClick={() => setPreviewTemplate(null)}
                className="flex-1 py-4 bg-white/5 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs"
              >
                Voltar
              </button>
              <button 
                onClick={() => handleApply(previewTemplate)}
                disabled={applying}
                className="flex-[2] py-4 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-primary-glow flex items-center justify-center gap-2"
              >
                {applying ? <Loader className="w-5 h-5 animate-spin" /> : 'Usar este Modelo'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
