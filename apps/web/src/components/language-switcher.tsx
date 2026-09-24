'use client';

import type { Locale } from '@/lib/i18n';
import { useLocale } from '@/components/locale-provider';

const OPTIONS: readonly Locale[] = ['en', 'ru'];

export function LanguageSwitcher() {
  const { locale, pending, setLocale, tr } = useLocale();
  const activeIndex = Math.max(0, OPTIONS.indexOf(locale));

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = OPTIONS[(activeIndex + step + OPTIONS.length) % OPTIONS.length];
    if (next) setLocale(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label={tr('Language', 'Язык')}
      aria-busy={pending}
      onKeyDown={handleKeyDown}
      className="relative inline-grid grid-cols-2 rounded-xl border border-border bg-white p-1 text-xs font-bold"
    >
      {/* Sliding pill behind the active option. */}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-lg bg-navy shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={item === 'ru' ? 'Русский' : 'English'}
            tabIndex={active ? 0 : -1}
            onClick={() => setLocale(item)}
            className={`relative z-10 w-10 rounded-lg py-1.5 text-center uppercase transition-colors duration-200 ease-out ${
              active ? 'text-white' : 'text-muted hover:text-accent'
            }`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
