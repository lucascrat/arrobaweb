/**
 * Arroba Router — Cloudflare Worker
 *
 * Captura todo tráfego em `*.arroba.live` e roteia conforme o subdomínio:
 *
 *   - `media.arroba.live/<key>`  → serve direto do bucket R2 (binding R2_BUCKET)
 *   - qualquer outro subdomínio  → proxy para `arrobaweb.pages.dev`
 *
 * O navegador continua mostrando o hostname original (ex: `bianastore.arroba.live`),
 * então o front-end consegue ler `window.location.hostname` em App.tsx
 * e renderizar a loja pública correspondente ao slug.
 *
 * --------------------------------------------------------------
 * Como aplicar:
 *
 * 1. DNS  → CNAME `*` → `arrobaweb.pages.dev` (Proxied, nuvem laranja)
 *           CNAME `media` → `arrobaweb.pages.dev` (Proxied) — opcional, o `*` já cobre
 * 2. Worker → cole este código → Save and Deploy
 * 3. Settings → Triggers → Routes → adicionar `*.arroba.live/*` na zona arroba.live
 * 4. Settings → Variables → R2 Bucket Bindings → adicionar
 *      Variable name: R2_BUCKET
 *      R2 bucket:     <nome do seu bucket R2 (mesmo usado em functions/api/media/store.ts)>
 * --------------------------------------------------------------
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── 1. media.arroba.live → serve arquivos do R2 ─────────────────────────
    if (url.hostname === 'media.arroba.live') {
      // Preflight CORS
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, HEAD, OPTIONS',
            'access-control-allow-headers': '*',
            'access-control-max-age': '86400',
          },
        });
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      if (!env.R2_BUCKET) {
        return new Response('ERRO: binding R2_BUCKET não configurado no Worker.', { status: 500 });
      }

      // remove a / inicial e decodifica a key
      const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      if (!key) {
        return new Response('Not found', { status: 404 });
      }

      const object = await env.R2_BUCKET.get(key);
      if (!object || !object.body) {
        return new Response('Not found', { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('cache-control', 'public, max-age=31536000, immutable');
      headers.set('access-control-allow-origin', '*');
      headers.set('access-control-expose-headers', 'etag, content-length, content-type');

      // HEAD não devolve body
      if (request.method === 'HEAD') {
        return new Response(null, { headers });
      }
      return new Response(object.body, { headers });
    }

    // ── 2. Qualquer outro *.arroba.live → proxy para o Pages ────────────────
    const target = new URL(request.url);
    target.hostname = 'arrobaweb.pages.dev';
    return fetch(target.toString(), request);
  },
};
