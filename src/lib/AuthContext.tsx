import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { soundManager } from './sounds';

/**
 * Linha bruta do banco (`arroba.profiles`) — snake_case.
 */
interface ProfileRow {
  id: string;
  username: string | null;
  email: string | null;
  display_name: string | null;
  photo_url: string | null;
  account_type: 'personal' | 'business';
  store_name: string | null;
  professional_slug: string | null;
  store_mode: 'store' | 'store+ai' | 'scheduling' | null;
  store_description: string | null;
  template_id: string | null;
  theme_color: string | null;
  store_logo: string | null;
  config: Record<string, any> | null;
  efi_config: Record<string, any> | null;
  access_code_enabled: boolean;
  access_code: string | null;
  onboarding_completed: boolean;
  is_admin: boolean;
  role: string | null;
  online: boolean;
  last_seen: string | null;
  notification_settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Profile exposto às telas — mantém os nomes camelCase que o código
 * antigo usava (vindo do Firestore). Inclui também os snake_case no
 * mesmo objeto, então qualquer leitura funciona.
 */
export interface Profile extends ProfileRow {
  // Aliases camelCase (write-once: a fonte de verdade é o snake_case do banco)
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  accountType: 'personal' | 'business';
  storeName: string | null;
  professionalSlug: string | null;
  storeMode: 'store' | 'store+ai' | 'scheduling' | null;
  storeDescription: string | null;
  templateId: string | null;
  themeColor: string | null;
  storeLogo: string | null;
  efiConfig: Record<string, any>;
  accessCodeEnabled: boolean;
  accessCode: string | null;
  onboardingCompleted: boolean;
  isAdmin: boolean;
  lastSeen: string | null;
  notificationSettings: Record<string, any>;
}

/**
 * "User" compatível com o que o código antigo (Firebase) esperava:
 * inclui `uid` (= id), `email`, `displayName`, `photoURL`.
 */
export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  raw: SupabaseUser;
}

function toAppUser(u: SupabaseUser | null | undefined): AppUser | null {
  if (!u) return null;
  const meta = (u.user_metadata || {}) as Record<string, any>;
  return {
    id: u.id,
    uid: u.id,
    email: u.email ?? null,
    displayName: meta.display_name || meta.full_name || meta.name || null,
    photoURL: meta.avatar_url || null,
    raw: u,
  };
}

function toProfile(row: ProfileRow): Profile {
  return {
    ...row,
    config: row.config ?? {},
    efi_config: row.efi_config ?? {},
    notification_settings: row.notification_settings ?? {},
    // Aliases camelCase
    uid: row.id,
    displayName: row.display_name,
    photoURL: row.photo_url,
    accountType: row.account_type,
    storeName: row.store_name,
    professionalSlug: row.professional_slug,
    storeMode: row.store_mode,
    storeDescription: row.store_description,
    templateId: row.template_id,
    themeColor: row.theme_color,
    storeLogo: row.store_logo,
    efiConfig: (row.efi_config ?? {}) as Record<string, any>,
    accessCodeEnabled: row.access_code_enabled,
    accessCode: row.access_code,
    onboardingCompleted: row.onboarding_completed,
    isAdmin: row.is_admin,
    lastSeen: row.last_seen,
    notificationSettings: (row.notification_settings ?? {}) as Record<string, any>,
  };
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const user = toAppUser(session?.user);

  const fetchProfile = async (uid: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.warn('[AuthContext] profile load error:', error.message);
      return null;
    }
    return data ? toProfile(data as ProfileRow) : null;
  };

  const subscribe = (uid: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const ch = supabase
      .channel(`profile:${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'arroba', table: 'profiles', filter: `id=eq.${uid}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setProfile(null);
            return;
          }
          const row = payload.new as ProfileRow;
          if (!row) return;
          const p = toProfile(row);
          setProfile(p);
          if (p.notification_settings?.soundEnabled !== undefined) {
            soundManager.setEnabled(!!p.notification_settings.soundEnabled);
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
  };

  const setOnline = async (uid: string, online: boolean) => {
    try {
      await supabase
        .from('profiles')
        .update({ online, last_seen: new Date().toISOString() })
        .eq('id', uid);
    } catch {/* ignora */}
  };

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session ?? null);
      const uid = data.session?.user.id;
      if (uid) {
        const p = await fetchProfile(uid);
        if (active) setProfile(p);
        subscribe(uid);
        setOnline(uid, true);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const uid = newSession?.user.id;
      if (uid) {
        const p = await fetchProfile(uid);
        setProfile(p);
        subscribe(uid);
        setOnline(uid, true);
      } else {
        setProfile(null);
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
      setLoading(false);
    });

    const handleVisibility = () => {
      supabase.auth.getSession().then(({ data }) => {
        const uid = data.session?.user.id;
        if (uid) setOnline(uid, document.visibilityState === 'visible');
      });
    };
    window.addEventListener('visibilitychange', handleVisibility);
    const handleUnload = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user.id) setOnline(data.session.user.id, false);
      });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    setProfile(await fetchProfile(user.id));
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
