import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Store, Search, ChevronRight, ShieldCheck, TrendingUp, DollarSign, ArrowLeft,
  Layout, Plus, Trash2, Edit, Save, X, Loader, Eye, Sparkles, ShoppingBag, Calendar, MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';
import { CATEGORY_OPTIONS, THEME_PRESETS } from '../lib/seed';

interface AdminDashboardProps {
  setScreen: (s: Screen) => void;
}

interface UserRow {
  id: string;
  username: string | null;
  store_name: string | null;
  professional_slug: string | null;
  account_type: 'personal' | 'business';
  photo_url: string | null;
  is_admin: boolean;
  created_at: string;
}

interface StoreTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  theme_color: string | null;
  config: {
    storeMode: 'store' | 'store+ai' | 'scheduling';
    welcomeMessage: string;
    aiPrompt?: string;
  };
  sample_products?: any[];
  sample_services?: any[];
}

interface TemplateFormState {
  name: string;
  description: string;
  category: string;
  theme_color: string;
  config: {
    storeMode: 'store' | 'store+ai' | 'scheduling';
    welcomeMessage: string;
    aiPrompt: string;
  };
}

const EMPTY_FORM: TemplateFormState = {
  name: '',
  description: '',
  category: 'Beleza',
  theme_color: 'indigo',
  config: { storeMode: 'scheduling', welcomeMessage: '', aiPrompt: '' },
};

export const AdminDashboardScreen: React.FC<AdminDashboardProps> = ({ setScreen }) => {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'overview' | 'users' | 'templates'>('overview');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StoreTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(EMPTY_FORM);
  const [previewTemplate, setPreviewTemplate] = useState<StoreTemplate | null>(null);

  const refreshUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id,username,store_name,professional_slug,account_type,photo_url,is_admin,created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setUsers((data as UserRow[]) || []);
  };

  const refreshTemplates = async () => {
    const { data } = await supabase
      .from('store_templates')
      .select('*')
      .order('name', { ascending: true });
    setTemplates((data as StoreTemplate[]) || []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await Promise.all([refreshUsers(), refreshTemplates()]);
      if (active) setLoading(false);
    })();

    // Realtime
    const ch1 = supabase
      .channel('admin:profiles')
      .on('postgres_changes', { event: '*', schema: 'arroba', table: 'profiles' }, refreshUsers)
      .subscribe();
    const ch2 = supabase
      .channel('admin:templates')
      .on('postgres_changes', { event: '*', schema: 'arroba', table: 'store_templates' }, refreshTemplates)
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, []);

  const stats = useMemo(() => [
    { label: 'Usuários Totais', value: users.length, icon: Users, color: 'text-indigo-400' },
    { label: 'Lojas Ativas', value: users.filter(u => u.account_type === 'business').length, icon: Store, color: 'text-fuchsia-400' },
    { label: 'Modelos', value: templates.length, icon: Layout, color: 'text-cyan-400' },
    { label: 'Receita Est.', value: 'R$ 0,00', icon: DollarSign, color: 'text-emerald-400' },
  ], [users, templates]);

  const openTemplateEditor = (tmpl: StoreTemplate | null) => {
    setEditingTemplate(tmpl);
    setTemplateForm(tmpl ? {
      name: tmpl.name,
      description: tmpl.description,
      category: tmpl.category,
      theme_color: tmpl.theme_color || 'indigo',
      config: {
        storeMode: tmpl.config?.storeMode || 'scheduling',
        welcomeMessage: tmpl.config?.welcomeMessage || '',
        aiPrompt: tmpl.config?.aiPrompt || '',
      },
    } : EMPTY_FORM);
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.description.trim()) {
      alert('Nome e descrição são obrigatórios.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: templateForm.name.trim(),
        description: templateForm.description.trim(),
        category: templateForm.category,
        theme_color: templateForm.theme_color || 'indigo',
        config: {
          storeMode: templateForm.config.storeMode,
          welcomeMessage: templateForm.config.welcomeMessage?.trim() || 'Bem-vindo à nossa loja!',
          aiPrompt: templateForm.config.aiPrompt?.trim() || '',
        },
      };
      if (editingTemplate) {
        const { error } = await supabase
          .from('store_templates')
          .update(payload)
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('store_templates')
          .insert(payload);
        if (error) throw error;
      }
      setShowTemplateForm(false);
      setEditingTemplate(null);
      setTemplateForm(EMPTY_FORM);
      soundManager.playChime();
    } catch (err: any) {
      console.error(err);
      soundManager.playAlert();
      alert('Erro ao salvar modelo: ' + (err?.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Excluir este modelo?')) return;
    const { error } = await supabase.from('store_templates').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      soundManager.playAlert();
    } else {
      soundManager.playClick();
    }
  };

  const handleToggleAccountType = async (u: UserRow) => {
    const newType: 'personal' | 'business' = u.account_type === 'personal' ? 'business' : 'personal';
    const updates: Record<string, any> = { account_type: newType };
    if (newType === 'business' && !u.store_name) {
      updates.store_name = `Loja de ${u.username || 'Usuário'}`;
    }
    const { error } = await supabase.from('profiles').update(updates).eq('id', u.id);
    if (error) {
      alert('Erro: ' + error.message);
      soundManager.playAlert();
    } else {
      soundManager.playChime();
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(templates.map(t => t.category || 'Geral'))),
    [templates]
  );

  if (!profile?.is_admin) {
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
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-[120px] pointer-events-none" />

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

        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
          {(['overview', 'users', 'templates'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === t ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500'
              }`}
            >
              {t === 'overview' ? 'Geral' : t === 'users' ? 'Usuários' : 'Modelos'}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {previewTemplate && (
            <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col overflow-y-auto pb-10">
              <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setPreviewTemplate(null)} className="p-2 -ml-2 text-slate-400">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Simulação</p>
                    <h2 className="text-sm font-black text-white tracking-tight">{previewTemplate.name}</h2>
                  </div>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
              </header>

              <div className="flex-1 max-w-lg mx-auto w-full p-6 py-12 text-center">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
                  <p className="text-slate-300 text-sm leading-relaxed">{previewTemplate.description}</p>
                </div>
                <div className="space-y-3">
                  {previewTemplate.config.storeMode === 'scheduling' && (
                    <button className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3"><Calendar className="w-5 h-5" /> Ver Serviços</button>
                  )}
                  {(previewTemplate.config.storeMode === 'store' || previewTemplate.config.storeMode === 'store+ai') && (
                    <button className="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3"><ShoppingBag className="w-5 h-5" /> Ver Catálogo</button>
                  )}
                  {previewTemplate.config.storeMode === 'store+ai' && (
                    <button className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3"><MessageCircle className="w-5 h-5 text-indigo-400" /> Atendente IA</button>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-indigo-600/20 to-fuchsia-600/20 border border-white/10 rounded-[2.5rem] p-8 text-center">
                <TrendingUp className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                <h3 className="text-xl font-black text-white mb-2">Monitoramento Ativo</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Plataforma operando.
                  <span className="text-emerald-400 font-bold"> {users.length} usuários</span> sincronizados.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Atividade Recente</h4>
                <div className="space-y-3">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <img src={u.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username || u.id}`} className="w-10 h-10 rounded-xl" />
                        <div>
                          <p className="text-white font-bold text-sm">@{u.username || '—'}</p>
                          <p className="text-[10px] text-slate-500">{u.account_type === 'business' ? 'Conta Pro' : 'Conta Pessoal'}</p>
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
                  .filter(u =>
                    !searchTerm ||
                    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (u.store_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map(u => (
                    <div key={u.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={u.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username || u.id}`} className="w-12 h-12 rounded-2xl object-cover" />
                        <div>
                          <h5 className="text-white font-black text-sm">{u.store_name || u.username || 'Usuário'}</h5>
                          <p className="text-[10px] font-bold text-slate-500 tracking-wider">@{u.username || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.account_type === 'business' && u.professional_slug && (
                          <a
                            href={`https://${u.professional_slug}.arroba.live`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/5 rounded-xl text-fuchsia-400"
                            title="Ver Loja Pública"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handleToggleAccountType(u)}
                          className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                            u.account_type === 'business'
                              ? 'bg-fuchsia-500 text-white'
                              : 'bg-white/10 text-slate-500'
                          }`}
                        >
                          {u.account_type === 'business' ? 'PRO' : 'FREE'}
                        </button>
                      </div>
                    </div>
                  ))}
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
                <button
                  onClick={() => openTemplateEditor(null)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Novo
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-16"><Loader className="w-8 h-8 text-indigo-400 animate-spin" /></div>
              ) : templates.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                  <Layout className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold text-sm">Nenhum modelo cadastrado</p>
                  <button onClick={() => openTemplateEditor(null)} className="mt-4 text-indigo-400 font-black text-xs uppercase tracking-widest">Clique para criar o primeiro</button>
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
                            className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden"
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
                                  <button onClick={() => openTemplateEditor(tmpl)} className="p-2.5 bg-white/5 rounded-xl text-slate-500"><Edit className="w-4 h-4"/></button>
                                  <button onClick={() => handleDeleteTemplate(tmpl.id)} className="p-2.5 bg-white/5 rounded-xl text-slate-500"><Trash2 className="w-4 h-4"/></button>
                                </div>
                              </div>
                              <p className="text-slate-400 text-xs line-clamp-2 mb-6">{tmpl.description}</p>

                              <button
                                onClick={() => setPreviewTemplate(tmpl)}
                                className="w-full py-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2"
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

      <AnimatePresence>
        {showTemplateForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="w-full bg-slate-900 rounded-t-[2.5rem] max-h-[92vh] overflow-y-auto">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-black text-white">{editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}</h3>
                  <button onClick={() => setShowTemplateForm(false)} className="p-2 text-slate-400"><X className="w-6 h-6"/></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome</label>
                    <input
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: ✂️ Barbearia Moderna"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descrição</label>
                    <textarea
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Ideal para barbeiros..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium h-24 resize-none focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Categoria</label>
                      <select
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold appearance-none"
                      >
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Modo</label>
                      <select
                        value={templateForm.config.storeMode}
                        onChange={(e) => setTemplateForm(f => ({ ...f, config: { ...f.config, storeMode: e.target.value as any } }))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold appearance-none"
                      >
                        <option value="store" className="bg-slate-900">Loja</option>
                        <option value="store+ai" className="bg-slate-900">Loja + IA</option>
                        <option value="scheduling" className="bg-slate-900">Agendamento</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tema</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(THEME_PRESETS).map(key => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTemplateForm(f => ({ ...f, theme_color: key }))}
                          className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                            templateForm.theme_color === key
                              ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg'
                              : 'bg-white/5 text-slate-400 border-white/10'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Boas-vindas</label>
                    <textarea
                      value={templateForm.config.welcomeMessage}
                      onChange={(e) => setTemplateForm(f => ({ ...f, config: { ...f.config, welcomeMessage: e.target.value } }))}
                      placeholder="Mensagem que o cliente verá ao abrir a loja"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium h-20 resize-none focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Prompt da IA
                    </label>
                    <textarea
                      value={templateForm.config.aiPrompt}
                      onChange={(e) => setTemplateForm(f => ({ ...f, config: { ...f.config, aiPrompt: e.target.value } }))}
                      placeholder="Você é o atendente da loja..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium h-28 resize-none focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  disabled={saving}
                  onClick={handleSaveTemplate}
                  className="w-full bg-indigo-500 text-white font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 shadow-primary-glow active:scale-95 disabled:opacity-50"
                >
                  {saving ? <Loader className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Salvar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
