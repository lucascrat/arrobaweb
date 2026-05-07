/**
 * Templates de loja agora vivem no banco (`arroba.store_templates`),
 * populados via SQL em `supabase/seed_templates.sql`.
 *
 * Este arquivo só expõe as constantes auxiliares que as telas usam
 * (categorias e temas de cor) e o número total esperado de modelos.
 */

export const CATEGORY_OPTIONS = [
  'Beleza',
  'Alimentação',
  'Varejo',
  'Serviços',
  'Eletrônicos',
  'Saúde',
  'Educação',
  'Pet',
  'Fitness',
  'Geral',
];

export const THEME_PRESETS: Record<string, { from: string; to: string; accent: string }> = {
  indigo:  { from: 'from-indigo-600',  to: 'to-fuchsia-600', accent: 'indigo' },
  fuchsia: { from: 'from-fuchsia-600', to: 'to-pink-500',    accent: 'fuchsia' },
  emerald: { from: 'from-emerald-500', to: 'to-teal-500',    accent: 'emerald' },
  amber:   { from: 'from-amber-500',   to: 'to-orange-500',  accent: 'amber' },
  cyan:    { from: 'from-cyan-500',    to: 'to-blue-500',    accent: 'cyan' },
  rose:    { from: 'from-rose-500',    to: 'to-red-500',     accent: 'rose' },
  violet:  { from: 'from-violet-500',  to: 'to-indigo-500',  accent: 'violet' },
  slate:   { from: 'from-slate-700',   to: 'to-slate-900',   accent: 'slate' },
};

export const INITIAL_TEMPLATES_COUNT = 10;

/**
 * Reseed dos modelos padrão. Chamado pelo Painel Admin quando o admin
 * clica em "Resetar Padrões".
 *
 * Estratégia: o seed é mantido no SQL (versionado em supabase/seed_templates.sql)
 * — a página admin não tenta replicar os dados em JS. Em vez disso, expomos
 * um botão para o admin pedir ajuda manual, ou — futuramente — chamar uma
 * Edge Function. Por ora, esta função é um no-op para a UI antiga continuar
 * compilando.
 */
export async function seedTemplates(_force = false): Promise<{ ok: boolean; message: string }> {
  return {
    ok: false,
    message: 'Os modelos são gerenciados via SQL (supabase/seed_templates.sql). Use o editor para criar/editar.',
  };
}
