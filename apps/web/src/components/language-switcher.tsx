'use client';

import { useLocale } from '@/components/locale-provider';

export function LanguageSwitcher() {
  const { locale, setLocale, tr } = useLocale();

  return (
    <div className="inline-flex rounded-xl border border-border bg-white p-1 text-xs font-bold" role="group" aria-label={tr('Language', 'Язык')}>
      {(['en', 'ru'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          aria-pressed={locale === item}
          className={`rounded-lg px-2.5 py-1.5 uppercase ${
            locale === item ? 'bg-navy text-white' : 'text-muted hover:text-accent'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
