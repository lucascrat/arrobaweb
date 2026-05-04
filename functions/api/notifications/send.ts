export const onRequestPost = async (context) => {
  const { request, env } = context;

  try {
    const { recipientToken, title, body, data } = await request.json();

    if (!recipientToken) {
      return new Response(JSON.stringify({ error: 'Token do destinatário é obrigatório' }), { status: 400 });
    }

    // Precisamos da chave do FCM nas variáveis de ambiente da Cloudflare
    const FCM_SERVER_KEY = env.FCM_SERVER_KEY;
    
    if (!FCM_SERVER_KEY) {
      return new Response(JSON.stringify({ error: 'Chave FCM_SERVER_KEY não configurada na Cloudflare.' }), { status: 500 });
    }

    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientToken,
        notification: {
          title: title,
          body: body,
          sound: 'default',
          badge: '1'
        },
        data: data || {},
        priority: 'high'
      }),
    });

    const result = await fcmResponse.json();

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return new Response(JSON.stringify({ error: 'Falha interna ao enviar notificação' }), { status: 500 });
  }
};
