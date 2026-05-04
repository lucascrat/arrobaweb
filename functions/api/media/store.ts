export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    // Log básico para diagnóstico
    console.log("Iniciando processamento de upload...");

    if (!env.R2_BUCKET) {
      return new Response("ERRO: Associação R2_BUCKET não encontrada no ambiente.", { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response("ERRO: Nenhum arquivo válido enviado.", { status: 400 });
    }

    const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Upload direto
    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = `${env.R2_PUBLIC_DOMAIN}/${key}`;

    return new Response(JSON.stringify({ publicUrl }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(`ERRO CRÍTICO: ${error.message}`, { status: 500 });
  }
};
