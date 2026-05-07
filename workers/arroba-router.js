/**
 * Arroba Router — Cloudflare Worker
 *
 * Plano Free do Cloudflare Pages não aceita wildcard como custom domain.
 * Este Worker pega qualquer requisição em `*.arroba.live` e re-emite para
 * o domínio interno do Pages (`arrobaweb.pages.dev`), preservando path,
 * query, headers, método e body.
 *
 * O navegador continua mostrando o hostname original (ex: `bianastore.arroba.live`),
 * então o front-end consegue ler `window.location.hostname` em App.tsx
 * e renderizar a loja pública correspondente ao slug.
 *
 * --------------------------------------------------------------
 * Como aplicar:
 *
 * 1. DNS  → CNAME `*` → `arrobaweb.pages.dev` (Proxied, nuvem laranja)
 * 2. Worker → cole este código → Save and Deploy
 * 3. Settings → Triggers → Routes → adicionar `*.arroba.live/*` na zona arroba.live
 * --------------------------------------------------------------
 */
export default {
  async fetch(request) {
    const target = new URL(request.url);
    target.hostname = 'arrobaweb.pages.dev';
    return fetch(target.toString(), request);
  },
};
