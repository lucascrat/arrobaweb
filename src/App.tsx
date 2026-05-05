import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { RegistrationScreen } from './screens/RegistrationScreen';
import { ChatListScreen } from './screens/ChatListScreen';
import { ChatRoomScreen } from './screens/ChatRoomScreen';
import { WalletScreen } from './screens/WalletScreen';
import { SubscriptionScreen } from './screens/SubscriptionScreen';
import { SearchScreen } from './screens/SearchScreen';
import { CreateGroupScreen } from './screens/CreateGroupScreen';
import { BusinessProfileScreen } from './screens/BusinessProfileScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { NameStoreScreen } from './screens/NameStoreScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CloudflareConfigScreen } from './screens/CloudflareConfigScreen';
import { PublicStoreScreen } from './screens/PublicStoreScreen';
import { Screen } from './types';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Detect if accessed via a professional store subdomain
function getStoreSlug(): string | null {
  const hostname = window.location.hostname;
  // In dev: localhost → no slug. In prod: bianastore.arroba.live → "bianastore"
  const knownRoots = ['arroba.live', 'www.arroba.live', 'localhost', 'arrobaweb.pages.dev'];
  if (knownRoots.some(r => hostname === r || hostname.endsWith(`.${r}`) === false && hostname === r)) {
    return null;
  }
  const parts = hostname.split('.');
  // e.g. bianastore.arroba.live → parts = ['bianastore', 'arroba', 'live']
  if (parts.length >= 3 && hostname.endsWith('.arroba.live')) {
    const slug = parts[0];
    if (slug && slug !== 'www' && slug !== 'admin') {
      return slug;
    }
  }
  return null;
}

const storeSlug = getStoreSlug();

function AppContent() {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const { user, profile, loading } = useAuth();

  // Auto-navigation based on auth state
  React.useEffect(() => {
    if (!loading) {
      if (user && profile) {
        if (screen === 'onboarding' || screen === 'registration') {
          setScreen('chat-list');
        }
      } else if (user && !profile) {
        setScreen('registration');
      }
    }
  }, [user, profile, loading, screen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="mt-4 text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Arroba Syncing...</p>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreen next={() => setScreen('registration')} />;
      case 'registration':
        return <RegistrationScreen next={() => setScreen('chat-list')} />;
      case 'chat-list':
        return <ChatListScreen setScreen={setScreen} setSelectedChatId={setSelectedChatId} />;
      case 'chat-room':
        return <ChatRoomScreen setScreen={setScreen} chatId={selectedChatId} />;
      case 'wallet':
        return <WalletScreen setScreen={setScreen} />;
      case 'search':
        return <SearchScreen setScreen={setScreen} setSelectedChatId={setSelectedChatId} />;
      case 'subscription':
        return <SubscriptionScreen setScreen={setScreen} />;
      case 'create-group':
        return <CreateGroupScreen setScreen={setScreen} />;
      case 'business-profile':
        return <BusinessProfileScreen setScreen={setScreen} />;
      case 'catalog':
        return <CatalogScreen setScreen={setScreen} />;
      case 'name-store':
        return <NameStoreScreen setScreen={setScreen} />;
      case 'notifications':
        return <NotificationsScreen setScreen={setScreen} />;
      case 'profile':
        return <ProfileScreen setScreen={setScreen} />;
      case 'cloudflare-config':
        return <CloudflareConfigScreen setScreen={setScreen} />;
      default:
        return <OnboardingScreen next={() => setScreen('registration')} />;
    }
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen relative shadow-2xl bg-slate-950 overflow-x-hidden font-manrope">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="min-h-screen"
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  // If accessed via a professional subdomain (e.g. bianastore.arroba.live),
  // render the public store page directly — no auth required.
  if (storeSlug) {
    return (
      <AuthProvider>
        <div className="max-w-[480px] mx-auto min-h-screen relative shadow-2xl bg-slate-950 overflow-x-hidden font-manrope">
          <PublicStoreScreen slug={storeSlug} />
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
