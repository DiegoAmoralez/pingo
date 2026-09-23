import Image from 'next/image';
import { Send, Wrench } from 'lucide-react';
import { pick, type Locale } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';

/**
 * Full-page "under maintenance" screen rendered by the root layout while the
 * admin maintenance flag is on. Server component: no data fetching, no links
 * into the product, so nothing behind it is reachable.
 */
export function MaintenanceScreen({ locale }: { locale: Locale }) {
  const t = (en: string, ru: string) => pick(locale, en, ru);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'pingopingo_bot';

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Image src="/logo.png" alt="PingoGo" width={168} height={48} priority className="h-10 w-auto" />
        <LanguageSwitcher />
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-soft-lime px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-accent">
            <Wrench className="h-3.5 w-3.5" aria-hidden />
            {t('Maintenance', 'Технические работы')}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            {t('We are under maintenance.', 'Сайт на техническом обслуживании.')}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-7 text-foreground/75">
            {t(
              'PingoGo is being updated right now. Your monitors keep running and alerts keep arriving in Telegram — only the website is paused for a bit.',
              'Мы обновляем PingoGo. Ваши мониторы продолжают работать, а уведомления приходят в Telegram — на паузе только сайт.',
            )}
          </p>
          <p className="hand mt-8 text-3xl -rotate-2 sm:text-4xl">
            {t('Back shortly. Promise.', 'Скоро вернёмся. Обещаем.')}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] px-4 pb-10 pt-6">
          <div className="sticker-blob absolute -inset-x-2 -bottom-2 top-0 -rotate-3" aria-hidden />
          <div className="sticker-card relative p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <Image src="/icon.svg" alt="" width={36} height={36} className="h-9 w-9" aria-hidden />
              <p className="text-lg font-extrabold tracking-[-0.02em]">PingoGo</p>
              <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#fff4df] px-3 py-1 text-xs font-bold text-[#b56a00]">
                <span className="h-2 w-2 rounded-full bg-warn" aria-hidden />
                {t('Updating', 'Обновление')}
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                t('Uptime checks', 'Проверки доступности'),
                t('SSL & domain expiry', 'Срок SSL и домена'),
                t('Telegram alerts', 'Уведомления в Telegram'),
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-background px-4 py-3.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ok" aria-hidden />
                  <span className="font-semibold">{item}</span>
                  <span className="ml-auto text-xs font-bold uppercase tracking-wide text-accent">{t('Running', 'Работает')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sticker-card relative -mt-4 ml-auto mr-2 flex w-[86%] items-start gap-3.5 p-4 sm:mr-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2aabee] text-white" aria-hidden>
              <Send className="-ml-0.5 mt-0.5 h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">PingoGo</p>
              <p className="mt-0.5 text-sm text-foreground/80">
                {t('Alerts are still on. Talk to us:', 'Уведомления работают. Написать нам:')}{' '}
                <span className="font-semibold text-accent">@{botUsername}</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
