import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import { useT } from '../../i18n';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-[#1F6FDB] to-[#1A62C8] text-white shadow-[0_8px_30px_-8px_rgba(37,139,255,0.65)] hover:brightness-110 active:brightness-95',
  secondary: 'glass text-ink hover:border-primary/60 hover:bg-elevated/80',
  ghost: 'text-muted hover:text-ink hover:bg-white/5',
  danger: 'bg-[#B4232F] text-white hover:brightness-110',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const sizes = { sm: 'min-h-9 px-3 text-sm', md: 'min-h-11 px-5 text-sm', lg: 'min-h-14 px-8 text-base' }[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        sizes,
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function Spinner({ label }: { label?: string }) {
  const t = useT();
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-10 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{label ?? t.loading}</span>
    </div>
  );
}

export function ErrorState({ onRetry, message, title }: { onRetry?: () => void; message?: string; title?: string }) {
  const t = useT();
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 p-10 text-center">
      <AlertTriangle className="size-8 text-lead" aria-hidden />
      <h2 className="text-xl font-semibold">{title ?? t.errorTitle}</h2>
      <p className="text-muted">{message ?? t.errorBody}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon={<RotateCcw className="size-4" aria-hidden />}>
          {t.retry}
        </Button>
      )}
    </div>
  );
}

export function Badge({ children, className, title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide', className)}>
      {children}
    </span>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
