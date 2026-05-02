import React, { useState, useMemo, useEffect } from 'react';
import { Bell, MessageSquare, AtSign, Zap, ArrowLeft, MoreVertical, Trash2, CheckCircle2, Calendar, SortDesc, SortAsc, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../types';
import { soundManager } from '../lib/sounds';

interface NotificationsScreenProps {
  setScreen: (screen: Screen) => void;
}

type NotificationType = 'message' | 'mention' | 'protocol';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  sender?: {
    name: string;
    avatar: string;
  };
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ setScreen }) => {
  const [activeTab, setActiveTab] = useState<'all' | NotificationType>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    soundManager.setEnabled(newState);
    if (newState) soundManager.playClick();
  };

  useEffect(() => {
    // Play subtle chime when entering the notification center
    const timer = setTimeout(() => {
      soundManager.playChime();
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'mention',
      title: 'Menção em @devs_brasil',
      description: 'Erick Silva mencionou você no grupo: "Alguém sabe como resolver esse erro de CSS?"',
      timestamp: new Date(Date.now() - 1000 * 60 * 2), // 2m ago
      read: false,
      sender: {
        name: 'Erick Silva',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop'
      }
    },
    {
      id: '2',
      type: 'protocol',
      title: 'Protocolo v1.2 Ativo',
      description: 'O Protocolo de Soberania Digital foi atualizado. Novas camadas de criptografia quântica implementadas.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1), // 1h ago
      read: false
    },
    {
      id: '3',
      type: 'message',
      title: 'Nova Mensagem',
      description: 'Beatriz Silva enviou: "Você viu os novos @ premium que saíram hoje?"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3h ago
      read: true,
      sender: {
        name: 'Beatriz Silva',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
      }
    },
    {
      id: '4',
      type: 'mention',
      title: 'Menção Direta',
      description: 'Lucas Tech mencionou você em um comentário: "@user o deploy foi concluído com sucesso!"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5h ago
      read: true,
      sender: {
        name: 'Lucas Tech',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop'
      }
    },
    {
      id: '5',
      type: 'protocol',
      title: 'Manutenção Preventiva',
      description: 'O ecossistema Arroba passará por uma leve otimização às 04:00 UTC.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1d ago
      read: true
    },
    {
      id: '6',
      type: 'message',
      title: 'Mensagem Antiga',
      description: 'Este é um registro histórico de uma conversa antiga.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10d ago
      read: true,
      sender: {
        name: 'Admin',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop'
      }
    }
  ]);

  const sortedAndFilteredNotifications = useMemo(() => {
    let result = [...notifications];

    // Filter by type
    if (activeTab !== 'all') {
      result = result.filter(n => n.type === activeTab);
    }

    // Filter by date
    const now = new Date();
    if (dateFilter === 'today') {
      result = result.filter(n => {
        const d = new Date(n.timestamp);
        return d.getDate() === now.getDate() && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(n => new Date(n.timestamp) > weekAgo);
    }

    // Sort
    result.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [notifications, activeTab, dateFilter, sortOrder]);

  const getTimeAgo = (date: Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const markAllRead = () => {
    soundManager.playClick();
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    soundManager.playAlert();
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'mention': return <AtSign className="w-4 h-4" />;
      case 'protocol': return <Zap className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case 'message': return 'bg-indigo-500';
      case 'mention': return 'bg-cyan-500';
      case 'protocol': return 'bg-fuchsia-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col pb-24 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[300px] h-[300px] bg-fuchsia-600/10 rounded-full blur-[80px] pointer-events-none" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 flex items-center px-6 justify-between z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => {
            soundManager.playClick();
            setScreen('chat-list');
          }} className="p-2 text-slate-400 active:scale-95 transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500 rounded-lg shadow-primary-glow">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white">Alertas</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleSound}
            className={`p-2 rounded-xl transition-all ${soundEnabled ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 bg-white/5'}`}
            title={soundEnabled ? 'Desativar som' : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => {
              setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
              soundManager.playClick();
            }}
            className="p-2 text-slate-400 hover:text-indigo-400 transition-colors bg-white/5 rounded-xl border border-white/5"
            title={sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigos'}
          >
            {sortOrder === 'desc' ? <SortDesc className="w-5 h-5 text-indigo-400" /> : <SortAsc className="w-5 h-5 text-indigo-400" />}
          </button>
          <button 
            onClick={markAllRead}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Marcar todas como lidas"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-24 px-6 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 p-1.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
            {(['all', 'mention', 'message', 'protocol'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  soundManager.playClick();
                }}
                className={`
                  px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                  ${activeTab === tab 
                    ? 'bg-indigo-500 text-white shadow-primary-glow' 
                    : 'text-slate-500 hover:text-slate-300'
                  }
                `}
              >
                {tab === 'all' ? 'Todos' : tab === 'mention' ? 'Menções' : tab === 'message' ? 'Mensagens' : 'Protocolo'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 text-slate-500 mr-2">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-widest">Filtrar:</span>
            </div>
            {(['all', 'today', 'week'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setDateFilter(filter);
                  soundManager.playClick();
                }}
                className={`
                  px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border
                  ${dateFilter === filter 
                    ? 'bg-white/10 border-indigo-500/50 text-indigo-400' 
                    : 'bg-white/5 border-transparent text-slate-500'
                  }
                `}
              >
                {filter === 'all' ? 'Sempre' : filter === 'today' ? 'Hoje' : 'Essa Semana'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {sortedAndFilteredNotifications.length > 0 ? (
              sortedAndFilteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`
                    glass-card p-5 border border-white/5 relative group transition-all
                    ${!notification.read ? 'bg-white/10 border-white/20' : 'bg-white/5'}
                  `}
                >
                  {!notification.read && (
                    <div className="absolute top-5 right-5 w-2 h-2 bg-indigo-500 rounded-full shadow-primary-glow" />
                  )}
                  
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {notification.sender ? (
                        <img src={notification.sender.avatar} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10" alt="" />
                      ) : (
                        <div className={`w-12 h-12 rounded-2xl ${getTypeColor(notification.type)} flex items-center justify-center text-white shadow-lg`}>
                          {getTypeIcon(notification.type)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-black truncate ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] font-bold text-slate-500 ml-2">{getTimeAgo(notification.timestamp)}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed line-clamp-2">
                        {notification.description}
                      </p>
                      
                      <div className="mt-4 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                          Ver Detalhes
                        </button>
                        <button 
                          onClick={() => deleteNotification(notification.id)}
                          className="text-[10px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-20 text-center"
              >
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <Bell className="w-10 h-10 text-slate-700" />
                </div>
                <h3 className="text-slate-300 font-black tracking-tight">Tudo limpo!</h3>
                <p className="text-slate-600 text-sm font-bold mt-1">Nenhuma notificação {dateFilter !== 'all' ? 'neste período' : 'encontrada'}.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
