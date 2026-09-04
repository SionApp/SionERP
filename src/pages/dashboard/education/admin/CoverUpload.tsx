import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { CloudUpload, ImageOff, Loader2, X } from 'lucide-react';

import { EducationService } from '@/services/education.service';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Course cover upload — public `church-assets` bucket, `education/covers/`
 * path prefix (RLS-whitelisted since PR-A's migration, section 7). Mirrors
 * the design's media-block upload-zone spec (README §8: dashed border,
 * `cloud_upload` icon, "JPG o PNG · hasta 5 MB") reusing the same
 * `edu-image-frame`/`edu-image-frame-border` tokens PR-E's `ImageBlock`
 * placeholder already established, rather than inventing new raw hex.
 *
 * `value`/`onChange` carry the storage PATH (`cover_path`), never a File —
 * the parent form only ever holds the already-uploaded path.
 */
export function CoverUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG o PNG)');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('La portada no puede superar los 5MB');
      return;
    }
    setUploading(true);
    try {
      const { path } = await EducationService.uploadCourseCover(file);
      onChange(path);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo subir la portada');
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    const publicUrl = EducationService.getCoverPublicUrl(value);
    return (
      <div className="relative w-full max-w-xs overflow-hidden rounded-md3-block border border-edu-outline">
        <img src={publicUrl} alt="Portada del curso" className="h-32 w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow"
          aria-label="Quitar portada"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full flex-col items-center gap-1.5 rounded-md3 border border-dashed border-edu-image-frame-border bg-edu-image-frame p-[22px] text-center transition-colors hover:bg-edu-image-frame/70 disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        ) : (
          <CloudUpload className="h-7 w-7 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground">
          {uploading ? 'Subiendo…' : 'Arrastrá una imagen o hacé click para elegir'}
        </span>
        <span className="text-xs text-muted-foreground">JPG o PNG · hasta 5MB</span>
      </button>
    </div>
  );
}

/** Small inline empty-cover placeholder, reused by AdminCourseList rows without a cover. */
export function CoverThumbnailFallback() {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md3-sm bg-edu-container text-on-edu-container">
      <ImageOff className="h-5 w-5" />
    </div>
  );
}
