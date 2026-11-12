import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { FEEDBACK_SUGGESTION_MAX, type PillarSlug } from '@reveal/shared';
import { useT } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { track } from '../../lib/analytics';
import { useSubmitFeedback } from '../../services/public';
import { Button, cx } from '../ui/primitives';

const STORAGE = (slug: string) => `reveal.feedback.${slug}`;

export function wasSubmitted(slug: string) {
  try {
    return sessionStorage.getItem(STORAGE(slug)) === '1';
  } catch {
    return false;
  }
}

interface Props {
  pillar: PillarSlug;
  /** Preview mode renders the form but never submits. */
  disabled?: boolean;
  onSkip?: () => void;
  onSubmitted?: () => void;
  /** 'dialog': rendered inside the feedback popup (the dialog provides the heading; "Not now" closes it). */
  variant?: 'card' | 'dialog';
}

/** Optional, anonymous Yes/No feedback about a roadmap. Not an election vote. */
export function FeedbackForm({ pillar, disabled, onSkip, onSubmitted, variant = 'card' }: Props) {
  const inDialog = variant === 'dialog';
  const t = useT();
  const ids = { q: useId(), s: useId(), hint: useId(), err: useId() };
  const mutation = useSubmitFeedback();
  const [done, setDone] = useState(() => wasSubmitted(pillar));
  const [skipped, setSkipped] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const schema = z.object({
    response: z.enum(['yes', 'no'], { errorMap: () => ({ message: t.feedback.chooseOne }) }),
    suggestion: z.string().max(FEEDBACK_SUGGESTION_MAX, t.feedback.tooLong).optional(),
    website: z.string().optional(),
  });
  type Values = z.infer<typeof schema>;

  const { register, handleSubmit, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { suggestion: '', website: '' },
  });
  const suggestion = watch('suggestion') ?? '';
  const response = watch('response');

  useEffect(() => {
    if (done || skipped) statusRef.current?.focus();
  }, [done, skipped]);

  const onSubmit = handleSubmit(async (values) => {
    if (disabled || mutation.isPending) return;
    try {
      await mutation.mutateAsync({ pillar, response: values.response, suggestion: values.suggestion || undefined, website: values.website || undefined });
    } catch {
      return; // error state is rendered from mutation.isError
    }
    try {
      sessionStorage.setItem(STORAGE(pillar), '1');
    } catch {
      /* ignore */
    }
    track({ type: 'feedback_submit', route: `/roadmap/${pillar}`, pillar });
    setDone(true);
    onSubmitted?.();
  });

  if (done) {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className={cx('flex flex-wrap items-center gap-3 outline-none', inDialog ? 'py-2' : 'glass rounded-[var(--radius-card)] p-6')} data-testid="feedback-success">
        <CheckCircle2 className="size-7 shrink-0 text-success" aria-hidden />
        <p className="flex-1 text-lg font-semibold">{t.feedback.success}</p>
        {inDialog && onSkip && <Button variant="secondary" size="sm" onClick={onSkip}>{t.about.close}</Button>}
      </div>
    );
  }
  if (skipped && !inDialog) {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-dashed border-line p-6 outline-none sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted">{t.feedback.skipped}</p>
        <Button variant="secondary" size="sm" onClick={() => setSkipped(false)}>{t.feedback.giveAnyway}</Button>
      </div>
    );
  }

  const errorMessage =
    mutation.error instanceof ApiRequestError && mutation.error.status === 429 ? t.feedback.rateLimited : mutation.isError ? t.feedback.error : null;

  return (
    <form onSubmit={onSubmit} noValidate className={cx('relative', !inDialog && 'glass rounded-[var(--radius-card)] p-5 sm:p-8')} aria-describedby={ids.hint} data-testid="feedback-form">
      {inDialog ? (
        <p className="text-[15px] leading-relaxed text-muted">{t.feedback.prompt}</p>
      ) : (
        <h2 className="font-display text-xl font-bold sm:text-2xl">{t.feedback.heading}</h2>
      )}
      <fieldset className="mt-5" aria-describedby={formState.errors.response ? ids.err : undefined}>
        <legend id={ids.q} className="text-base font-semibold text-ink">{t.feedback.question}</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
          {(['yes', 'no'] as const).map((v) => (
            <label
              key={v}
              className={cx(
                'flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 px-4 font-semibold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-glow',
                response === v ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-ink' : 'border-line text-muted hover:border-muted',
              )}
            >
              <input type="radio" value={v} {...register('response')} className="sr-only" />
              {v === 'yes' ? <ThumbsUp className="size-5" aria-hidden /> : <ThumbsDown className="size-5" aria-hidden />}
              {v === 'yes' ? t.feedback.yes : t.feedback.no}
            </label>
          ))}
        </div>
        {formState.errors.response && (
          <p id={ids.err} role="alert" className="mt-2 text-sm text-danger">{formState.errors.response.message}</p>
        )}
      </fieldset>

      <div className="mt-6">
        <label htmlFor={ids.s} className="block text-sm font-semibold">{t.feedback.suggestionLabel}</label>
        <textarea
          id={ids.s}
          rows={4}
          maxLength={FEEDBACK_SUGGESTION_MAX}
          aria-describedby={`${ids.s}-hint ${ids.s}-count`}
          aria-invalid={!!formState.errors.suggestion || undefined}
          placeholder={t.feedback.placeholder}
          {...register('suggestion')}
          className="mt-2 w-full resize-y rounded-2xl border border-line bg-surface p-4 text-base text-ink placeholder:text-muted/70 focus:border-[color:var(--accent)]"
        />
        <div className="mt-1 flex justify-between gap-4 text-xs text-muted">
          <span id={`${ids.s}-hint`}>{t.feedback.suggestionHint}</span>
          <span id={`${ids.s}-count`} aria-live="polite">{t.feedback.chars(suggestion.length, FEEDBACK_SUGGESTION_MAX)}</span>
        </div>
        {formState.errors.suggestion && <p role="alert" className="mt-1 text-sm text-danger">{formState.errors.suggestion.message}</p>}
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
        </label>
      </div>

      {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p>}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Button type="submit" loading={mutation.isPending} disabled={disabled}>
          {mutation.isPending ? t.feedback.submitting : t.feedback.submit}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (!inDialog) setSkipped(true);
            onSkip?.();
          }}
        >
          {inDialog ? t.feedback.later : t.feedback.skip}
        </Button>
      </div>
      <p id={ids.hint} className="mt-5 text-xs text-muted">{t.feedback.disclaimer}</p>
    </form>
  );
}
