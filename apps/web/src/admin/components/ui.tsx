import { createContext, useCallback, useContext, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { ApiRequestError } from '../../lib/api';
import { cx } from '../../components/ui/primitives';

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-2xl border border-line bg-surface p-5', className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 data-route-focus tabIndex={-1} className="text-2xl font-bold outline-none">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const inputClass =
  'mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-primary aria-[invalid=true]:border-danger';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      {children(id, [hintId, errId].filter(Boolean).join(' ') || undefined)}
      {hint && <p id={hintId} className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={errId} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export const TextInput = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputClass, 'min-h-11', className)} />;
export const TextArea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={4} {...p} className={cx(inputClass, 'resize-y', className)} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputClass, 'min-h-11', className)} />;

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-elevated p-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-primary-strong' : 'bg-line')}
      >
        <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </button>
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: 'green' | 'amber' | 'gray' | 'red' | 'blue'; children: ReactNode }) {
  const tones = {
    green: 'border-success/40 bg-success/10 text-success',
    amber: 'border-warn/40 bg-warn/10 text-warn',
    gray: 'border-line bg-elevated text-muted',
    red: 'border-danger/40 bg-danger/10 text-danger',
    blue: 'border-primary/40 bg-primary/10 text-glow',
  };
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const details = Array.isArray(err.details) ? (err.details as Array<{ path: string; message: string }>).map((d) => `${d.path}: ${d.message}`).join('; ') : '';
    return details ? `${err.message} — ${details}` : err.message;
  }
  return 'Unexpected error';
}

// ───────────── Toasts ─────────────
interface Toast {
  id: number;
  tone: 'success' | 'error';
  text: string;
}
const ToastContext = createContext<(tone: Toast['tone'], text: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast['tone'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tone, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 8000 : 4000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-3 rounded-xl border p-3 text-sm shadow-xl', t.tone === 'success' ? 'border-success/40 bg-surface' : 'border-danger/40 bg-surface')}>
            {t.tone === 'success' ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden />}
            <p className="flex-1">{t.text}</p>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-muted hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export const linesToList = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
