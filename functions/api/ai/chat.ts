export const onRequestPost: PagesFunction<{ GEMINI_API_KEY: string }> = async ({ request, env }) => {
  try {
    const { message, context } = await request.json() as any;
    const { storeName, description, products, services } = context;

    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ reply: "Configuração de IA pendente no servidor." }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const systemPrompt = `Você é o Atendente IA da loja "${storeName}".
Descrição da loja: ${description || 'Uma loja premium no Arroba.'}

Produtos disponíveis:
${products?.map((p: any) => `- ${p.name}: R$ ${p.price}`).join('\n') || 'Nenhum produto cadastrado.'}

Serviços disponíveis:
${services?.map((s: any) => `- ${s.name}: R$ ${s.price} (${s.duration} min)`).join('\n') || 'Nenhum serviço cadastrado.'}

Instruções:
1. Seja simpático, profissional e use emojis.
2. Responda em português.
3. Se o cliente perguntar sobre algo que não temos, diga educadamente.
4. Se o cliente quiser agendar, informe que ele pode clicar em "Ver Serviços" e depois em "Agendar" no serviço desejado.
5. Mantenha as respostas curtas (máximo 3 parágrafos).`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `CONTEXTO DO SISTEMA: ${systemPrompt}\n\nPERGUNTA DO CLIENTE: ${message}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 400,
        }
      })
    });

    const data = await response.json() as any;
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua solicitação agora.";

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ reply: "Houve um erro na comunicação com a IA." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
