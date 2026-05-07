import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Não joga erro fatal — apenas avisa em dev. Em produção, as envs do
  // Cloudflare Pages precisam estar configuradas.
  // eslint-disable-next-line no-console
  console.warn('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente.');
}

/**
 * Cliente Supabase apontando para o schema `arroba`.
 *
 * Todas as queries do app rodam neste schema isolado — outros apps que
 * compartilham o mesmo projeto Supabase não conflitam.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // não usamos OAuth com hash de retorno
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'arroba.auth',
  },
  db: {
    schema: 'arroba',
  },
  global: {
    headers: {
      'X-Client-Info': 'arroba-web',
    },
  },
});

export type ArrobaSchema = typeof supabase;
