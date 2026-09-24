'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { LOCALE_COOKIE, pick } from '@/lib/i18n';

type LocaleContextValue = {
  locale: Locale;
  /** True while server-rendered strings are being refreshed after a switch. */
  pending: boolean;
  tr: (en: string, ru: string) => string;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  pending: false,
  tr: (en) => en,
  setLocale: () => undefined,
});

export function LocaleProvider({ locale: serverLocale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Optimistic: client strings switch instantly; server components catch up on refresh.
  const [locale, setLocaleState] = useState<Locale>(serverLocale);

  useEffect(() => {
    setLocaleState(serverLocale);
  }, [serverLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      setLocaleState(next);
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      startTransition(() => router.refresh());
    },
    [locale, router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      pending,
      tr: (en, ru) => pick(locale, en, ru),
      setLocale,
    }),
    [locale, pending, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
