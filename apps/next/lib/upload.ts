export async function putFileToSignedUrl({
  uploadUrl,
  file,
  contentType,
}: {
  uploadUrl: string;
  file: File | Blob;
  contentType?: string;
}) {
  const type =
    contentType || ('type' in file ? file.type : undefined) || 'application/octet-stream';
  const headers: Record<string, string> = {
    'Content-Type': type,
  };
  if ('size' in file) {
    headers['Content-Length'] = String(file.size);
  }

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
}

