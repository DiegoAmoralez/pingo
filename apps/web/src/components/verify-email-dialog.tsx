'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MailCheck, RefreshCw, X } from 'lucide-react';
import { resendVerificationEmail } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/components/locale-provider';

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Shown right after sign-up when the account still needs email verification.
 * Lets the user re-send the letter (with a cooldown) or jump to sign-in.
 */
export function VerifyEmailDialog({
  email,
  callbackURL,
  onClose,
}: {
  email: string;
  callbackURL: string;
  onClose: () => void;
}) {
  const { tr } = useLocale();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    setSending(true);
    setNotice(null);
    try {
      await resendVerificationEmail(email, callbackURL);
      setNotice({ tone: 'ok', text: tr('Sent again. Give it a minute.', 'Отправили ещё раз. Подождите минуту.') });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : tr('Could not send the email.', 'Не удалось отправить письмо.'),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-email-title"
        aria-describedby="verify-email-body"
        tabIndex={-1}
        className="dialog-card brand-card relative w-full max-w-md rounded-3xl bg-white p-7 outline-none sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={tr('Close', 'Закрыть')}
          tabIndex={0}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors duration-200 ease-out hover:bg-soft-lime hover:text-accent"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <span className="grid h-14 w-14 place-items-center rounded-full bg-lime text-navy" aria-hidden>
          <MailCheck className="h-7 w-7" />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-accent">{tr('One last step', 'Последний шаг')}</p>
        <h2 id="verify-email-title" className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
          {tr('Check your inbox.', 'Проверьте почту.')}
        </h2>
        <p id="verify-email-body" className="mt-3 text-sm leading-6 text-muted">
          {tr('We sent a verification email to', 'Мы отправили письмо для подтверждения на')}{' '}
          <span className="font-semibold text-foreground">{email}</span>.{' '}
          {tr('Press the button in it and your account is ready.', 'Нажмите кнопку в письме — и аккаунт готов.')}
        </p>
        <p className="hand mt-4 text-2xl -rotate-1">{tr("Can't find it? Peek into Spam.", 'Не видно? Загляните в «Спам».')}</p>

        {notice ? (
          <p
            role="status"
            className={`mt-4 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${
              notice.tone === 'ok' ? 'bg-soft-lime text-accent' : 'bg-crit/10 text-crit'
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/login">{tr('Go to sign in', 'Перейти ко входу')}</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full whitespace-nowrap"
            onClick={handleResend}
            disabled={sending || cooldown > 0}
          >
            <RefreshCw className={`h-4 w-4 ${sending ? 'animate-spin' : ''}`} aria-hidden />
            {sending ? tr('Sending…', 'Отправляем…') : tr('Send again', 'Отправить ещё раз')}
            {cooldown > 0 ? (
              <span className="tabular-nums text-muted">· {cooldown}</span>
            ) : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
