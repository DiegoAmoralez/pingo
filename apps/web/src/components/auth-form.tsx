'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { authClient, resendVerificationEmail } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useLocale } from '@/components/locale-provider';
import { VerifyEmailDialog } from '@/components/verify-email-dialog';

export type SsoAvailability = {
  google: boolean;
  facebook: boolean;
};

const MIN_PASSWORD_LENGTH = 8;

type RegisterStep = 'identity' | 'password';

function isUnverifiedEmailError(error: { code?: string; status?: number; message?: string }): boolean {
  return error.code === 'EMAIL_NOT_VERIFIED' || error.status === 403 || /not verified/i.test(error.message ?? '');
}

export function AuthForm({
  mode,
  sso,
}: {
  mode: 'login' | 'register' | 'forgot';
  sso?: SsoAvailability;
}) {
  const { tr } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<RegisterStep>('identity');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState<'google' | 'facebook' | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const showSso = mode !== 'forgot' && Boolean(sso?.google || sso?.facebook);
  const callbackURL = mode === 'register' ? '/onboarding' : '/dashboard';
  const isRegister = mode === 'register';
  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  useEffect(() => {
    if (isRegister && step === 'password') passwordRef.current?.focus();
  }, [isRegister, step]);

  const goToPasswordStep = () => {
    setError(null);
    if (!name.trim()) {
      setError(tr('Tell us your name.', 'Укажите имя.'));
      return;
    }
    setStep('password');
  };

  const goToIdentityStep = () => {
    setError(null);
    setStep('identity');
  };

  const resendVerification = async (target: string) => {
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      await resendVerificationEmail(target, '/onboarding');
      setMessage(tr('Verification email sent. Check your inbox.', 'Письмо отправлено. Проверьте почту.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Could not send the email.', 'Не удалось отправить письмо.'));
    } finally {
      setResending(false);
    }
  };

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isRegister && step === 'identity') {
      goToPasswordStep();
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setUnverifiedEmail(null);
    try {
      if (isRegister) {
        if (password.length < MIN_PASSWORD_LENGTH) {
          throw new Error(tr(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, `Пароль — минимум ${MIN_PASSWORD_LENGTH} символов.`));
        }
        if (password !== passwordConfirm) {
          throw new Error(tr('Passwords do not match.', 'Пароли не совпадают.'));
        }
        const result = await authClient.signUp.email({
          email,
          password,
          name: name.trim(),
          callbackURL,
        });
        if (result.error) throw new Error(result.error.message);
        // With email verification on, there is no session yet: show the "check your inbox" dialog.
        if (!result.data?.token) {
          setVerifyDialogOpen(true);
          return;
        }
        window.location.href = callbackURL;
        return;
      }
      if (mode === 'login') {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL,
        });
        if (result.error) {
          if (isUnverifiedEmailError(result.error)) {
            setUnverifiedEmail(email);
            throw new Error(tr('Your email is not verified yet.', 'Email ещё не подтверждён.'));
          }
          throw new Error(result.error.message);
        }
        window.location.href = callbackURL;
        return;
      }
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });
      if (result.error) throw new Error(result.error.message);
      setMessage(tr('If an account exists, we sent a reset link.', 'Если аккаунт существует, мы отправили ссылку для сброса.'));
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Something went wrong', 'Что-то пошло не так'));
    } finally {
      setLoading(false);
    }
  }

  async function signInSocial(provider: 'google' | 'facebook') {
    setSsoLoading(provider);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL,
      });
      if (result.error) throw new Error(result.error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('Social sign-in failed', 'Не удалось войти через соцсеть'));
      setSsoLoading(null);
    }
  }

  const submitLabel = loading
    ? tr('Please wait…', 'Подождите…')
    : mode === 'login'
      ? tr('Sign in', 'Войти')
      : isRegister
        ? step === 'identity'
          ? tr('Continue', 'Продолжить')
          : tr('Create account', 'Создать аккаунт')
        : tr('Send reset link', 'Отправить ссылку');

  return (
    <div className="space-y-4">
      {isRegister ? (
        <div className="flex items-center gap-3" aria-label={tr('Registration progress', 'Прогресс регистрации')}>
          {(['identity', 'password'] as RegisterStep[]).map((item, index) => {
            const reached = item === step || (item === 'identity' && step === 'password');
            return (
              <span key={item} className="flex flex-1 items-center gap-2">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold transition-colors duration-200 ease-out ${
                    reached ? 'bg-accent text-white' : 'bg-soft-lime text-accent'
                  }`}
                  aria-current={item === step ? 'step' : undefined}
                >
                  {index + 1}
                </span>
                <span className={`text-xs font-bold uppercase tracking-[0.12em] ${item === step ? 'text-foreground' : 'text-muted'}`}>
                  {item === 'identity' ? tr('About you', 'О вас') : tr('Password', 'Пароль')}
                </span>
                {index === 0 ? <span className={`ml-1 h-px flex-1 transition-colors duration-200 ${step === 'password' ? 'bg-accent' : 'bg-border'}`} aria-hidden /> : null}
              </span>
            );
          })}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {isRegister && step === 'identity' ? (
          <div key="identity" className="step-in space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">{tr('Name', 'Имя')}</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
        ) : null}

        {isRegister && step === 'password' ? (
          <div key="password" className="step-in space-y-4">
            <button
              type="button"
              onClick={goToIdentityStep}
              tabIndex={0}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors duration-200 ease-out hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {tr('Back', 'Назад')} · <span className="font-mono text-xs">{email}</span>
            </button>
            <div className="space-y-1">
              <Label htmlFor="password">{tr('Password', 'Пароль')}</Label>
              <Input
                id="password"
                ref={passwordRef}
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                aria-describedby="password-hint"
              />
              <p id="password-hint" className="text-xs text-muted">
                {tr(`At least ${MIN_PASSWORD_LENGTH} characters.`, `Минимум ${MIN_PASSWORD_LENGTH} символов.`)}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="password-confirm">{tr('Repeat password', 'Повторите пароль')}</Label>
              <Input
                id="password-confirm"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                aria-invalid={passwordsMismatch || undefined}
                className={passwordsMismatch ? 'border-crit focus:border-crit focus-visible:ring-crit/20' : ''}
              />
              {passwordsMismatch ? <p className="text-xs font-semibold text-crit">{tr('Passwords do not match.', 'Пароли не совпадают.')}</p> : null}
            </div>
          </div>
        ) : null}

        {!isRegister ? (
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
        ) : null}
        {mode === 'login' ? (
          <div className="space-y-1">
            <Label htmlFor="password">{tr('Password', 'Пароль')}</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-crit" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-ok" role="status">{message}</p> : null}
        {unverifiedEmail ? (
          <div className="rounded-2xl bg-soft-lime/60 p-4">
            <p className="text-sm text-foreground/80">
              {tr('Open the verification email we sent to', 'Откройте письмо, которое мы отправили на')}{' '}
              <span className="font-semibold">{unverifiedEmail}</span>. {tr("Can't find it?", 'Не нашли?')}
            </p>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => resendVerification(unverifiedEmail)} disabled={resending}>
              <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} aria-hidden />
              {resending ? tr('Sending…', 'Отправляем…') : tr('Send the email again', 'Отправить письмо ещё раз')}
            </Button>
          </div>
        ) : null}

        <Button className="w-full" disabled={loading || Boolean(ssoLoading) || (isRegister && step === 'password' && passwordsMismatch)} type="submit">
          {submitLabel}
        </Button>
        {mode === 'login' ? (
          <p className="text-center text-sm text-muted">
            <Link href="/forgot-password">{tr('Forgot password?', 'Забыли пароль?')}</Link>
          </p>
        ) : null}
      </form>

      {verifyDialogOpen ? (
        <VerifyEmailDialog
          email={email}
          callbackURL={callbackURL}
          onClose={() => {
            setVerifyDialogOpen(false);
            setMessage(tr('We sent a verification email. Open it to finish signing up.', 'Мы отправили письмо для подтверждения. Откройте его, чтобы завершить регистрацию.'));
          }}
        />
      ) : null}

      {showSso ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-border" />
            {tr('or continue with', 'или продолжить через')}
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-2">
            {sso?.google ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={loading || Boolean(ssoLoading)}
                onClick={() => signInSocial('google')}
              >
                <GoogleIcon />
                {ssoLoading === 'google' ? tr('Redirecting…', 'Переходим…') : 'Google'}
              </Button>
            ) : null}
            {sso?.facebook ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={loading || Boolean(ssoLoading)}
                onClick={() => signInSocial('facebook')}
              >
                <FacebookIcon />
                {ssoLoading === 'facebook' ? tr('Redirecting…', 'Переходим…') : 'Facebook'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.3 0 8.8-3.7 8.8-8.9 0-.6 0-1.1-.1-1.5H12z"
      />
      <path fill="#4285F4" d="M23.5 12.3c0-.7-.1-1.2-.2-1.7H12v3.6h6.5c-.3 1.5-1.2 2.7-2.5 3.5l3.8 3c2.2-2 3.7-5 3.7-8.4z" />
      <path fill="#FBBC05" d="M6.4 14.4A5.6 5.6 0 0 1 6.1 12c0-.8.1-1.6.3-2.4L2.5 6.5A9.2 9.2 0 0 0 1.2 12c0 1.5.4 2.9 1.1 4.2z" />
      <path fill="#34A853" d="M12 21.2c2.6 0 4.7-.8 6.3-2.3l-3.8-3c-1 .7-2.3 1.2-3.8 1.2-2.9 0-5.3-1.9-6.2-4.5l-3.8 2.9C2.7 18.7 7 21.2 12 21.2z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#1877F2"
        d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23.1 10.1 24v-8.4H7.1v-3.5h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1z"
      />
    </svg>
  );
}
