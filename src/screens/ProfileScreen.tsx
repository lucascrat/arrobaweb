import React, { useRef, useState } from 'react';
import {
  Settings, Shield, LogOut, ChevronRight, AtSign, Share2, Verified, Terminal, Zap,
  Loader2, Volume2, Bell, Camera, Cloud, Store,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { logout } from '../lib/auth';

interface ProfileScreenProps {
  setScreen: (screen: Screen) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ setScreen }) => {
  const { profile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const stats = [
    { label: 'Soberania', value: '98%', icon: Shield, color: 'text-indigo-400' },
    { label: 'Identidade', value: '@', icon: AtSign, color: 'text-fuchsia-400' },
    { label: 'Reputação', value: 'Elite', icon: Verified, color: 'text-cyan-400' },
  ];

  const menuItems = [
    { id: 'wallet', label: 'Minha Wallet', icon: Zap, sub: 'Gerenciar ativos e @nomes' },
    { id: 'subscription', label: 'Arroba Plus', icon: Terminal, sub: 'Assinatura ativa' },
    ...(profile?.account_type === 'business' ? [
      { id: 'store-manager', label: 'Gerenciar Loja', icon: Store, sub: 'Produtos, IA e Agendamentos' }
    ] : []),
    { id: 'notifications', label: 'Alertas', icon: Volume2, sub: 'Preferências de som e sistema' },
    { id: 'cloudflare-config', label: 'Cloudflare R2', icon: Cloud, sub: 'Configurar armazenamento' },
    { id: 'settings', label: 'Configurações', icon: Settings, sub: 'Privacidade e segurança' },
    ...(profile?.is_admin ? [
      { id: 'admin-dashboard', label: 'Painel Admin', icon: Terminal, sub: 'Gestão da Plataforma' }
    ] : []),
  ];

  const handleMenuClick = (id: string) => {
    soundManager.playClick();
    if (['wallet', 'subscription', 'notifications', 'cloudflare-config', 'store-manager', 'admin-dashboard', 'business-profile'].includes(id)) {
      setScreen(id as Screen);
    }
  };

  const handleAvatarClick = () => {
    soundManager.playClick();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + Math.random() * 5;
          return next >= 90 ? 90 : next;
        });
      }, 500);

      const { uploadToR2 } = await import('../lib/r2');
      const publicUrl = await uploadToR2(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      await supabase.from('profiles').update({ photo_url: publicUrl }).eq('id', user.id);
      soundManager.playChime();
    } catch (err) {
      console.error('R2 upload error', err);
      soundManager.playAlert();
      alert('Erro ao enviar imagem. Verifique R2.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const updateNotifSetting = async (key: 'soundEnabled' | 'pushEnabled', value: boolean) => {
    if (!user) return;
    soundManager.playClick();
    const next = { ...(profile?.notification_settings || {}), [key]: value };
    await supabase.from('profiles').update({ notification_settings: next }).eq('id', user.id);
  };

  const handleAccountTypeChange = async (type: 'personal' | 'business') => {
    if (!user) return;
    soundManager.playClick();
    await supabase.from('profiles').update({ account_type: type }).eq('id', user.id);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-32 relative overflow-x-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 justify-between z-40">
        <h1 className="text-xl font-black tracking-tighter text-white">Soberania(@)</h1>
        <button
          onClick={async () => {
            soundManager.playAlert();
            await logout();
            setScreen('onboarding');
          }}
          className="p-2 active:scale-95 text-red-400/70"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <main className="pt-24 px-6 flex flex-col gap-8">
        <section className="flex flex-col items-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="relative group mb-4">
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className={`w-32 h-32 rounded-[3rem] bg-indigo-500/20 p-1 border border-white/10 shadow-glass overflow-hidden transition-all relative ${isUploading ? 'cursor-wait' : 'hover:scale-105 active:scale-95 cursor-pointer'}`}
            >
              <img
                src={profile?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || user?.id}`}
                alt="Avatar"
                className={`w-full h-full rounded-[2.8rem] object-cover transition-all duration-500 ${isUploading ? 'blur-sm scale-110' : ''}`}
              />

              <AnimatePresence>
                {isUploading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-indigo-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 p-4"
                  >
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{Math.round(uploadProgress)}%</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isUploading && (
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </button>
            <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-white p-2 rounded-2xl shadow-primary-glow border-2 border-slate-950 pointer-events-none">
              <Verified className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">{profile?.display_name || profile?.store_name || profile?.username || 'Soberano'}</h2>
          <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mt-1">@{profile?.username || 'identidade'}</p>

          {profile?.account_type === 'business' && profile?.professional_slug && (
            <a
              href={`https://${profile.professional_slug}.arroba.live`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 px-4 py-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-fuchsia-300 flex items-center gap-2"
            >
              <Share2 className="w-3.5 h-3.5" /> {profile.professional_slug}.arroba.live
            </a>
          )}
        </section>

        <section className="grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4 flex flex-col items-center gap-2 border border-white/5"
            >
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <div className="text-center">
                <p className="text-xl font-black text-white leading-none">{stat.value}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="glass-card p-6 border border-white/10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight uppercase">Alertas</h3>
              <p className="text-[10px] font-bold text-slate-500">Preferências de notificação</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl"><Volume2 className="w-4 h-4 text-slate-400" /></div>
                <span className="text-xs font-bold text-slate-200">Sons</span>
              </div>
              <button
                onClick={() => updateNotifSetting('soundEnabled', !(profile?.notification_settings?.soundEnabled ?? true))}
                className={`w-12 h-6 rounded-full transition-all relative ${profile?.notification_settings?.soundEnabled !== false ? 'bg-indigo-500' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile?.notification_settings?.soundEnabled !== false ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl"><Zap className="w-4 h-4 text-slate-400" /></div>
                <span className="text-xs font-bold text-slate-200">Push</span>
              </div>
              <button
                onClick={() => updateNotifSetting('pushEnabled', !(profile?.notification_settings?.pushEnabled ?? true))}
                className={`w-12 h-6 rounded-full transition-all relative ${profile?.notification_settings?.pushEnabled !== false ? 'bg-cyan-500' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile?.notification_settings?.pushEnabled !== false ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {profile?.is_admin && (
          <section className="glass-card p-6 border border-indigo-500/30 bg-indigo-500/5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase">Modo Desenvolvedor</h3>
                <p className="text-[10px] font-bold text-slate-400">Alternar tipo de conta para teste</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div>
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Tipo</span>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">Atual: {profile.account_type}</span>
              </div>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => handleAccountTypeChange('personal')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${profile.account_type === 'personal' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}
                >
                  Pessoal
                </button>
                <button
                  onClick={() => handleAccountTypeChange('business')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${profile.account_type === 'business' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}
                >
                  Business
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3">
          {menuItems.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => handleMenuClick(item.id)}
              className="w-full glass-card p-5 flex items-center justify-between border border-white/5 group hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 border border-white/5 group-hover:bg-indigo-500 group-hover:text-white">
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="font-black text-white text-sm">{item.label}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{item.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white" />
            </motion.button>
          ))}
        </section>

        <div className="text-center py-4">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">
            Arroba Protocol v2.0-supabase
          </p>
        </div>
      </main>

      <BottomNav active="profile" setScreen={setScreen} />
    </div>
  );
};
