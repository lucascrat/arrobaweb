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
  const { presignedUrl, publicUrl } = await getR2PresignedUrl(file.name, file.type);

  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error('Falha ao fazer upload para o Cloudflare R2.');
  }

  return publicUrl;
}
