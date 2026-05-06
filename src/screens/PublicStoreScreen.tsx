import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, limit, doc, getDoc, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { soundManager } from '../lib/sounds';
import { Store, MessageCircle, ShoppingBag, Calendar, AtSign, Lock, ArrowRight, Loader, Package, X, CheckCircle, Send, User, QrCode, Copy, Check } from 'lucide-react';

interface PublicStoreScreenProps {
  slug: string;
  onClose?: () => void;
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
  accessCode?: string;
  storeTheme: string;
  displayName: string;
}

export const PublicStoreScreen: React.FC<PublicStoreScreenProps> = ({ slug, onClose }) => {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [showSchedulingQuiz, setShowSchedulingQuiz] = useState(false);
  const [schedulingData, setSchedulingData] = useState({ name: '', phone: '', time: '' });
  const [schedulingStatus, setSchedulingStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [showAiChat, setShowAiChat] = useState(false);
  const [aiMessages, setAiMessages] = useState<any[]>([
    { id: '1', role: 'ai', text: 'Olá! Sou o assistente virtual da loja. Como posso te ajudar hoje?' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [pixData, setPixData] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
          const ownerId = snap.docs[0].id;
          setStoreData({ ...data, uid: ownerId });
          if (!data.accessCodeEnabled) setAccessGranted(true);

          // Load products from Firestore
          const productsSnap = await getDocs(
            query(collection(db, 'stores', ownerId, 'products'), orderBy('createdAt', 'desc'))
          );
          setProducts(
            productsSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter((p: any) => p.active !== false)
          );

          // Load services if in scheduling mode
          if (data.storeMode === 'scheduling') {
            const servicesSnap = await getDocs(
              query(collection(db, 'stores', ownerId, 'services'), orderBy('createdAt', 'desc'))
            );
            setServices(
              servicesSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((s: any) => s.active !== false)
            );
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

  const handleAccessCode = () => {
    if (!accessCode.trim() || !storeData) return;
    setCheckingCode(true);
    setAccessError('');

    setTimeout(() => {
      if (accessCode.trim().toUpperCase() === storeData.accessCode?.toUpperCase()) {
        setAccessGranted(true);
      } else {
        setAccessError('Código inválido. Verifique e tente novamente.');
      }
      setCheckingCode(false);
    }, 800);
  };

  const handleConfirmScheduling = async () => {
    if (!storeData || !selectedService || !schedulingData.name || !schedulingData.phone || !schedulingData.time) return;
    setSchedulingStatus('saving');

    try {
      await addDoc(collection(db, 'stores', storeData.uid, 'appointments'), {
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        customerName: schedulingData.name,
        customerPhone: schedulingData.phone,
        appointmentTime: schedulingData.time,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSchedulingStatus('success');
      // If payment is enabled, offer to pay now
      if (storeData.efiConfig?.active) {
        handleStartCheckout(selectedService);
      }
      setTimeout(() => {
        setShowSchedulingQuiz(false);
        setSchedulingStatus('idle');
        setSchedulingData({ name: '', phone: '', time: '' });
      }, 3000);
    } catch (err) {
      alert('Erro ao confirmar agendamento. Tente novamente.');
      setSchedulingStatus('idle');
    }
  };
  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || isAiTyping) return;
    const userText = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setIsAiTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          context: {
            storeName: storeData?.storeName,
            description: storeData?.storeDescription,
            products: products.slice(0, 10).map(p => ({ name: p.name, price: p.price, desc: p.description })),
            services: services.slice(0, 10).map(s => ({ name: s.name, price: s.price, duration: s.duration }))
          }
        })
      });
      const data = await response.json();
      setAiMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: data.reply }]);
    } catch {
      setAiMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: 'Desculpe, tive um problema ao processar sua mensagem. Pode repetir?' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleStartCheckout = async (item: any) => {
    if (!storeData) return;
    setCheckoutLoading(true);
    setShowCheckout(true);

    try {
      const { createPixPayment } = await import('../lib/payments');
      const data = await createPixPayment(item.price, storeData.uid, `Pedido: ${item.name}`);
      setPixData(data);
    } catch (err) {
      alert('Erro ao gerar pagamento. Tente novamente.');
      setShowCheckout(false);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-6 left-6 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white shadow-xl z-[100]">
            <X className="w-5 h-5"/>
          </button>
        )}
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-500 font-black uppercase tracking-widest text-[10px]">Carregando loja...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-6 left-6 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white shadow-xl z-[100]">
            <X className="w-5 h-5"/>
          </button>
        )}
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
        {onClose && (
          <button onClick={onClose} className="absolute top-6 left-6 p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white shadow-xl z-[100]">
            <X className="w-5 h-5"/>
          </button>
        )}
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
      {onClose && (
        <button onClick={onClose} className="absolute top-6 left-6 z-[100] p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white shadow-xl backdrop-blur-md">
          <X className="w-5 h-5"/>
        </button>
      )}
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
        className="px-6 mb-6 space-y-3"
      >
        {storeData?.storeMode === 'scheduling' && (
          <button 
            onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
            <Calendar className="w-5 h-5" /> Ver Serviços ({services.length})
          </button>
        )}
        {(storeData?.storeMode === 'store' || storeData?.storeMode === 'store+ai') && (
          <button className="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"
            onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}>
            <ShoppingBag className="w-5 h-5" /> Ver Produtos ({products.length})
          </button>
        )}
        {storeData?.storeMode === 'store+ai' && (
          <button 
            onClick={() => setShowAiChat(true)}
            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            <MessageCircle className="w-5 h-5 text-indigo-400" /> Falar com Atendente IA
          </button>
        )}
        <button className="w-full bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-3 text-sm active:scale-95 transition-all">
          <MessageCircle className="w-4 h-4 text-slate-400" /> Enviar Mensagem
        </button>
      </motion.div>

      {/* Services Grid */}
      {storeData?.storeMode === 'scheduling' && services.length > 0 && (
        <motion.div id="services-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="px-6 mb-8">
          <h2 className="text-lg font-black text-white mb-4">✂️ Serviços</h2>
          <div className="space-y-3">
            {services.map((service: any) => (
              <motion.div key={service.id} whileTap={{ scale: 0.97 }}
                onClick={() => { setSelectedService(service); setShowSchedulingQuiz(true); }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-95 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{service.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{service.duration} min</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-black text-sm">R$ {service.price.toFixed(2).replace('.', ',')}</p>
                  <button className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">Agendar</button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Products Grid */}
      {products.length > 0 && (
        <motion.div id="products-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="px-6 mb-8">
          <h2 className="text-lg font-black text-white mb-4">🛍️ Produtos</h2>
          <div className="grid grid-cols-2 gap-3">
            {products.map((product: any) => (
              <motion.div key={product.id} whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedProduct(product)}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-all">
                {product.image ? (
                  <img src={product.image} className="w-full aspect-square object-cover" alt={product.name} />
                ) : (
                  <div className="w-full aspect-square bg-white/5 flex items-center justify-center">
                    <Package className="w-10 h-10 text-slate-600" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-white font-bold text-xs truncate mb-1">{product.name}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-fuchsia-400 font-black text-sm">R$ {product.price?.toFixed(2).replace('.', ',')}</span>
                    {product.originalPrice && (
                      <span className="text-slate-600 text-xs line-through">R$ {product.originalPrice?.toFixed(2).replace('.', ',')}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full max-w-lg bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="relative h-72 sm:h-80 w-full">
                {selectedProduct.image ? (
                  <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <Package className="w-20 h-20 text-slate-700" />
                  </div>
                )}
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-xl rounded-2xl text-white active:scale-90 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 mb-1 block">
                      {selectedProduct.category}
                    </span>
                    <h2 className="text-2xl font-black text-white leading-tight">
                      {selectedProduct.name}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">
                      R$ {selectedProduct.price?.toFixed(2).replace('.', ',')}
                    </p>
                    {selectedProduct.originalPrice && (
                      <p className="text-sm text-slate-500 line-through font-bold">
                        R$ {selectedProduct.originalPrice?.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full my-6" />

                <div className="space-y-4 mb-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Descrição</h3>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description || 'Nenhuma descrição fornecida para este produto.'}
                  </p>
                </div>

                <button 
                  onClick={() => handleStartCheckout(selectedProduct)}
                  className="w-full bg-indigo-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-primary-glow active:scale-95 transition-all">
                  <ShoppingBag className="w-5 h-5" /> Comprar Agora
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Scheduling Quiz Modal */}
      <AnimatePresence>
        {showSchedulingQuiz && selectedService && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full max-w-lg bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-white leading-tight">Agendar Horário</h2>
                    <p className="text-emerald-400 font-bold text-sm">{selectedService.name}</p>
                  </div>
                  <button onClick={() => setShowSchedulingQuiz(false)} className="p-3 bg-white/5 rounded-2xl text-slate-400 active:scale-90">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-5">
                  {schedulingStatus === 'success' ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">Agendamento Realizado!</h3>
                      <p className="text-slate-400 text-sm">O lojista entrará em contato em breve para confirmar seu horário.</p>
                    </motion.div>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Seu Nome</label>
                        <input
                          value={schedulingData.name}
                          onChange={(e) => setSchedulingData({ ...schedulingData, name: e.target.value })}
                          placeholder="Como podemos te chamar?"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Telefone / WhatsApp</label>
                        <input
                          value={schedulingData.phone}
                          onChange={(e) => setSchedulingData({ ...schedulingData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Horário Preferencial</label>
                        <input
                          type="datetime-local"
                          value={schedulingData.time}
                          onChange={(e) => setSchedulingData({ ...schedulingData, time: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      <button 
                        onClick={handleConfirmScheduling}
                        disabled={schedulingStatus === 'saving' || !schedulingData.name || !schedulingData.phone || !schedulingData.time}
                        className="w-full bg-emerald-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-primary-glow active:scale-95 transition-all disabled:opacity-50 mt-4"
                      >
                        {schedulingStatus === 'saving' ? <Loader className="w-5 h-5 animate-spin" /> : 'Confirmar Agendamento'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chat Modal */}
      <AnimatePresence>
        {showAiChat && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full max-w-lg h-full sm:h-[600px] bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* AI Chat Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-sm">Atendente IA</h2>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Online agora</p>
                  </div>
                </div>
                <button onClick={() => setShowAiChat(false)} className="p-2 text-slate-400 active:scale-90 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {aiMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-medium ${
                      msg.role === 'ai' 
                        ? 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none' 
                        : 'bg-indigo-500 text-white shadow-primary-glow rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 p-4 rounded-[1.5rem] rounded-tl-none border border-white/5">
                      <div className="flex gap-1">
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-6 bg-slate-900 border-t border-white/5">
                <div className="relative">
                  <input
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendAiMessage()}
                    placeholder="Digite sua dúvida..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-4 pr-14 text-white text-sm font-medium focus:outline-none focus:border-indigo-500/50"
                  />
                  <button 
                    onClick={handleSendAiMessage}
                    disabled={!aiInput.trim() || isAiTyping}
                    className="absolute right-2 top-2 w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout / Pix Modal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full max-w-sm bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white">Pagamento Pix</h3>
                <button onClick={() => { setShowCheckout(false); setPixData(null); }} className="p-2 text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {checkoutLoading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <Loader className="w-10 h-10 text-indigo-500 animate-spin" />
                  <p className="text-slate-500 font-bold text-sm">Gerando seu Pix...</p>
                </div>
              ) : pixData ? (
                <div className="space-y-6 text-center">
                  <div className="bg-white p-4 rounded-3xl inline-block mx-auto">
                    <img src={pixData.qrCode} className="w-48 h-48" alt="Pix QR Code" />
                  </div>
                  
                  <div>
                    <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-1">Valor a Pagar</p>
                    <p className="text-3xl font-black text-white">R$ {pixData.amount?.toFixed(2).replace('.', ',')}</p>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.pixCode);
                        soundManager.playChime();
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm"
                    >
                      <Copy className="w-4 h-4 text-indigo-400" /> Copiar Código Pix
                    </button>
                    <p className="text-[10px] text-slate-500 font-medium">
                      O pagamento é processado instantaneamente. Após pagar, você receberá a confirmação aqui.
                    </p>
                  </div>

                  <div className="pt-4 flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                    <Check className="w-4 h-4" /> Aguardando pagamento...
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Arroba Branding */}
      <div className="text-center pb-8 mt-4">
        <a href="https://arroba.live" className="inline-flex items-center gap-1.5 text-slate-600 text-xs font-bold hover:text-slate-400 transition-colors">
          <AtSign className="w-3.5 h-3.5" /> Criado com Arroba
        </a>
      </div>
    </div>
  );
};
