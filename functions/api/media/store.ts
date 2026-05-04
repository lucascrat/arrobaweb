export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    if (!env.R2_BUCKET) {
      return new Response("ERRO: Associação R2_BUCKET não encontrada.", { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response("ERRO: Nenhum arquivo válido enviado.", { status: 400 });
    }

    const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    // Garantir que o domínio não tenha barra no final e tenha o protocolo
    let domain = (env.R2_PUBLIC_DOMAIN || '').trim();
    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1);
    }
    if (domain && !domain.startsWith('http')) {
      domain = `https://${domain}`;
    }

    const publicUrl = `${domain}/${key}`;

    return new Response(JSON.stringify({ publicUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(`ERRO CRÍTICO: ${error.message}`, { status: 500 });
  }
};
