export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado' }), { status: 400 });
    }

    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({ error: 'Bucket R2 não configurado nas variáveis de ambiente.' }), { status: 500 });
    }

    const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Upload para o R2 usando o binding nativo
    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = `${env.R2_PUBLIC_DOMAIN}/${key}`;

    return new Response(JSON.stringify({ publicUrl, key }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro no upload R2:', error);
    return new Response(JSON.stringify({ error: 'Falha interna no upload' }), { status: 500 });
  }
};
