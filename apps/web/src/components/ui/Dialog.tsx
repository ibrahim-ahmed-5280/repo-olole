import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cx } from './primitives';

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: string;
  children: ReactNode;
  side?: 'right' | 'center';
  className?: string;
  testId?: string;
}

/**
 * Accessible modal dialog: focus trap, Escape to close, focus restoration,
 * background scroll lock (restored on close), labelled by its heading.
 */
export function Dialog({ open, onClose, title, closeLabel, children, side = 'right', className, testId }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const focusFirst = window.setTimeout(() => {
      const heading = panelRef.current?.querySelector<HTMLElement>('[data-dialog-title]');
      (heading ?? panelRef.current)?.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" data-testid={testId}>
          <motion.div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cx(
              'absolute flex max-h-dvh flex-col overflow-hidden border-line bg-surface shadow-2xl outline-none',
              side === 'right'
                ? 'inset-y-0 right-0 w-full border-l sm:w-[30rem] sm:rounded-l-3xl'
                : 'left-1/2 top-1/2 max-h-[90dvh] w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border',
              className,
            )}
            initial={side === 'right' ? { x: '100%' } : { opacity: 0, scale: 0.96 }}
            animate={side === 'right' ? { x: 0 } : { opacity: 1, scale: 1 }}
            exit={side === 'right' ? { x: '100%' } : { opacity: 0, scale: 0.96 }}
            transition={{ type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line/70 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6">
              <h2 id={titleId} data-dialog-title tabIndex={-1} className="pt-2 text-xl font-bold outline-none">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-ink/5 hover:text-ink"
                aria-label={closeLabel}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
