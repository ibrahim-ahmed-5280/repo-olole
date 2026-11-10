import { useId, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { ALLOWED_IMAGE_MIME, type MediaAssetDTO } from '@reveal/shared';
import { Button, cx } from '../../components/ui/primitives';
import { Dialog } from '../../components/ui/Dialog';
import { adminKeys, uploadMedia, useAdminMutation, useMedia } from '../api';
import { Field, TextInput, errorMessage, useToast } from './ui';

export function MediaUploader({ onUploaded }: { onUploaded?: (a: MediaAssetDTO) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const inputId = useId();
  const upload = useAdminMutation(({ f, a }: { f: File; a: string }) => uploadMedia(f, a), [adminKeys.media]);

  const submit = () => {
    if (!file) return;
    if (!ALLOWED_IMAGE_MIME.includes(file.type as never)) return toast('error', 'Use a JPEG, PNG, WebP or AVIF image.');
    upload.mutate(
      { f: file, a: alt },
      {
        onSuccess: (asset) => {
          toast('success', 'Image uploaded and optimised.');
          setFile(null);
          setAlt('');
          if (fileRef.current) fileRef.current.value = '';
          onUploaded?.(asset);
        },
        onError: (e) => toast('error', errorMessage(e)),
      },
    );
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-dashed border-line p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium">Image file</label>
        <input
          id={inputId}
          ref={fileRef}
          type="file"
          accept={ALLOWED_IMAGE_MIME.join(',')}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-elevated file:px-4 file:text-ink"
        />
        <p className="mt-1 text-xs text-muted">Only approved photos. Metadata (EXIF/GPS) is stripped; WebP sizes are generated.</p>
      </div>
      <Field label="Alt text (describe the image)">
        {(id) => <TextInput id={id} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} />}
      </Field>
      <Button onClick={submit} disabled={!file} loading={upload.isPending} icon={<Upload className="size-4" aria-hidden />}>Upload</Button>
    </div>
  );
}

/** Picks an existing (or newly uploaded) media asset. */
export function MediaPicker({ value, onChange, label }: { value: string | null; onChange: (id: string | null) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const media = useMedia();
  const current = media.data?.find((m) => m.id === value);
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-bg">
          {current ? <img src={current.variants[0]?.url ?? current.url} alt={current.altText} className="h-full w-full object-cover" /> : <ImagePlus className="size-6 text-muted" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Choose image</Button>
          {value && <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
        </div>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title={label} closeLabel="Close" side="center">
        <MediaUploader onUploaded={(a) => { onChange(a.id); setOpen(false); }} />
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.data?.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => { onChange(m.id); setOpen(false); }}
                className={cx('block w-full overflow-hidden rounded-xl border-2 text-left', m.id === value ? 'border-primary' : 'border-transparent hover:border-line')}
                aria-pressed={m.id === value}
              >
                <img src={m.variants[0]?.url ?? m.url} alt={m.altText || 'Untitled image'} className="aspect-square w-full object-cover" loading="lazy" />
                <span className="block truncate p-1 text-xs text-muted">{m.altText || `${m.width}×${m.height}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}
