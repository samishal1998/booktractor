'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@booktractor/app/lib/auth-client';
import { useTRPC, useTRPCClient } from '@booktractor/app/lib/trpc';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { putFileToSignedUrl } from '@/lib/upload';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';

const categories = [
  { value: 'compliance', label: 'Compliance' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'contract', label: 'Contracts' },
  { value: 'other', label: 'Other' },
];

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
};

export default function ClientDocumentsPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const userId = session?.user?.id || '';
  const trpc = useTRPC();
  const client = useTRPCClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState('compliance');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const documentsPathKey = trpc.client.documents.list.pathKey;

  const documentsQuery = useQuery({
    ...trpc.client.documents.list.queryOptions({ userId }),
    enabled: !!userId,
  });

  const saveDocument = useMutation({
    ...trpc.client.documents.save.mutationOptions({
      meta: { invalidateQueryKeys: [documentsPathKey] },
    }),
    onSuccess: () => documentsQuery.refetch(),
  });

  const deleteDocument = useMutation({
    ...trpc.client.documents.delete.mutationOptions({
      meta: { invalidateQueryKeys: [documentsPathKey] },
    }),
    onSuccess: () => documentsQuery.refetch(),
  });

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setUploadError(null);
      const { uploadUrl, publicUrl } = await client.storage.getUploadUrl.mutate({
        entity: 'document',
        contentType: file.type || 'application/octet-stream',
      });
      await putFileToSignedUrl({ uploadUrl, file });
      await saveDocument.mutateAsync({
        userId,
        label: file.name.replace(/\.[^/.]+$/, ''),
        category,
        url: publicUrl,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!userId) return;
    await deleteDocument.mutateAsync({
      userId,
      documentId,
    });
  };

  if (sessionLoading || (documentsQuery.isLoading && !documentsQuery.data)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading documents…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-2xl font-semibold text-gray-900">Sign in required</p>
        <p className="max-w-md text-sm text-gray-500">
          You need to be signed in to access your compliance documents.
        </p>
      </div>
    );
  }

  const documents = documentsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-400">Client workspace</p>
          <h1 className="text-3xl font-semibold text-gray-900">Documents & compliance</h1>
          <p className="text-sm text-gray-500">
            Store COIs, W-9s, contracts, and hand them to owners instantly.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-xs uppercase tracking-wide text-gray-500">Category</label>
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <Button onClick={handleSelectFile} disabled={saveDocument.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {uploadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your files</CardTitle>
          <Badge variant="outline" className="text-xs">
            {documents.length} on file
          </Badge>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-sm text-gray-500">
              <FileText className="h-6 w-6 text-gray-400" />
              <p>No documents uploaded yet.</p>
              <Button size="sm" onClick={handleSelectFile}>
                Upload your first file
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-2 font-medium">Document</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Size</th>
                    <th className="px-3 py-2 font-medium">Uploaded</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-t border-gray-100">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.label}</p>
                            <Link
                              href={doc.url}
                              target="_blank"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View file
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {doc.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{formatFileSize(doc.size)}</td>
                      <td className="px-3 py-3 text-gray-600">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={doc.url} target="_blank">
                              Download
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteDocument.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>• Upload PDF versions of your COI, W-9, and any recurring compliance docs.</p>
          <p>• We store files in Google Cloud Storage and never share them without your consent.</p>
          <p>• Owners see only the documents you attach to booking conversations.</p>
        </CardContent>
      </Card>
    </div>
  );
}

