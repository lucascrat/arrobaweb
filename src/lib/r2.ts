export async function getR2PresignedUrl(fileName: string, fileType: string): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
  const response = await fetch('/api/r2/presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileName, fileType }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get presigned URL');
  }

  return response.json();
}

export async function uploadToR2(file: File): Promise<string> {
  const formData = new FormData();
  // Safari can throw "The string did not match the expected pattern" on formData.append with custom filename
  // Let's use a safe File instance instead
  const safeName = file.name ? file.name.replace(/[^\x00-\x7F]/g, '_') : 'upload';
  const safeFile = new File([file], safeName || 'file', { type: file.type || 'application/octet-stream' });
  formData.append('file', safeFile);

  const response = await fetch('/api/media/store', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown upload error' }));
    throw new Error(errorData.error || 'Falha ao fazer upload para o Cloudflare R2.');
  }

  const { publicUrl } = await response.json();
  return publicUrl;
}
