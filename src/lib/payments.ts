export const createPixPayment = async (amount: number, storeId: string, description: string) => {
  try {
    const response = await fetch('/api/payments/efi/create-pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, storeId, description })
    });
    
    if (!response.ok) throw new Error('Falha ao gerar Pix');
    return await response.json();
  } catch (err) {
    console.error('Payment Error:', err);
    throw err;
  }
};

export const checkPixStatus = async (txid: string, storeId: string) => {
  try {
    const response = await fetch(`/api/payments/efi/status?txid=${txid}&storeId=${storeId}`);
    if (!response.ok) throw new Error('Falha ao verificar status');
    return await response.json();
  } catch (err) {
    console.error('Status Error:', err);
    throw err;
  }
};
