import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { soundManager } from '../lib/sounds';
import {
  Store, MessageCircle, ShoppingBag, Calendar, AtSign, Lock, ArrowRight, Loader,
  Package, X, CheckCircle, Send, User, Copy, Check,
} from 'lucide-react';

interface PublicStoreScreenProps {
  slug: string;
  onClose?: () => void;
}

interface StoreData {
  id: string;
  username: string | null;
  store_name: string | null;
  store_mode: 'store' | 'store+ai' | 'scheduling' | null;
  store_description: string | null;
  store_logo: string | null;
  photo_url: string | null;
  display_name: string | null;
  theme_color: string | null;
  access_code_enabled: boolean;
  access_code: string | null;
  config: Record<string, any> | null;
  efi_config: Record<string, any> | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  description: string | null;
  image: string | null;
  category: string | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string | null;
}

export const PublicStoreScreen: React.FC<PublicStoreScreenProps> = ({ slug, onClose }) => {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showSchedulingForm, setShowSchedulingForm] = useState(false);
  const [schedulingData, setSchedulingData] = useState({ name: '', phone: '', time: '' });
  const [schedulingStatus, setSchedulingStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessages, setAiMessages] = useState<any[]>([
    { id: '1', role: 'ai', text: 'Olá! Sou o assistente virtual da loja. Como posso te ajudar hoje?' },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, store_name, store_mode, store_description, store_logo, photo_url, display_name, theme_color, access_code_enabled, access_code, config, efi_config')
        .eq('professional_slug', slug)
        .eq('account_type', 'business')
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const store = data as StoreData;
      setStoreData(store);
      if (!store.access_code_enabled) setAccessGranted(true);

      const [pr, sv] = await Promise.all([
        supabase.from('products').select('*').eq('owner_id', store.id).eq('active', true).order('created_at', { ascending: false }),
        supabase.from('services').select('*').eq('owner_id', store.id).eq('active', true).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      setProducts((pr.data as Product[]) || []);
      setServices((sv.data as Service[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  const handleAccessCheck = () => {
    if (!storeData) return;
    if (accessCode.toUpperCase() === (storeData.access_code || '').toUpperCase()) {
      setAccessGranted(true);
      setAccessError('');
      soundManager.playChime();
    } else {
      setAccessError('Código inválido.');
      soundManager.playAlert();
    }
  };

  const handleScheduleService = async () => {
    if (!storeData || !selectedService || !schedulingData.name || !schedulingData.phone || !schedulingData.time) return;
    setSchedulingStatus('saving');
    try {
      const { error } = await supabase.from('appointments').insert({
        owner_id: storeData.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        customer_name: schedulingData.name,
        customer_phone: schedulingData.phone,
        appointment_time: new Date(schedulingData.time).toISOString(),
        status: 'pending',
      });
      if (error) throw error;
      setSchedulingStatus('success');
      soundManager.playChime();
      setTimeout(() => {
        setShowSchedulingForm(false);
        setSelectedService(null);
        setSchedulingStatus('idle');
        setSchedulingData({ name: '', phone: '', time: '' });
      }, 2500);
    } catch (err) {
      console.error(err);
      soundManager.playAlert();
      setSchedulingStatus('idle');
    }
  };

  const handleSendAi = async () => {
    if (!aiInput.trim() || !storeData) return;
    const userMsg = { id: String(Date.now()), role: 'user', text: aiInput };
    setAiMessages(m => [...m, userMsg]);
    setAiInput('');
    setIsAiTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: aiInput,
          context: {
            storeName: storeData.store_name,
            description: storeData.store_description,
            products,
            services,
          },
        }),
      });
      const data = await res.json();
      setAiMessages(m => [...m, { id: String(Date.now() + 1), role: 'ai', text: data.reply || 'Desculpe, não consegui responder agora.' }]);
    } catch {
      setAiMessages(m => [...m, { id: String(Date.now() + 1), role: 'ai', text: 'Erro de conexão.' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs">Carregando loja...</p>
      </div>
    );
  }

  if (notFound || !storeData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Store className="w-16 h-16 text-slate-700 mb-4" />
        <h1 className="text-xl font-black text-white mb-2">Loja não encontrada</h1>
        <p className="text-slate-500 text-sm">O link <span className="text-indigo-400">{slug}.arroba.live</span> não existe ou foi removido.</p>
        {onClose && (
          <button onClick={onClose} className="mt-6 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Voltar</button>
        )}
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-fuchsia-500/20 rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <Lock className="w-10 h-10 text-fuchsia-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">{storeData.store_name}</h1>
            <p className="text-slate-400 text-sm font-bold">Loja privada — informe o código de acesso.</p>
          </div>
          <input
            value={accessCode}
            onChange={e => { setAccessCode(e.target.value.toUpperCase()); setAccessError(''); }}
            placeholder="ABC123"
            maxLength={6}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-black tracking-[0.4em] text-center text-2xl"
          />
          {accessError && <p className="text-red-400 text-xs font-bold text-center mt-3">{accessError}</p>}
          <button onClick={handleAccessCheck}
            className="w-full mt-6 bg-fuchsia-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-2">
            Entrar <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const hasProducts = storeData.store_mode !== 'scheduling';
  const hasServices = storeData.store_mode === 'scheduling';
  const hasAi = storeData.store_mode === 'store+ai';
  const welcome = storeData.config?.welcomeMessage || 'Bem-vindo à nossa loja!';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-32 relative">
      <header className="pt-12 pb-8 px-6 text-center relative">
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-600/20 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-white/5 border-4 border-white/10 overflow-hidden">
            <img
              src={storeData.store_logo || storeData.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${storeData.store_name || slug}`}
              className="w-full h-full object-cover"
              alt={storeData.store_name || ''}
            />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">{storeData.store_name}</h1>
          <p className="text-slate-400 text-sm font-bold flex items-center justify-center gap-1">
            <AtSign className="w-3.5 h-3.5" /> {storeData.username}
          </p>
        </div>
      </header>

      <div className="px-6 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center">
          <p className="text-slate-300 text-sm leading-relaxed">{welcome}</p>
        </div>
      </div>

      {hasAi && (
        <div className="px-6 mb-6">
          <button onClick={() => setShowAiChat(true)}
            className="w-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
            <MessageCircle className="w-5 h-5" /> Conversar com Atendente IA
          </button>
        </div>
      )}

      {hasServices && services.length > 0 && (
        <div className="px-6 mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Serviços</h2>
          <div className="space-y-3">
            {services.map(s => (
              <div key={s.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{s.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{s.duration} min</p>
                  <p className="text-emerald-400 font-black text-sm">R$ {s.price.toFixed(2).replace('.', ',')}</p>
                </div>
                <button
                  onClick={() => { setSelectedService(s); setShowSchedulingForm(true); }}
                  className="bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest"
                >
                  Agendar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasProducts && products.length > 0 && (
        <div className="px-6 mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Catálogo</h2>
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <button key={p.id} onClick={() => setSelectedProduct(p)}
                className="bg-white/5 border border-white/10 rounded-2xl p-3 text-left active:scale-95 transition-transform">
                {p.image ? (
                  <img src={p.image} className="w-full aspect-square object-cover rounded-xl mb-3" alt={p.name} />
                ) : (
                  <div className="w-full aspect-square bg-white/5 rounded-xl mb-3 flex items-center justify-center">
                    <Package className="w-8 h-8 text-slate-600" />
                  </div>
                )}
                <p className="text-white font-bold text-xs truncate">{p.name}</p>
                <p className="text-fuchsia-400 font-black text-sm mt-1">R$ {p.price.toFixed(2).replace('.', ',')}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {((hasProducts && products.length === 0) || (hasServices && services.length === 0)) && (
        <div className="text-center py-16 px-6">
          <ShoppingBag className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Esta loja ainda não cadastrou {hasServices ? 'serviços' : 'produtos'}.</p>
        </div>
      )}

      {/* Modal produto */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}
              className="w-full bg-slate-900 rounded-t-3xl max-h-[85vh] overflow-y-auto">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 p-2 bg-black/40 backdrop-blur-md rounded-xl text-white">
                <X className="w-5 h-5" />
              </button>
              {selectedProduct.image && <img src={selectedProduct.image} className="w-full aspect-square object-cover" alt={selectedProduct.name} />}
              <div className="p-6 space-y-4">
                <h2 className="text-2xl font-black text-white">{selectedProduct.name}</h2>
                {selectedProduct.description && <p className="text-slate-300 text-sm">{selectedProduct.description}</p>}
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-black text-fuchsia-400">R$ {selectedProduct.price.toFixed(2).replace('.', ',')}</p>
                  {selectedProduct.original_price && (
                    <p className="text-slate-600 text-sm line-through">R$ {selectedProduct.original_price.toFixed(2).replace('.', ',')}</p>
                  )}
                </div>
                <button className="w-full bg-fuchsia-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm">
                  Comprar via WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal agendamento */}
      <AnimatePresence>
        {showSchedulingForm && selectedService && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full bg-slate-900 rounded-t-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black text-white">Agendar</h2>
                    <p className="text-emerald-400 text-sm font-bold">{selectedService.name}</p>
                  </div>
                  <button onClick={() => { setShowSchedulingForm(false); setSelectedService(null); }} className="p-2 bg-white/5 rounded-xl text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {schedulingStatus === 'success' ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-white">Solicitação enviada!</h3>
                    <p className="text-slate-400 text-sm mt-2">A loja vai confirmar pelo WhatsApp.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Seu nome</label>
                      <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                        <User className="w-4 h-4 text-slate-500" />
                        <input value={schedulingData.name} onChange={e => setSchedulingData(d => ({ ...d, name: e.target.value }))}
                          placeholder="Nome completo" className="bg-transparent text-white outline-none w-full" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">WhatsApp</label>
                      <input value={schedulingData.phone} onChange={e => setSchedulingData(d => ({ ...d, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Data e hora</label>
                      <input type="datetime-local" value={schedulingData.time} onChange={e => setSchedulingData(d => ({ ...d, time: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" />
                    </div>

                    <button onClick={handleScheduleService}
                      disabled={schedulingStatus === 'saving' || !schedulingData.name || !schedulingData.phone || !schedulingData.time}
                      className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                      {schedulingStatus === 'saving' ? <Loader className="w-5 h-5 animate-spin" /> : 'Solicitar Agendamento'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat IA */}
      <AnimatePresence>
        {showAiChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950 z-[200] flex flex-col">
            <header className="h-16 flex items-center justify-between px-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">Atendente IA</p>
                  <p className="text-[10px] text-emerald-400 font-bold">Online</p>
                </div>
              </div>
              <button onClick={() => setShowAiChat(false)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-200 border border-white/10'}`}>
                    <p className="text-sm">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                    <Loader className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 flex gap-2">
              <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendAi()}
                placeholder="Digite sua pergunta..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none" />
              <button onClick={handleSendAi} disabled={!aiInput.trim() || isAiTyping}
                className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center disabled:opacity-50">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
