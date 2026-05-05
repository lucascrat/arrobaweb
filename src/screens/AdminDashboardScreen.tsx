import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Store, 
  Settings, 
  Search, 
  Filter, 
  ChevronRight, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  ArrowLeft,
  Layout,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Loader,
  Eye,
  Sparkles,
  ShoppingBag,
  Calendar,
  MessageCircle
} from 'lucide-react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  onSnapshot, 
  orderBy, 
  limit,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';
import { seedTemplates } from '../lib/seed';

interface AdminDashboardProps {
  setScreen: (s: Screen) => void;
}

interface UserProfile {
  uid: string;
  username: string;
  storeName?: string;
  professionalSlug?: string;
  accountType: 'personal' | 'business';
  photoURL?: string;
  createdAt?: any;
  isAdmin?: boolean;
}

interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: {
    storeMode: 'store' | 'store+ai' | 'scheduling';
    welcomeMessage: string;
    aiPrompt?: string;
  };
  thumbnail?: string;
}

export const AdminDashboardScreen: React.FC<AdminDashboardProps> = ({ setScreen }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'overview' | 'users' | 'templates' | 'settings'>('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StoreTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Stats
  const stats = [
    { label: 'Usuários Totais', value: users.length, icon: Users, color: 'text-indigo-400' },
    { label: 'Lojas Ativas', value: users.filter(u => u.accountType === 'business').length, icon: Store, color: 'text-fuchsia-400' },
    { label: 'Modelos', value: templates.length, icon: Layout, color: 'text-cyan-400' },
    { label: 'Receita Est.', value: 'R$ 0,00', icon: DollarSign, color: 'text-emerald-400' },
  ];

  useEffect(() => {
    // 1. Fetch Users
    const uq = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
    const unsubUsers = onSnapshot(uq, (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });

    // 2. Fetch Templates
    const tq = query(collection(db, 'storeTemplates'), orderBy('name', 'asc'));
    const unsubTemplates = onSnapshot(tq, (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as StoreTemplate)));
      setLoading(false);
    });

    return () => { unsubUsers(); unsubTemplates(); };
  }, []);

  const handleCreateTemplate = async (templateData: any) => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await updateDoc(doc(db, 'storeTemplates', editingTemplate.id), {
          ...templateData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'storeTemplates'), {
          ...templateData,
          createdAt: serverTimestamp()
        });
      }
      setShowTemplateForm(false);
      setEditingTemplate(null);
      soundManager.playChime();
    } catch (err) {
      soundManager.playAlert();
      alert('Erro ao salvar modelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este modelo?')) {
      await deleteDoc(doc(db, 'storeTemplates', id));
      soundManager.playClick();
    }
  };

  const handleToggleAccountType = async (user: UserProfile) => {
    try {
      const newType = user.accountType === 'personal' ? 'business' : 'personal';
      await updateDoc(doc(db, 'users', user.uid), {
        accountType: newType,
        // If becoming business and doesn't have a store name, set a default
        ...(newType === 'business' && !user.storeName ? { storeName: `Loja de ${user.username}` } : {}),
        updatedAt: serverTimestamp()
      });
      soundManager.playChime();
    } catch (err) {
      soundManager.playAlert();
      alert('Erro ao alterar tipo de conta.');
    }
  };

  const [previewTemplate, setPreviewTemplate] = useState<StoreTemplate | null>(null);

  // Group templates by category
  const categories = Array.from(new Set(templates.map(t => t.category || 'Geral')));

  const renderStorePreview = (tmpl: StoreTemplate) => {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col overflow-y-auto pb-10">
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setPreviewTemplate(null)} className="p-2 -ml-2 text-slate-400">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Simulação de Loja</p>
              <h2 className="text-sm font-black text-white tracking-tight">{tmpl.name}</h2>
            </div>
          </div>
          <button onClick={() => setPreviewTemplate(null)} className="p-2 text-slate-400"><X className="w-5 h-5"/></button>
        </header>

        <div className="flex-1 max-w-lg mx-auto w-full p-6 py-12 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border-4 border-white/10 mx-auto mb-4 flex items-center justify-center">
              <Store className="w-10 h-10 text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Sua Loja Exemplo</h1>
            <p className="text-slate-400 text-sm">@{tmpl.category.toLowerCase()}_exemplo</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
            <p className="text-slate-300 text-sm leading-relaxed">{tmpl.description}</p>
          </div>

          <div className="space-y-3">
            {tmpl.config.storeMode === 'scheduling' && (
              <button className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg">
                <Calendar className="w-5 h-5" /> Ver Serviços (Exemplo)
              </button>
            )}
            {(tmpl.config.storeMode === 'store' || tmpl.config.storeMode === 'store+ai') && (
              <button className="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg">
                <ShoppingBag className="w-5 h-5" /> Ver Catálogo (Exemplo)
              </button>
            )}
            {tmpl.config.storeMode === 'store+ai' && (
              <button className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3">
                <MessageCircle className="w-5 h-5 text-indigo-400" /> Atendente IA
              </button>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Exemplo de Conteúdo</h3>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left">
                  <div className="w-full aspect-square bg-white/5 rounded-xl mb-3 flex items-center justify-center">
                    {tmpl.config.storeMode === 'scheduling' ? <Calendar className="w-6 h-6 text-slate-700"/> : <ShoppingBag className="w-6 h-6 text-slate-700"/>}
                  </div>
                  <p className="text-white font-bold text-[10px]">Item de Demonstração {i}</p>
                  <p className="text-indigo-400 font-black text-xs mt-1">R$ 99,90</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (profile?.accountType !== 'business' && !profile?.isAdmin && profile?.email !== 'lrlucasrafael11@gmail.com') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div>
          <ShieldCheck className="w-16 h-16 text-red-500/50 mx-auto mb-4" />
          <h1 className="text-xl font-black text-white mb-2">Acesso Restrito</h1>
          <p className="text-slate-500 text-sm">Apenas administradores podem acessar este painel.</p>
          <button onClick={() => setScreen('chat-list')} className="mt-6 text-indigo-400 font-bold text-sm underline">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-x-hidden pb-32">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 justify-between z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => setScreen('profile')} className="p-2 -ml-2 text-slate-400 active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-white tracking-tight">Admin Portal</h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
        </div>
      </header>

      {/* Stats Summary */}
      <main className="pt-24 px-6 space-y-8">
        <section className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-3xl p-5"
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </section>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
          {['overview', 'users', 'templates'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500'
              }`}
            >
              {t === 'overview' ? 'Geral' : t === 'users' ? 'Usuários' : 'Modelos'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {previewTemplate && renderStorePreview(previewTemplate)}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-600/20 to-fuchsia-600/20 border border-white/10 rounded-[2.5rem] p-8 text-center">
                <TrendingUp className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-xl font-black text-white mb-2">Monitoramento Ativo</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A plataforma está operando com estabilidade. 
                  <span className="text-emerald-400 font-bold"> {users.length} usuários</span> sincronizados.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Atividade Recente</h4>
                <div className="space-y-3">
                  {users.slice(0, 5).map(u => (
                    <div key={u.uid} className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`} className="w-10 h-10 rounded-xl" />
                        <div>
                          <p className="text-white font-bold text-sm">@{u.username}</p>
                          <p className="text-[10px] text-slate-500">{u.accountType === 'business' ? 'Conta Pro' : 'Conta Pessoal'}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-700" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar usuário ou loja..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div className="space-y-3">
                {users
                  .filter(u => (u.username || '').includes(searchTerm) || u.storeName?.toLowerCase()?.includes(searchTerm.toLowerCase()))
                  .map(u => (
                    <div key={u.uid} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`} className="w-12 h-12 rounded-2xl object-cover" />
                        <div>
                          <h5 className="text-white font-black text-sm">{u.storeName || u.username}</h5>
                          <p className="text-[10px] font-bold text-slate-500 tracking-wider">@{u.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.accountType === 'business' && u.professionalSlug && (
                          <a 
                            href={`https://${u.professionalSlug}.arroba.live`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/5 rounded-xl text-fuchsia-400 active:scale-90 transition-transform"
                            title="Ver Loja Pública"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        <button 
                          onClick={() => handleToggleAccountType(u)}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                            u.accountType === 'business' 
                              ? 'bg-fuchsia-500 text-white' 
                              : 'bg-white/10 text-slate-500'
                          }`}
                        >
                          {u.accountType === 'business' ? 'PRO' : 'FREE'}
                        </button>
                        <button className="p-2 bg-white/5 rounded-xl text-slate-400">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {tab === 'templates' && (
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Modelos de Negócio</h4>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Crie e visualize estilos de lojas</p>
                  </div>
                  <div className="flex gap-2">
                    {templates.length === 0 && (
                      <button 
                        onClick={async () => {
                          await seedTemplates();
                          soundManager.playChime();
                        }}
                        className="px-4 py-2 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95"
                      >
                        Carregar Padrão
                      </button>
                    )}
                    <button 
                      onClick={() => { setEditingTemplate(null); setShowTemplateForm(true); }}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo
                    </button>
                  </div>
                </div>

              {templates.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                  <Layout className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold text-sm">Nenhum modelo cadastrado</p>
                  <button onClick={() => setShowTemplateForm(true)} className="mt-4 text-indigo-400 font-black text-xs uppercase tracking-widest">Clique para criar o primeiro</button>
                </div>
              ) : (
                <div className="space-y-10">
                  {categories.map(cat => (
                    <div key={cat} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/5" />
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/50">{cat}</h5>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>

                      <div className="grid gap-4">
                        {templates.filter(t => (t.category || 'Geral') === cat).map(tmpl => (
                          <motion.div 
                            key={tmpl.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden group"
                          >
                            <div className="p-6">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h5 className="text-white font-black">{tmpl.name}</h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-white/5 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest border border-white/5">
                                      {tmpl.config.storeMode}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => { setEditingTemplate(tmpl); setShowTemplateForm(true); }} className="p-2.5 bg-white/5 rounded-xl text-slate-500 hover:text-white transition-colors active:scale-90"><Edit className="w-4 h-4"/></button>
                                  <button onClick={() => handleDeleteTemplate(tmpl.id)} className="p-2.5 bg-white/5 rounded-xl text-slate-500 hover:text-red-400 transition-colors active:scale-90"><Trash2 className="w-4 h-4"/></button>
                                </div>
                              </div>
                              <p className="text-slate-400 text-xs line-clamp-2 mb-6 leading-relaxed">{tmpl.description}</p>
                              
                              <button 
                                onClick={() => setPreviewTemplate(tmpl)}
                                className="w-full py-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-indigo-500 hover:text-white transition-all active:scale-95 group-hover:shadow-primary-glow"
                              >
                                <Eye className="w-4 h-4" /> Simular Loja
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Template Form Modal */}
      <AnimatePresence>
        {showTemplateForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full bg-slate-900 rounded-t-[2.5rem] max-h-[90vh] overflow-y-auto">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-black text-white">{editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}</h3>
                  <button onClick={() => setShowTemplateForm(false)} className="p-2 text-slate-400"><X className="w-6 h-6"/></button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do Modelo</label>
                    <input 
                      defaultValue={editingTemplate?.name}
                      id="tmpl-name"
                      placeholder="Ex: Barbearia Moderna"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descrição Curta</label>
                    <textarea 
                      defaultValue={editingTemplate?.description}
                      id="tmpl-desc"
                      placeholder="Ideal para barbeiros que buscam agendamento rápido..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium h-24 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Categoria</label>
                      <select id="tmpl-cat" defaultValue={editingTemplate?.category || 'Beleza'} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold appearance-none">
                        <option value="Beleza">Beleza</option>
                        <option value="Alimentação">Alimentação</option>
                        <option value="Varejo">Varejo</option>
                        <option value="Serviços">Serviços</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Modo Padrão</label>
                      <select id="tmpl-mode" defaultValue={editingTemplate?.config.storeMode || 'scheduling'} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold appearance-none">
                        <option value="store">Loja</option>
                        <option value="store+ai">Loja + IA</option>
                        <option value="scheduling">Agendamento</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={saving}
                  onClick={() => {
                    const name = (document.getElementById('tmpl-name') as HTMLInputElement).value;
                    const description = (document.getElementById('tmpl-desc') as HTMLTextAreaElement).value;
                    const category = (document.getElementById('tmpl-cat') as HTMLSelectElement).value;
                    const storeMode = (document.getElementById('tmpl-mode') as HTMLSelectElement).value;
                    handleCreateTemplate({
                      name, description, category,
                      config: { storeMode, welcomeMessage: 'Bem-vindo ao nosso espaço!' }
                    });
                  }}
                  className="w-full bg-indigo-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-primary-glow active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salvar Modelo</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
