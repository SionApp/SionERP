import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserService } from '@/services/user.service';

export function UserDocumentsTab({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['user-documents', userId],
    queryFn: () => UserService.getDocuments(userId),
  });

  const upload = useMutation({
    mutationFn: (file: File) => UserService.uploadDocument(userId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-documents', userId] });
      toast.success('Documento subido');
    },
    onError: () => toast.error('No se pudo subir el documento'),
  });

  const remove = useMutation({
    mutationFn: (doc: { id: string; storage_path: string }) =>
      UserService.deleteDocument(userId, doc.id, doc.storage_path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-documents', userId] });
      toast.success('Documento eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el documento'),
  });

  async function handleOpen(storagePath: string, docId: string) {
    setOpeningId(docId);
    try {
      const url = await UserService.getDocumentSignedUrl(storagePath);
      window.open(url, '_blank');
    } catch {
      toast.error('No se pudo abrir el documento');
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Documentos
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Subir
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = '';
          }}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Este usuario no tiene documentos adjuntos.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Subido por {doc.uploaded_by_name} ·{' '}
                    {new Date(doc.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={openingId === doc.id}
                    onClick={() => handleOpen(doc.storage_path, doc.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => remove.mutate(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
