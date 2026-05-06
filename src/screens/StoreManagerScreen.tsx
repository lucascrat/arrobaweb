import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Edit3, Package, DollarSign, Tag, Image, Loader, CheckCircle, X, Store, Eye, Link, Copy, ToggleLeft, ToggleRight, Calendar, MessageCircle, ShoppingBag, Layout, ExternalLink, AlertCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { uploadToR2 } from '../lib/r2';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';
import { normalizeSlug, validateSlug } from '../lib/slug';

interface StoreManagerScreenProps {
  setScreen: (s: Screen) => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  category: string;
  stock?: number;
  active: boolean;
}

const CATEGORIES = ['Geral', 'Roupas', 'Calçados', 'Acessórios', 'Beleza', 'Alimentos', 'Eletrônicos', 'Serviços'];

export const StoreManagerScreen: React.FC<StoreManagerScreenProps> = ({ setScreen }) => {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [tab, setTab] = useState<'products' | 'services' | 'appointments' | 'payments' | 'settings'>('products');
  const [accessCodeEnabled, setAccessCodeEnabled] = useState(profile?.accessCodeEnabled || false);
  const [accessCode, setAccessCode] = useState(profile?.accessCode || '');
  const [storeMode, setStoreMode] = useState<'store' | 'store+ai' | 'scheduling'>(profile?.storeMode || 'store');
  const [storeDescription, setStoreDescription] = useState(profile?.storeDescription || '');
  const [professionalSlug, setProfessionalSlug] = useState(profile?.professionalSlug || '');
  const [efiConfig, setEfiConfig] = useState({
    clientId: profile?.efiConfig?.clientId || '',
    clientSecret: profile?.efiConfig?.clientSecret || '',
    key: profile?.efiConfig?.key || '',
    active: profile?.efiConfig?.active || false
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [slugStatus, setSlugStatus] = useState<{ state: 'idle' | 'checking' | 'ok' | 'error'; message?: string }>({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', price: '', originalPrice: '', description: '',
    image: '', category: 'Geral', stock: '', active: true
  });

  const [serviceForm, setServiceForm] = useState({
    name: '', price: '', duration: '30', description: '', active: true
  });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'stores', user.uid, 'products'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });

    const sq = query(
      collection(db, 'stores', user.uid, 'services'),
      orderBy('createdAt', 'desc')
    );
    const sunsub = onSnapshot(sq, snap => {
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const aq = query(
      collection(db, 'stores', user.uid, 'appointments'),
      orderBy('createdAt', 'desc')
    );
    const aunsub = onSnapshot(aq, snap => {
      setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // 4. Fetch Templates
    const tq = query(collection(db, 'storeTemplates'), orderBy('name', 'asc'));
    const tunsub = onSnapshot(tq, snap => {
      setAvailableTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); sunsub(); aunsub(); tunsub(); };
  }, [user]);

  useEffect(() => {
    if (!loading && products.length === 0 && services.length === 0) {
      setShowWizard(true);
    }
  }, [loading, products.length, services.length]);

  // Debounced slug validation enquanto o lojista digita
  useEffect(() => {
    if (!user) return;
    const slug = normalizeSlug(professionalSlug);
    if (!slug) {
      setSlugStatus({ state: 'idle' });
      return;
    }
    if (slug === (profile?.professionalSlug || '')) {
      setSlugStatus({ state: 'ok', message: 'Link atual.' });
      return;
    }
    setSlugStatus({ state: 'checking' });
    const t = setTimeout(async () => {
      const result = await validateSlug(slug, user.uid);
      if (result.ok) {
        setSlugStatus({ state: 'ok', message: 'Disponível!' });
      } else {
        setSlugStatus({ state: 'error', message: result.message });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [professionalSlug, user, profile?.professionalSlug]);

  const handleApplyTemplate = async (template: any) => {
    if (!user) return;
    setSaving(true);
    try {
      // 1. Garante que existe um slug; se ausente, gera a partir do storeName ou username
      let nextSlug = profile?.professionalSlug;
      if (!nextSlug) {
        const candidate = normalizeSlug(profile?.storeName || profile?.username || `loja-${user.uid.slice(0, 6)}`);
        const check = await validateSlug(candidate, user.uid);
        nextSlug = check.ok ? check.slug : `${candidate}-${user.uid.slice(0, 4)}`;
      }

      // 2. Atualiza perfil com modo, descrição, prompt e tema
      await updateDoc(doc(db, 'users', user.uid), {
        storeMode: template.config.storeMode,
        storeDescription: template.description,
        templateId: template.id,
        themeColor: template.themeColor || 'indigo',
        professionalSlug: nextSlug,
        onboardingCompleted: true,
        'config.welcomeMessage': template.config.welcomeMessage || '',
        'config.aiPrompt': template.config.aiPrompt || '',
        updatedAt: serverTimestamp(),
      });
      setStoreMode(template.config.storeMode);
      setStoreDescription(template.description);
      setProfessionalSlug(nextSlug || '');

      // 3. Popula produtos/serviços de exemplo do template (se houver)
      const samplesP = (template.sampleProducts || []) as any[];
      const samplesS = (template.sampleServices || []) as any[];

      if (samplesP.length === 0 && samplesS.length === 0) {
        // Fallback: cria 1 item demonstrativo conforme o modo
        if (template.config.storeMode === 'scheduling') {
          await addDoc(collection(db, 'stores', user.uid, 'services'), {
            name: 'Serviço Demonstrativo', price: 50, duration: 30,
            description: 'Edite ou exclua este serviço de exemplo.',
            active: true, createdAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, 'stores', user.uid, 'products'), {
            name: 'Produto Exemplo', price: 99.9, category: 'Geral',
            description: 'Edite ou exclua este produto de exemplo.',
            image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            active: true, createdAt: serverTimestamp(),
          });
        }
      } else {
        for (const p of samplesP) {
          await addDoc(collection(db, 'stores', user.uid, 'products'), {
            name: p.name, price: Number(p.price) || 0,
            description: p.description || '', image: p.image || '',
            category: p.category || 'Geral', active: true,
            createdAt: serverTimestamp(),
          });
        }
        for (const s of samplesS) {
          await addDoc(collection(db, 'stores', user.uid, 'services'), {
            name: s.name, price: Number(s.price) || 0,
            duration: Number(s.duration) || 30, description: s.description || '',
            active: true, createdAt: serverTimestamp(),
          });
        }
      }

      setShowWizard(false);
      soundManager.playChime();
      setSuccessMsg('Modelo aplicado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      soundManager.playAlert();
      setSuccessMsg('Erro ao aplicar modelo.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await uploadToR2(file);
      setForm(f => ({ ...f, image: url }));
      soundManager.playChime();
    } catch {
      soundManager.playAlert();
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openAddForm = () => {
    setEditingProduct(null);
    setForm({ name: '', price: '', originalPrice: '', description: '', image: '', category: 'Geral', stock: '', active: true });
    setShowForm(true);
    soundManager.playClick();
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      price: String(product.price),
      originalPrice: String(product.originalPrice || ''),
      description: product.description,
      image: product.image,
      category: product.category,
      stock: String(product.stock || ''),
      active: product.active
    });
    setShowForm(true);
    soundManager.playClick();
  };

  const handleSave = async () => {
    if (!user || !form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : null,
        description: form.description.trim(),
        image: form.image,
        category: form.category,
        stock: form.stock ? parseInt(form.stock) : null,
        active: form.active,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'stores', user.uid, 'products', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'stores', user.uid, 'products'), {
          ...data, createdAt: serverTimestamp()
        });
      }

      setShowForm(false);
      setSuccessMsg(editingProduct ? 'Produto atualizado!' : 'Produto cadastrado!');
      soundManager.playSent();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      soundManager.playAlert();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveService = async () => {
    if (!user || !serviceForm.name.trim() || !serviceForm.price) return;
    setSaving(true);
    try {
      const data = {
        name: serviceForm.name.trim(),
        price: parseFloat(serviceForm.price),
        duration: parseInt(serviceForm.duration),
        description: serviceForm.description.trim(),
        active: serviceForm.active,
        updatedAt: serverTimestamp()
      };

      if (editingService) {
        await updateDoc(doc(db, 'stores', user.uid, 'services', editingService.id), data);
      } else {
        await addDoc(collection(db, 'stores', user.uid, 'services'), {
          ...data, createdAt: serverTimestamp()
        });
      }

      setShowServiceForm(false);
      setSuccessMsg(editingService ? 'Serviço atualizado!' : 'Serviço cadastrado!');
      soundManager.playSent();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      soundManager.playAlert();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'stores', user.uid, 'products', productId));
    soundManager.playClick();
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'stores', user.uid, 'services', serviceId));
    soundManager.playClick();
  };

  const handleUpdateAppointmentStatus = async (appId: string, status: string) => {
    if (!user) return;
    await updateDoc(doc(db, 'stores', user.uid, 'appointments', appId), { status });
    soundManager.playSent();
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      // Valida slug antes de salvar
      const desiredSlug = normalizeSlug(professionalSlug);
      let finalSlug = profile?.professionalSlug || '';
      if (desiredSlug && desiredSlug !== profile?.professionalSlug) {
        const check = await validateSlug(desiredSlug, user.uid);
        if (!check.ok) {
          setSuccessMsg(check.message);
          setSlugStatus({ state: 'error', message: check.message });
          soundManager.playAlert();
          setTimeout(() => setSuccessMsg(''), 3000);
          setSavingSettings(false);
          return;
        }
        finalSlug = check.slug;
      } else if (desiredSlug) {
        finalSlug = desiredSlug;
      }

      await updateDoc(doc(db, 'users', user.uid), {
        accessCodeEnabled,
        accessCode: accessCode.trim().toUpperCase(),
        storeMode,
        storeDescription,
        efiConfig,
        professionalSlug: finalSlug,
        updatedAt: serverTimestamp(),
      });
      setProfessionalSlug(finalSlug);
      setSuccessMsg('Configurações salvas!');
      soundManager.playSent();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      soundManager.playAlert();
      setSuccessMsg('Erro ao salvar configurações.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSavingSettings(false);
    }
  };

  const activeSlug = profile?.professionalSlug || '';
  const storeLink = activeSlug ? `https://${activeSlug}.arroba.live` : '';
  const handleCopyLink = () => {
    if (!storeLink) {
      setSuccessMsg('Defina um link primeiro nas configurações.');
      setTab('settings');
      setTimeout(() => setSuccessMsg(''), 2500);
      return;
    }
    navigator.clipboard.writeText(storeLink);
    setSuccessMsg('Link copiado!');
    setTimeout(() => setSuccessMsg(''), 2000);
  };
  const handleOpenStore = () => {
    if (!storeLink) {
      setSuccessMsg('Defina um link primeiro nas configurações.');
      setTab('settings');
      setTimeout(() => setSuccessMsg(''), 2500);
      return;
    }
    window.open(storeLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-32">
      {/* Wizard Overlay */}
      <AnimatePresence>
        {showWizard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950 z-[100] flex flex-col p-6 overflow-y-auto">
            <div className="pt-12 text-center space-y-4 mb-12">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto text-indigo-400 border border-indigo-500/30">
                <Store className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">Bem-vindo, Soberano!</h2>
              <p className="text-slate-400 text-sm">Escolha um modelo para configurar sua loja em segundos.</p>
            </div>

            <div className="grid gap-4">
              {availableTemplates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-left hover:border-indigo-500/50 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-indigo-500 transition-all">
                      <Layout className="w-5 h-5 text-indigo-400 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-1 bg-white/5 text-slate-500 rounded-lg">{tmpl.category}</span>
                  </div>
                  <h4 className="text-white font-black text-lg mb-1">{tmpl.name}</h4>
                  <p className="text-slate-500 text-xs line-clamp-2">{tmpl.description}</p>
                </button>
              ))}
              
              <button 
                onClick={() => setShowWizard(false)}
                className="mt-4 text-slate-500 font-bold text-sm underline py-4"
              >
                Configurar manualmente
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Success Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-4 right-4 z-[100] bg-emerald-500/90 backdrop-blur-xl border border-emerald-500/50 p-4 rounded-2xl flex items-center gap-3 shadow-2xl"
          >
            <CheckCircle className="w-5 h-5 text-white" />
            <p className="text-sm font-bold text-white">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-4 justify-between z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('chat-list')} className="p-2 text-slate-400 active:scale-90 transition-transform">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black text-white">Gerenciar Loja</h1>
            <p className="text-[10px] text-fuchsia-400 font-bold">{profile?.storeName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScreen('public-store')}
            className="flex items-center gap-1 px-3 py-1.5 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-full text-fuchsia-300 text-xs font-bold transition-all hover:bg-fuchsia-500/30">
            <Eye className="w-3.5 h-3.5" /> Ver Loja
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-slate-950 border-b border-white/5 flex">
        <button onClick={() => setTab('products')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'products' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-slate-500'}`}>
          🛍️ Produtos
        </button>
        {storeMode === 'scheduling' && (
          <>
            <button onClick={() => setTab('services')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'services' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500'}`}>
              ✂️ Serviços
            </button>
            <button onClick={() => setTab('appointments')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'appointments' ? 'text-cyan-400 border-b-2 border-cyan-500' : 'text-slate-500'}`}>
              📅 Agenda
            </button>
            <button onClick={() => setTab('payments')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'payments' ? 'text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500'}`}>
              💰 Pagamentos
            </button>
          </>
        )}
        <button onClick={() => setTab('settings')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'settings' ? 'text-slate-200 border-b-2 border-white/20' : 'text-slate-500'}`}>
          ⚙️ Ajustes
        </button>
      </div>

      <main className="flex-1 mt-32 pb-32 p-4">
        {tab === 'products' && (
          <div className="space-y-4">
            {/* Store Link Banner */}
            <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Link da sua loja</p>
                {activeSlug ? (
                  <p className="text-fuchsia-300 font-black text-sm truncate">{activeSlug}.arroba.live</p>
                ) : (
                  <button onClick={() => setTab('settings')} className="text-amber-300 font-black text-xs underline">
                    Definir link agora
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-fuchsia-500/20 rounded-xl text-fuchsia-400 active:scale-90 transition-transform"
                  title="Copiar link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleOpenStore}
                  className="p-2 bg-fuchsia-500/20 rounded-xl text-fuchsia-400 active:scale-90 transition-transform"
                  title="Abrir loja"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-indigo-400 animate-spin" /></div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Nenhum produto cadastrado</p>
                <p className="text-slate-600 text-sm mt-1">Clique no + para adicionar seu primeiro produto</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(product => (
                  <motion.div key={product.id} layout
                    className={`bg-white/5 border rounded-2xl p-3 flex gap-3 items-center ${product.active ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
                    {product.image ? (
                      <img src={product.image} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" alt={product.name} />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm truncate">{product.name}</p>
                        {!product.active && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">Inativo</span>}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{product.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-fuchsia-400 font-black text-sm">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                        {product.originalPrice && (
                          <span className="text-slate-600 text-xs line-through">R$ {product.originalPrice.toFixed(2).replace('.', ',')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => openEditForm(product)} className="p-2 bg-white/5 rounded-xl text-indigo-400 active:scale-90 transition-transform">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 bg-red-500/10 rounded-xl text-red-400 active:scale-90 transition-transform">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'services' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-emerald-400 animate-spin" /></div>
            ) : services.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Nenhum serviço cadastrado</p>
                <p className="text-slate-600 text-sm mt-1">Clique no + para adicionar seu primeiro serviço</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map(service => (
                  <motion.div key={service.id} layout
                    className={`bg-white/5 border rounded-2xl p-4 flex gap-3 items-center ${service.active ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{service.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{service.duration} minutos</p>
                      <p className="text-emerald-400 font-black text-sm mt-1">R$ {service.price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingService(service); setServiceForm({ name: service.name, price: String(service.price), duration: String(service.duration), description: service.description, active: service.active }); setShowServiceForm(true); }} className="p-2 bg-white/5 rounded-xl text-indigo-400 active:scale-90 transition-transform">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteService(service.id)} className="p-2 bg-red-500/10 rounded-xl text-red-400 active:scale-90 transition-transform">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'appointments' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-cyan-400 animate-spin" /></div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Nenhum agendamento recebido</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map(app => (
                  <motion.div key={app.id} layout
                    className={`bg-white/5 border rounded-2xl p-4 border-white/10 ${app.status === 'confirmed' ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-black text-sm">{app.customerName}</p>
                        <p className="text-xs text-slate-400 font-bold">{app.customerPhone}</p>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                        app.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                        app.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {app.status === 'confirmed' ? 'Confirmado' : app.status === 'rejected' ? 'Cancelado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Serviço & Horário</p>
                      <p className="text-white font-bold text-xs">{app.serviceName}</p>
                      <p className="text-cyan-400 font-black text-xs mt-1">
                        {new Date(app.appointmentTime).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {app.status === 'pending' && (
                        <>
                          <button onClick={() => handleUpdateAppointmentStatus(app.id, 'confirmed')} className="flex-1 bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs active:scale-95 transition-all">
                            Confirmar
                          </button>
                          <button onClick={() => handleUpdateAppointmentStatus(app.id, 'rejected')} className="flex-1 bg-white/5 text-red-400 font-black py-2.5 rounded-xl text-xs active:scale-95 transition-all">
                            Recusar
                          </button>
                        </>
                      )}
                      <a href={`https://wa.me/55${app.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl active:scale-95 transition-all">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500 rounded-xl">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-sm">Efi Bank (Gerencianet)</h3>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase">Integração Pix</p>
                </div>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">
                Conecte sua conta Efi para receber pagamentos via Pix automaticamente.
              </p>

              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <p className="text-white font-bold text-sm">Ativar Pagamentos</p>
                  <button onClick={() => setEfiConfig({ ...efiConfig, active: !efiConfig.active })}>
                    {efiConfig.active ? <ToggleRight className="w-8 h-8 text-emerald-400" /> : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                  </button>
                </div>

                <AnimatePresence>
                  {efiConfig.active && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Client ID</label>
                        <input
                          type="password" value={efiConfig.clientId} onChange={e => setEfiConfig({ ...efiConfig, clientId: e.target.value })}
                          placeholder="Client_Id_..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs font-medium focus:border-emerald-500/50 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Client Secret</label>
                        <input
                          type="password" value={efiConfig.clientSecret} onChange={e => setEfiConfig({ ...efiConfig, clientSecret: e.target.value })}
                          placeholder="Client_Secret_..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs font-medium focus:border-emerald-500/50 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Chave Pix</label>
                        <input
                          value={efiConfig.key} onChange={e => setEfiConfig({ ...efiConfig, key: e.target.value })}
                          placeholder="Sua chave Pix cadastrada na Efi"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs font-medium focus:border-emerald-500/50 outline-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-primary-glow"
            >
              {savingSettings ? <Loader className="w-5 h-5 animate-spin" /> : 'Salvar Configurações'}
            </button>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6">
            {/* Mode Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Modo de Operação</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'store', label: 'Loja de Produtos', icon: ShoppingBag, desc: 'Catálogo simples para vendas' },
                  { id: 'store+ai', label: 'Loja + Atendimento IA', icon: MessageCircle, desc: 'Vendas com assistente Gemini' },
                  { id: 'scheduling', label: 'Sistema de Agendamento', icon: Calendar, desc: 'Para salões, clínicas e serviços' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setStoreMode(m.id as any)}
                    className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${storeMode === m.id ? 'bg-fuchsia-500/10 border-fuchsia-500 shadow-glass' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className={`p-3 rounded-xl ${storeMode === m.id ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-500'}`}>
                      <m.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className={`font-black text-sm ${storeMode === m.id ? 'text-white' : 'text-slate-400'}`}>{m.label}</p>
                      <p className="text-[10px] font-bold text-slate-500">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descrição da Loja</label>
              <textarea
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                placeholder="Descreva sua loja para os visitantes..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm font-medium focus:outline-none focus:border-fuchsia-500/50 resize-none"
              />
            </div>

            {/* Custom Link */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Link da Loja</label>
              <div className={`flex items-center bg-white/5 border rounded-2xl overflow-hidden transition-colors ${
                slugStatus.state === 'error' ? 'border-red-500/50' :
                slugStatus.state === 'ok' ? 'border-emerald-500/50' :
                'border-white/10 focus-within:border-fuchsia-500/50'
              }`}>
                <input
                  value={professionalSlug}
                  onChange={(e) => setProfessionalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  onBlur={(e) => setProfessionalSlug(normalizeSlug(e.target.value))}
                  placeholder="sua-loja"
                  className="w-full bg-transparent p-4 text-white font-black text-sm focus:outline-none"
                />
                <span className="pr-4 text-slate-500 font-bold text-sm">.arroba.live</span>
              </div>

              {/* Feedback de validação */}
              <div className="mt-2 px-1 min-h-[18px] flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                {slugStatus.state === 'checking' && (
                  <><Loader className="w-3 h-3 animate-spin text-slate-400" /><span className="text-slate-400">Verificando...</span></>
                )}
                {slugStatus.state === 'ok' && (
                  <><CheckCircle className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">{slugStatus.message}</span></>
                )}
                {slugStatus.state === 'error' && (
                  <><AlertCircle className="w-3 h-3 text-red-400" /><span className="text-red-400">{slugStatus.message}</span></>
                )}
                {slugStatus.state === 'idle' && !professionalSlug && (
                  <span className="text-slate-600">Mín. 3 caracteres. Apenas letras, números e hífens.</span>
                )}
              </div>

              {/* Ações sobre o link atual */}
              {activeSlug && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenStore}
                    className="flex-1 py-2.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-fuchsia-300 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir Loja
                  </button>
                </div>
              )}
            </div>

            {/* Access Code Toggle */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-bold text-sm">Código de Acesso</p>
                  <p className="text-slate-400 text-xs mt-0.5">Exige código para ver a loja</p>
                </div>
                <button onClick={() => setAccessCodeEnabled(!accessCodeEnabled)} className="transition-transform active:scale-90">
                  {accessCodeEnabled
                    ? <ToggleRight className="w-8 h-8 text-fuchsia-400" />
                    : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                </button>
              </div>
              
              {accessCodeEnabled && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Código Mestre (6 dígitos)</label>
                  <input
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="EX: ABC123"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white font-black tracking-[0.3em] text-center focus:outline-none focus:border-fuchsia-500/50"
                  />
                  <p className="text-[9px] text-slate-600 mt-2 text-center">Os visitantes precisarão deste código para entrar.</p>
                </motion.div>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full bg-fuchsia-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingSettings ? <Loader className="w-5 h-5 animate-spin" /> : 'Salvar Configurações'}
            </motion.button>
          </div>
        )}
      </main>

      {/* FAB Add Product/Service */}
      {(tab === 'products' || tab === 'services') && (
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => tab === 'products' ? openAddForm() : setShowServiceForm(true)}
          className={`fixed bottom-8 right-6 w-16 h-16 text-white rounded-full shadow-2xl flex items-center justify-center z-40 ${tab === 'products' ? 'bg-fuchsia-500 shadow-fuchsia-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}
        >
          <Plus className="w-7 h-7" />
        </motion.button>
      )}

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="w-full max-h-[90vh] bg-slate-900 rounded-t-3xl overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900 px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between z-10">
                <h2 className="text-lg font-black text-white">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 bg-white/5 rounded-xl text-slate-400 active:scale-90">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Image Upload */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Foto do Produto</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all hover:border-fuchsia-500/40"
                  >
                    {uploadingImg ? (
                      <Loader className="w-8 h-8 text-fuchsia-400 animate-spin" />
                    ) : form.image ? (
                      <img src={form.image} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                    ) : (
                      <>
                        <Image className="w-8 h-8 text-slate-600" />
                        <p className="text-slate-500 text-xs font-bold">Toque para adicionar foto</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do Produto *</label>
                  <input
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Camiseta Básica"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-fuchsia-500/50"
                  />
                </div>

                {/* Price Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Preço (R$) *</label>
                    <input
                      type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="49,90"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-fuchsia-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Preço Original</label>
                    <input
                      type="number" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))}
                      placeholder="69,90"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-fuchsia-500/50"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Categoria</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${form.category === cat ? 'bg-fuchsia-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descrição</label>
                  <textarea
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descreva o produto..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-fuchsia-500/50 resize-none"
                  />
                </div>

                {/* Active Toggle */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <p className="text-white font-bold text-sm">Produto Ativo</p>
                  <button onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
                    {form.active
                      ? <ToggleRight className="w-8 h-8 text-fuchsia-400" />
                      : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }} onClick={handleSave}
                  disabled={saving || !form.name || !form.price}
                  className="w-full bg-fuchsia-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {saving ? <Loader className="w-5 h-5 animate-spin" /> : (editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Service Form Modal */}
      <AnimatePresence>
        {showServiceForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full max-h-[90vh] bg-slate-900 rounded-t-3xl overflow-y-auto"
            >
              <div className="sticky top-0 bg-slate-900 px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between z-10">
                <h2 className="text-lg font-black text-white">{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                <button onClick={() => { setShowServiceForm(false); setEditingService(null); }} className="p-2 bg-white/5 rounded-xl text-slate-400 active:scale-90">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do Serviço *</label>
                  <input
                    value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Corte de Cabelo"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Preço (R$) *</label>
                    <input
                      type="number" value={serviceForm.price} onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="50,00"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Duração (Min)</label>
                    <select
                      value={serviceForm.duration} onChange={e => setServiceForm(f => ({ ...f, duration: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="15" className="bg-slate-900">15 min</option>
                      <option value="30" className="bg-slate-900">30 min</option>
                      <option value="45" className="bg-slate-900">45 min</option>
                      <option value="60" className="bg-slate-900">1 hora</option>
                      <option value="90" className="bg-slate-900">1h 30min</option>
                      <option value="120" className="bg-slate-900">2 horas</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descrição</label>
                  <textarea
                    value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="O que inclui este serviço?"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <p className="text-white font-bold text-sm">Serviço Disponível</p>
                  <button onClick={() => setServiceForm(f => ({ ...f, active: !f.active }))}>
                    {serviceForm.active
                      ? <ToggleRight className="w-8 h-8 text-emerald-400" />
                      : <ToggleLeft className="w-8 h-8 text-slate-600" />}
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }} onClick={handleSaveService}
                  disabled={saving || !serviceForm.name || !serviceForm.price}
                  className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {saving ? <Loader className="w-5 h-5 animate-spin" /> : (editingService ? 'Salvar Alterações' : 'Cadastrar Serviço')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
