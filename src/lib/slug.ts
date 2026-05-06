import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const RESERVED_SLUGS = new Set([
  'www', 'admin', 'api', 'app', 'arroba', 'mail', 'help', 'support',
  'store', 'stores', 'login', 'signup', 'auth', 'pages', 'live', 'public',
]);

// Range Unicode dos diacríticos combinantes (NFD): U+0300 — U+036F.
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Normaliza qualquer string em um slug válido para subdomínio.
 *  - minúsculas, sem acentos
 *  - troca espaços por hífen
 *  - mantém apenas [a-z0-9-]
 *  - colapsa hífens repetidos e remove das pontas
 *  - máx 30 chars
 */
export function normalizeSlug(input: string): string {
  if (!input) return '';
  return input
    .toString()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

export interface SlugCheck {
  ok: boolean;
  slug: string;
  reason?: 'too-short' | 'reserved' | 'taken' | 'invalid';
  message: string;
}

export async function validateSlug(rawSlug: string, currentUserUid?: string): Promise<SlugCheck> {
  const slug = normalizeSlug(rawSlug);
  if (!slug || slug.length < 3) {
    return { ok: false, slug, reason: 'too-short', message: 'O link precisa de pelo menos 3 caracteres.' };
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length > 1) {
    return { ok: false, slug, reason: 'invalid', message: 'Use apenas letras, números e hífens (sem começar/terminar com hífen).' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, slug, reason: 'reserved', message: 'Este link é reservado pelo sistema.' };
  }
  const q = query(
    collection(db, 'users'),
    where('professionalSlug', '==', slug),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty && snap.docs[0].id !== currentUserUid) {
    return { ok: false, slug, reason: 'taken', message: 'Este link já está em uso por outra loja.' };
  }
  return { ok: true, slug, message: 'Disponível!' };
}
