'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wrench } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import { tgStrings } from './strings';
import { getWebApp, haptic } from './telegram-sdk';
import { PrimaryButton, Row, Section, StatusDot } from './ui';

function detectLocale(): Locale {
  const fromTelegram = getWebApp()?.initDataUnsafe.user?.language_code;
  const raw = fromTelegram ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');
  return raw.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

/**
 * Compact "under maintenance" screen for the Telegram Mini App. Follows the
 * client's theme via `.tg-app`, offers nothing but a re-check button, so the
 * product stays unreachable while the admin flag is on.
 */
export function TelegramMaintenanceScreen() {
  const [locale, setLocale] = useState<Locale>('en');
  const [checking, setChecking] = useState(false);
  const t = useMemo(() => tgStrings(locale), [locale]);

  useEffect(() => {
    const next = detectLocale();
    setLocale(next);
    document.documentElement.lang = next;
    const app = getWebApp();
    if (!app) return;
    app.ready();
    app.expand();
    app.BackButton.hide();
  }, []);

  const handleCheckAgain = () => {
    haptic('tap');
    setChecking(true);
    window.location.reload();
  };

  return (
    <div className="tg-app flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <span
        className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ background: 'rgba(233, 161, 26, 0.14)', color: '#b56a00' }}
      >
        <Wrench className="h-3.5 w-3.5" aria-hidden />
        {t.maintenanceBadge}
      </span>
      <h1 className="mt-4 text-center text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{t.maintenanceTitle}</h1>
      <p className="tg-hint mt-2 max-w-xs text-center text-[15px] leading-relaxed">{t.maintenanceBody}</p>

      <Section className="mt-8 w-full max-w-sm self-center">
        {t.maintenanceItems.map((item) => (
          <Row
            key={item}
            label={item}
            leading={<StatusDot status="UP" size={9} />}
            value={<span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: '#18ad62' }}>{t.maintenanceRunning}</span>}
          />
        ))}
      </Section>

      <div className="mt-6 w-full max-w-sm">
        <PrimaryButton onClick={handleCheckAgain} disabled={checking}>
          {checking ? t.loading : t.maintenanceCheck}
        </PrimaryButton>
      </div>
    </div>
  );
}
