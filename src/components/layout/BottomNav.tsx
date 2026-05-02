import React from 'react';
import { MessageCircle, Search, Wallet, Settings, User } from 'lucide-react';
import { Screen } from '../../types';

interface BottomNavProps {
  active: Screen;
  setScreen: (s: Screen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ active, setScreen }) => {
  const tabs: { id: Screen; label: string; icon: any }[] = [
    { id: 'chat-list', label: 'Chats', icon: MessageCircle },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'subscription', label: 'Plus', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/5 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-4 pb-safe z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all active:scale-95 ${
              isActive ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-indigo-500/20 shadow-primary-glow' : ''}`}>
              <Icon className={`w-6 h-6 ${isActive ? 'text-white' : ''}`} />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-500'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
