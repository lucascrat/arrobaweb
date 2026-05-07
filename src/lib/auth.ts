/**
 * Autenticação simples — usuário + senha.
 *
 * Por baixo dos panos usamos Supabase Auth com email sintético
 * `${username}@arroba.local`. Isso nos dá:
 *   - sessão JWT (RLS do Supabase funciona)
 *   - hash de senha pelo gotrue
 *   - id estável (auth.uid → arroba.profiles.id)
 *
 * Sem confirmação de email, sem OAuth, sem flow de recuperação por email
 * (a recuperação de senha é tratada pelo admin).
 */

import { supabase } from './supabase';

const SYNTHETIC_DOMAIN = 'arroba.local';

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export type AccountType = 'personal' | 'business';

export interface RegisterInput {
  username: string;
  password: string;
  accountType: AccountType;
  storeName?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  userId?: string;
}

function normalizeUsername(raw: string): string {
  return (raw || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
}

function syntheticEmail(username: string): string {
  return `${username}@${SYNTHETIC_DOMAIN}`;
}

function mapAuthError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('user already registered') || m.includes('already')) {
    return 'Este usuário já está em uso. Escolha outro.';
  }
  if (m.includes('invalid login') || m.includes('credentials')) {
    return 'Usuário ou senha incorretos.';
  }
  if (m.includes('password')) {
    return 'Senha precisa ter pelo menos 6 caracteres.';
  }
  return message || 'Falha na autenticação.';
}

/**
 * Cria um novo usuário e já faz login automaticamente.
 * O profile em `arroba.profiles` é criado pelo trigger no banco.
 */
export async function register({
  username,
  password,
  accountType,
  storeName,
}: RegisterInput): Promise<AuthResult> {
  const u = normalizeUsername(username);
  if (!USERNAME_RE.test(u)) {
    return { ok: false, error: 'Usuário deve ter 3-24 caracteres (letras minúsculas, números ou underline).' };
  }
  if (!password || password.length < 6) {
    return { ok: false, error: 'Senha precisa de pelo menos 6 caracteres.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: syntheticEmail(u),
    password,
    options: {
      data: {
        username: u,
        display_name: storeName?.trim() || u,
        account_type: accountType,
      },
    },
  });

  if (error) return { ok: false, error: mapAuthError(error.message) };
  if (!data.user) return { ok: false, error: 'Cadastro retornou sem usuário.' };

  // Atualiza o profile com os campos de loja, caso aplicável.
  // O trigger já criou o profile básico; aqui completamos.
  const updates: Record<string, any> = {
    account_type: accountType,
  };
  if (accountType === 'business' && storeName) {
    updates.store_name = storeName.trim();
  }

  // Como acabou de logar, RLS permite update do próprio profile.
  await supabase.from('profiles').update(updates).eq('id', data.user.id);

  return { ok: true, userId: data.user.id };
}

/**
 * Login com usuário + senha. Retorna o id ou um erro amigável.
 */
export async function login(username: string, password: string): Promise<AuthResult> {
  const u = normalizeUsername(username);
  if (!u) return { ok: false, error: 'Informe seu usuário.' };
  if (!password) return { ok: false, error: 'Informe sua senha.' };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(u),
    password,
  });

  if (error) return { ok: false, error: mapAuthError(error.message) };
  return { ok: true, userId: data.user?.id };
}

/** Logout completo. */
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

/** Sessão atual, se houver. */
export async function currentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Atualiza apenas a senha do usuário logado. */
export async function changePassword(newPassword: string): Promise<AuthResult> {
  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Senha precisa de pelo menos 6 caracteres.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
