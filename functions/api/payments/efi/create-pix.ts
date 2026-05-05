export const onRequestPost: PagesFunction<{ 
  FIREBASE_API_KEY: string;
  PROJECT_ID: string;
}> = async ({ request, env }) => {
  try {
    const { amount, storeId, description } = await request.json() as any;

    // 1. Fetch Merchant Config from Firestore
    const userResponse = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.PROJECT_ID}/databases/(default)/documents/users/${storeId}?key=${env.FIREBASE_API_KEY}`
    );
    
    if (!userResponse.ok) throw new Error('Lojista não encontrado');
    const userData = await userResponse.json() as any;
    const efiConfig = userData.fields.efiConfig?.mapValue?.fields;

    if (!efiConfig || !efiConfig.active?.booleanValue) {
      return new Response(JSON.stringify({ error: 'Pagamentos não configurados por este lojista.' }), { status: 400 });
    }

    // 2. Efi Bank Auth (Simplified for MVP - normally requires OAuth with ID/Secret)
    // In a real scenario, you'd call https://api-pix.gerencianet.com.br/oauth/token
    // For this demonstration, we'll return a simulated Pix Copy-and-Paste
    
    const txid = `ARR${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
    const mockPixCode = `00020101021226840014BR.GOV.BCB.PIX0136${efiConfig.key?.stringValue || 'chave-pix-teste'}5204000053039865405${amount.toFixed(2)}5802BR5910ARROBA_PAY6009SAO_PAULO62070503***6304${Math.floor(Math.random()*9000)+1000}`;

    return new Response(JSON.stringify({
      txid,
      pixCode: mockPixCode,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockPixCode)}`,
      amount,
      status: 'pending'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
