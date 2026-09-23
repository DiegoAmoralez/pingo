'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import { ApiError, linkAccount, type Bootstrap } from './api';
import { haptic, openExternal } from './telegram-sdk';
import type { TgStrings } from './strings';
import { Banner, PrimaryButton, Section } from './ui';

export function LoginScreen({
  t,
  locale,
  initData,
  onLinked,
  onLocale,
}: {
  t: TgStrings;
  locale: Locale;
  initData: string;
  onLinked: (bootstrap: Extract<Bootstrap, { status: 'linked' }>) => void;
  onLocale: (locale: Locale) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await linkAccount({ initData, email: email.trim(), password, locale });
      if (result.status !== 'linked') throw new Error(t.error);
      haptic('success');
      onLinked(result);
    } catch (e) {
      haptic('error');
      setError(e instanceof ApiError || e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'h-12 w-full bg-transparent px-4 text-[16px] outline-none placeholder:opacity-50 tg-row';

  return (
    <form onSubmit={handleSubmit} className="tg-screen pt-6">
      <div className="mb-6 flex flex-col items-center px-6 text-center">
        <Image src="/logo.png" alt="PingoGo" width={164} height={46} priority className="h-10 w-auto" />
        <h1 className="mt-5 text-[24px] font-extrabold tracking-tight">{t.loginTitle}</h1>
        <p className="tg-hint mt-2 text-[14px] leading-relaxed">{t.loginBody}</p>
      </div>

      {error ? <Banner tone="error">{error}</Banner> : null}

      <Section>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.email}
          aria-label={t.email}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.password}
          aria-label={t.password}
          className={inputClass}
        />
      </Section>

      <div className="px-4">
        <PrimaryButton type="submit" disabled={busy || !email || !password}>
          {busy ? t.signingIn : t.signIn}
        </PrimaryButton>
        <p className="tg-hint mt-4 text-center text-[13px]">
          {t.noAccount}{' '}
          <button type="button" className="tg-link font-semibold" onClick={() => openExternal(`${window.location.origin}/register`)}>
            {t.register}
          </button>
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {(['en', 'ru'] as Locale[]).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={locale === code}
              onClick={() => onLocale(code)}
              className={`h-8 rounded-full px-3 text-[12px] font-semibold transition-colors duration-150 ${
                locale === code ? 'tg-button' : 'tg-hint bg-[rgba(127,127,127,0.10)]'
              }`}
            >
              {code === 'en' ? 'EN' : 'RU'}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
