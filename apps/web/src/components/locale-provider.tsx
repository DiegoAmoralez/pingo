'use client';

import { createContext, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { pick } from '@/lib/i18n';

type LocaleContextValue = {
  locale: Locale;
  tr: (en: string, ru: string) => string;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  tr: (en) => en,
  setLocale: () => undefined,
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      tr: (en, ru) => pick(locale, en, ru),
      setLocale(next) {
        document.cookie = `pingogo_locale=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
        router.refresh();
      },
    }),
    [locale, router],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
