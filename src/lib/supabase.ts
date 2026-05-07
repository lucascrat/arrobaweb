import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!SUPABASE_CONFIGURED) {
  console.error('[supabase] Variáveis de ambiente ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Cloudflare Pages → Settings → Environment Variables.');
  // Mostra um overlay claro pro usuário em vez de tela branca
  if (typeof window !== 'undefined') {
    queueMicrotask(() => {
      const root = document.getElementById('root');
      if (root && !root.dataset.envError) {
        root.dataset.envError = '1';
        root.innerHTML = `
          <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#fff;font-family:system-ui,sans-serif;padding:24px;text-align:center">
            <div style="max-width:520px">
              <div style="font-size:48px;margin-bottom:16px">⚠️</div>
              <h1 style="font-size:24px;font-weight:900;margin:0 0 8px">Configuração pendente</h1>
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px">
                As variáveis de ambiente do Supabase não estão configuradas no Cloudflare Pages.<br/>
                Adicione <code style="background:#1e293b;padding:2px 6px;border-radius:6px;color:#a5b4fc">VITE_SUPABASE_URL</code>
                e <code style="background:#1e293b;padding:2px 6px;border-radius:6px;color:#a5b4fc">VITE_SUPABASE_ANON_KEY</code> em Settings → Environment Variables, e refaça o deploy.
              </p>
            </div>
          </div>
        `;
      }
    });
  }
}

/**
 * Cliente Supabase apontando para o schema `arroba`.
 * Quando as envs faltam, ainda retornamos um stub pra não quebrar imports —
 * mas o overlay acima vai bloquear a UI normal.
 */
export const supabase = createClient(SUPABASE_URL || 'http://localhost.invalid', SUPABASE_ANON_KEY || 'invalid', {
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
