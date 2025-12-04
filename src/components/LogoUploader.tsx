import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { SettingsService } from '@/services/settings.service';
import { Church, Image, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface LogoUploaderProps {
  currentUrl: string | null;
  type?: 'logo' | 'banner';
  onUploadSuccess: (url: string) => void;
  onDeleteSuccess: () => void;
  className?: string;
}

export const LogoUploader = ({
  currentUrl,
  type = 'logo',
  onUploadSuccess,
  onDeleteSuccess,
  className,
}: LogoUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSize = 5 * 1024 * 1024; // 5MB
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];

  const validateFile = (file: File): boolean => {
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Use JPG, PNG, WebP, SVG o GIF.');
      return false;
    }
    if (file.size > maxSize) {
      toast.error('El archivo es muy grande. Máximo 5MB.');
      return false;
    }
    return true;
  };

  const handleUpload = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;

      try {
        setUploading(true);
        setProgress(10);

        // Crear preview local
        const reader = new FileReader();
        reader.onload = e => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setProgress(30);

        // Subir archivo
        const url = await SettingsService.uploadLogo(file, type);

        setProgress(100);
        toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} actualizado exitosamente`);
        onUploadSuccess(url);
        setPreview(null);
      } catch (error: unknown) {
        console.error('Error uploading:', error);
        toast.error(error instanceof Error ? error.message : 'Error al subir el archivo');
        setPreview(null);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [type, onUploadSuccess]
  );

  const handleDelete = useCallback(async () => {
    if (!currentUrl) return;

    try {
      setUploading(true);
      await SettingsService.deleteLogo(type);
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} eliminado`);
      onDeleteSuccess();
    } catch (error: unknown) {
      console.error('Error deleting:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    } finally {
      setUploading(false);
    }
  }, [currentUrl, type, onDeleteSuccess]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUpload(e.dataTransfer.files[0]);
      }
    },
    [handleUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleUpload(e.target.files[0]);
      }
    },
    [handleUpload]
  );

  const displayUrl = preview || currentUrl;
  const isLogo = type === 'logo';

  return (
    <div className={cn('space-y-4', className)}>
      <Card
        className={cn(
          'relative border-2 border-dashed transition-colors cursor-pointer',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          uploading && 'pointer-events-none opacity-70'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div
          className={cn(
            'flex flex-col items-center justify-center p-6',
            isLogo ? 'aspect-square max-w-[200px] mx-auto' : 'aspect-video'
          )}
        >
          {displayUrl ? (
            <div className="relative w-full h-full">
              <img
                src={displayUrl}
                alt={type}
                className={cn('w-full h-full object-contain', isLogo ? 'rounded-lg' : 'rounded-md')}
              />
              {!uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={e => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Cambiar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              {isLogo ? (
                <Church className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              ) : (
                <Image className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              )}
              <p className="text-sm text-muted-foreground mb-2">
                {dragActive ? 'Suelta aquí' : 'Arrastra una imagen o haz clic'}
              </p>
              <p className="text-xs text-muted-foreground">JPG, PNG, WebP, SVG o GIF (máx. 5MB)</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Cancel preview button */}
      {preview && !uploading && (
        <Button variant="outline" size="sm" onClick={() => setPreview(null)} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      )}
    </div>
  );
};

export default LogoUploader;
