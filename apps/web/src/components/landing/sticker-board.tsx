import Image from 'next/image';
import { ChevronRight, Send, User } from 'lucide-react';

type T = (en: string, ru: string) => string;

/* Small pieces shared by the desktop and mobile boards --------------------- */

function StatusBars({ count = 7 }: { count?: number }) {
  return (
    <div className="status-bars" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

function MonitorRow({
  name,
  uptime,
  ago,
  warning,
}: {
  name: string;
  uptime: string;
  ago: string;
  warning?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[rgba(15,42,34,0.06)] bg-white px-4 py-3.5 shadow-[0_6px_18px_-12px_rgba(15,42,34,0.25)]">
      <span className="h-3 w-3 shrink-0 rounded-full bg-ok" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-tight">{name}</p>
        <p className="truncate text-xs text-muted">https://{name}</p>
      </div>
      <p className="w-16 text-right text-[15px] font-bold tabular-nums">{uptime}</p>
      <div className="hidden flex-col gap-1 sm:flex">
        <StatusBars />
        {warning ? <span className="text-[11px] text-muted">{ago}</span> : null}
      </div>
      {warning ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf1d6] px-2.5 py-1 text-xs font-bold text-[#c27a00]">
          <span className="h-2 w-2 rounded-full bg-warn" aria-hidden />
          {warning}
        </span>
      ) : (
        <span className="hidden text-xs text-muted sm:block">{ago}</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
    </div>
  );
}

export function TelegramCard({
  t,
  tone,
  title,
  detail,
  time,
  compact = false,
}: {
  t: T;
  tone: 'down' | 'up';
  title: string;
  detail: string;
  time: string;
  compact?: boolean;
}) {
  const dot = tone === 'down' ? 'bg-crit' : 'bg-ok';
  const color = tone === 'down' ? 'text-crit' : 'text-accent';
  return (
    <div className={`sticker-card flex items-start gap-3.5 ${compact ? 'p-3.5' : 'p-5'}`}>
      <span className={`grid shrink-0 place-items-center rounded-full bg-[#2aabee] text-white ${compact ? 'h-10 w-10' : 'h-14 w-14'}`} aria-hidden>
        <Send className={compact ? 'h-4.5 w-4.5 -ml-0.5 mt-0.5' : 'h-6 w-6 -ml-0.5 mt-0.5'} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`font-bold ${compact ? 'text-sm' : 'text-lg'}`}>PingoGo</p>
          {!compact ? (
            <span className="rounded-md bg-[#eef3f8] px-1.5 py-0.5 text-[11px] font-semibold text-[#5b7391]">{t('Bot', 'Бот')}</span>
          ) : null}
          <span className="ml-auto text-xs text-muted">{time}</span>
        </div>
        <p className={`mt-1.5 flex items-center gap-2 font-bold ${color} ${compact ? 'text-sm' : 'text-xl'}`}>
          <span className={`inline-block shrink-0 rounded-full ${dot} ${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}`} aria-hidden />
          {title}
        </p>
        <p className={`mt-1 text-foreground/80 ${compact ? 'text-xs' : 'text-base'}`}>{detail}</p>
        {!compact ? <p className="mt-0.5 text-sm text-muted">{t('Checked', 'Проверка')}: {time}</p> : null}
      </div>
    </div>
  );
}

/* Decorations ------------------------------------------------------------- */

function Dashes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 44" className={className} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" aria-hidden>
      <path d="M8 6l10 22" />
      <path d="M30 4l6 20" />
    </svg>
  );
}

function CurvedArrow({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 90 70"
      className={className}
      fill="none"
      stroke="var(--accent)"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden
    >
      <path d="M6 62 C 22 54, 44 44, 78 10" />
      <path d="M62 12 L 78 10 L 76 26" />
    </svg>
  );
}

/* Desktop board ------------------------------------------------------------ */

export function StickerBoard({ t }: { t: T }) {
  const rows = [
    { name: 'example.ru', uptime: '99.98%', ago: t('1 min ago', '1 мин. назад') },
    { name: 'shop.example', uptime: '99.95%', ago: t('2 min ago', '2 мин. назад'), warning: t('SSL: 12 days', 'SSL: 12 дней') },
    { name: 'studio.example', uptime: '100%', ago: t('1 min ago', '1 мин. назад') },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[640px] px-6 pb-32 pt-8" aria-label={t('PingoGo dashboard preview', 'Превью дашборда PingoGo')}>
      <Dashes className="absolute left-0 -top-1 h-11 w-12" />

      {/* Lime sticker blob */}
      <div className="sticker-blob absolute -inset-x-3 -bottom-4 top-0 -rotate-2" aria-hidden />

      {/* Dashboard card */}
      <div className="sticker-card relative z-10 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[rgba(15,42,34,0.06)] px-6 py-4">
          <Image src="/logo.png" alt="" width={120} height={34} className="h-7 w-auto" />
          <div className="hidden items-center gap-6 text-sm font-semibold text-foreground/70 sm:flex">
            <span>{t('Websites', 'Сайты')}</span>
            <span>{t('Notifications', 'Уведомления')}</span>
            <span>{t('Settings', 'Настройки')}</span>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-background text-foreground/70" aria-hidden>
            <User className="h-4 w-4" />
          </span>
        </div>
        <div className="px-6 pb-6 pt-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-2xl font-extrabold tracking-tight">{t('Your websites', 'Ваши сайты')}</p>
            <span className="inline-flex items-center gap-2 rounded-full bg-soft-lime px-3.5 py-2 text-sm font-bold text-accent">
              <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
              {t('All systems operational', 'Всё работает')}
            </span>
          </div>
          <div className="space-y-3">
            {rows.map((row) => (
              <MonitorRow key={row.name} {...row} />
            ))}
          </div>
        </div>
      </div>

      {/* Telegram alert overlapping the dashboard */}
      <div className="absolute bottom-6 left-[27%] right-[19%] z-20">
        <TelegramCard
          t={t}
          tone="down"
          title={t('Website is down', 'Сайт недоступен')}
          detail={`shop.example · ${t('Error 502', 'Ошибка 502')}`}
          time="14:32"
        />
      </div>

      {/* Handwritten notes */}
      <div className="hand absolute bottom-7 left-2 z-20 flex w-[24%] flex-col items-end -rotate-6 text-right text-[21px]">
        {t('Important updates, wherever you are', 'Важные события — всегда с вами')}
        <CurvedArrow className="mt-1 mr-1 h-11 w-14" />
      </div>
      <div className="hand absolute bottom-9 right-1 z-20 flex w-[17%] flex-col items-start rotate-6 text-[21px]">
        {t('Peace of mind in Telegram', 'Спокойствие в Telegram')}
        <CurvedArrow className="mt-1 h-11 w-14" flip />
      </div>
    </div>
  );
}

/* Mobile board (matches the "01 — Главная" mock) ---------------------------- */

export function MobileStickerBoard({ t }: { t: T }) {
  return (
    <div className="relative mx-auto mt-10 w-full max-w-sm px-3 pb-6 pt-8">
      <Dashes className="absolute left-1 top-0 h-9 w-10" />
      <div className="sticker-blob absolute -inset-x-3 inset-y-2 -rotate-1" aria-hidden />
      <div className="relative z-10 space-y-3">
        <TelegramCard t={t} compact tone="down" title={t('Website is down', 'Сайт недоступен')} detail={`shop.example · ${t('Error 502', 'Ошибка 502')}`} time="14:32" />
        <TelegramCard t={t} compact tone="up" title={t('Website is back online', 'Сайт снова доступен')} detail={`shop.example · ${t('HTTP 200', 'Ответ 200')}`} time="14:35" />
      </div>
      <div className="hand relative z-10 mt-3 flex items-end justify-end gap-1 pr-2 text-[19px] leading-[1]">
        <span className="max-w-[9rem] -rotate-3 text-right">{t('Important updates, always with you', 'Важные события всегда с вами')}</span>
        <CurvedArrow className="h-9 w-12" />
      </div>
    </div>
  );
}
