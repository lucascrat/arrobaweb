-- =====================================================================
-- Expor schema `arroba` no PostgREST
-- =====================================================================
-- Roda UMA VEZ por projeto Supabase. Sem isso, o app recebe erro
-- "Invalid schema: arroba" ao tentar consultar profiles/products/etc.
--
-- Importante: a lista deve incluir TODOS os schemas que estão sendo
-- usados no projeto (outros apps que dividem a mesma instância).
-- =====================================================================

alter role authenticator set pgrst.db_schemas =
  'public,arroba,chegoja,startflix,grampol,shopcrat,fitcrat,arbcrypto';

-- Faz o PostgREST recarregar config e cache de tabelas
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
