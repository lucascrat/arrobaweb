import React, { useState, useRef } from 'react';
import { 
  User, 
  Settings, 
  Shield, 
  LogOut, 
  ChevronRight, 
  AtSign, 
  Share2, 
  Verified, 
  Terminal,
  Zap,
  Loader2,
  Volume2,
  Bell,
  Camera,
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../types';
import { BottomNav } from '../components/layout/BottomNav';
import { soundManager } from '../lib/sounds';
import { useAuth } from '../lib/AuthContext';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ProfileScreenProps {
  setScreen: (screen: Screen) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ setScreen }) => {
  const { profile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const stats = [
    { label: 'Sovereignty', value: '98%', icon: Shield, color: 'text-indigo-400' },
    { label: 'Identities', value: '3', icon: AtSign, color: 'text-fuchsia-400' },
    { label: 'Reputation', value: 'Elite', icon: Verified, color: 'text-cyan-400' },
  ];

  const menuItems = [
    { id: 'wallet', label: 'Minha Wallet', icon: Zap, sub: 'Gerenciar ativos e @nomes' },
    { id: 'subscription', label: 'Arroba Plus', icon: Terminal, sub: 'Assinatura ativa até jun/26' },
    { id: 'notifications', label: 'Alertas', icon: Volume2, sub: 'Preferências de som e sistema' },
    { id: 'cloudflare-config', label: 'Cloudflare R2', icon: Cloud, sub: 'Configurar armazenamento segredo' },
    { id: 'settings', label: 'Configurações', icon: Settings, sub: 'Privacidade e segurança' },
  ];

  const handleMenuClick = (id: string) => {
    soundManager.playClick();
    if (id === 'wallet' || id === 'subscription' || id === 'notifications' || id === 'cloudflare-config') {
      setScreen(id as Screen);
    }
  };

  const handleAvatarClick = () => {
    soundManager.playClick();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        // Start progress simulation
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

        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            photoURL: publicUrl,
            updatedAt: new Date(),
          });
        }
        
        soundManager.playChime();
      } catch (err) {
        console.error("Error uploading to R2:", err);
        soundManager.playAlert();
        alert("Erro ao enviar imagem. Verifique as configurações do R2.");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-32 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 justify-between z-40">
        <h1 className="text-xl font-black tracking-tighter text-white">Soberania(@)</h1>
        <button 
          onClick={async () => {
            soundManager.playAlert();
            await auth.signOut();
            setScreen('onboarding');
          }}
          className="p-2 text-slate-400 active:scale-95 transition-all text-red-400/70"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <main className="pt-24 px-6 flex flex-col gap-8">
        {/* Profile Header */}
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
              className={`w-32 h-32 rounded-[3rem] bg-indigo-500/20 p-1 border border-white/10 shadow-glass overflow-hidden transition-all group relative ${isUploading ? 'cursor-wait' : 'hover:scale-105 active:scale-95 cursor-pointer'}`}
            >
              <img 
                src={profile?.photoURL || user?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop'} 
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
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-white/10"
                        />
                        <motion.circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeDasharray="175.9"
                          animate={{ strokeDashoffset: 175.9 - (175.9 * uploadProgress) / 100 }}
                          className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                        />
                      </svg>
                      <Loader2 className="absolute w-6 h-6 text-white animate-spin opacity-50" />
                    </div>
                    
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-0.5">
                        {Math.round(uploadProgress)}%
                      </p>
                      <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/40">
                        {uploadProgress < 100 
                          ? `ETA: ${Math.max(1, Math.round((100 - uploadProgress) / 20))}s` 
                          : 'Sincronizando...'}
                      </p>
                    </div>
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
          <h2 className="text-3xl font-black text-white tracking-tight">{profile?.displayName || profile?.storeName || 'Soberano'}</h2>
          <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mt-1">@{profile?.username || 'identidade'}</p>
          
          <button className="mt-6 px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-2 hover:bg-white/10 transition-all">
            <Share2 className="w-3.5 h-3.5" /> Compartilhar Perfil
          </button>
        </section>

        {/* Stats Grid */}
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

        {/* Notification Preferences */}
        <section className="glass-card p-6 border border-white/10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight uppercase">Preferências de Alerta</h3>
              <p className="text-[10px] font-bold text-slate-500">Configure como você recebe os sinais</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-200">Notificações Sonoras</span>
              </div>
              <button 
                onClick={async () => {
                  const current = profile?.notificationSettings?.soundEnabled ?? true;
                  soundManager.playClick();
                  if (user) {
                    await updateDoc(doc(db, 'users', user.uid), {
                      'notificationSettings.soundEnabled': !current
                    });
                  }
                }}
                className={`w-12 h-6 rounded-full transition-all relative ${profile?.notificationSettings?.soundEnabled !== false ? 'bg-indigo-500' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile?.notificationSettings?.soundEnabled !== false ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl">
                  <Zap className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-200">Notificações Push</span>
              </div>
              <button 
                onClick={async () => {
                  const current = profile?.notificationSettings?.pushEnabled ?? true;
                  soundManager.playClick();
                  
                  if (!current && 'Notification' in window && Notification.permission !== 'granted') {
                    await Notification.requestPermission();
                  }

                  if (user) {
                    await updateDoc(doc(db, 'users', user.uid), {
                      'notificationSettings.pushEnabled': !current
                    });
                  }
                }}
                className={`w-12 h-6 rounded-full transition-all relative ${profile?.notificationSettings?.pushEnabled !== false ? 'bg-cyan-500' : 'bg-slate-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile?.notificationSettings?.pushEnabled !== false ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* Menu Items */}
        <section className="space-y-3">
          {menuItems.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              onClick={() => handleMenuClick(item.id)}
              className="w-full glass-card p-5 flex items-center justify-between border border-white/5 group hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-400 border border-white/5 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h4 className="font-black text-white text-sm tracking-tight">{item.label}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">{item.sub}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-all" />
            </motion.button>
          ))}
        </section>

        {/* Protocol Version */}
        <div className="text-center py-4">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">
            Arroba Protocol v1.2.4-stable
          </p>
        </div>
      </main>

      <BottomNav active="profile" setScreen={setScreen} />
    </div>
  );
};
