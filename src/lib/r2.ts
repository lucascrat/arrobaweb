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

export async function uploadToR2(file: File | Blob, fileName?: string): Promise<string> {
  const formData = new FormData();
  
  // Use provided fileName, or file.name if it's a File, or fallback to 'upload'
  const name = fileName || (file instanceof File ? file.name : 'upload');
  
  // Clean up filename to ASCII to avoid Safari InvalidCharacterError
  const safeName = name.replace(/[^\x00-\x7F]/g, '_') || 'file';

  // Some browsers fail if we construct a new File, so just append the Blob
  formData.append('file', file, safeName);

  const response = await fetch('/api/media/store', {
    method: 'POST',
    body: formData,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `Upload failed (${response.status})`;
    if (isJson) {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } else {
      const text = await response.text();
      console.error('Upload failed with non-JSON response:', text.substring(0, 200));
      errorMessage = `Upload failed (${response.status}): ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  if (isJson) {
    const data = await response.json();
    return data.publicUrl;
  } else {
    const text = await response.text();
    console.error('Upload succeeded but returned non-JSON:', text.substring(0, 200));
    throw new Error('Server returned invalid response format.');
  }
}
