import Link from 'next/link';
import {
  BellRing,
  CalendarDays,
  Check,
  Clock3,
  Globe2,
  LockKeyhole,
  Play,
  Send,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { PricingCard } from '@/components/pricing-card';
import { getSession } from '@/lib/session';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function LandingPage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  const t = (en: string, ru: string) => pick(locale, en, ru);
  const trustItems: Array<[LucideIcon, string]> = [
    [Clock3, t('24/7 uptime', 'Доступность 24/7')],
    [Globe2, t('Domain expiry', 'Срок домена')],
    [LockKeyhole, t('SSL certificates', 'SSL-сертификаты')],
    [Send, t('Telegram alerts', 'Уведомления в Telegram')],
  ];
  const featureItems: Array<[LucideIcon, string, string]> = [
    [BellRing, t('Your site stays watched', 'Сайт всегда под наблюдением'), t('Checks run automatically. If a site becomes unavailable, Telegram knows first.', 'Проверки идут автоматически. Если сайт станет недоступен, вы сразу узнаете об этом в Telegram.')],
    [CalendarDays, t('Your domain never slips', 'Домен не потеряется'), t('We watch registration dates and remind you before the domain expires.', 'Следим за датой регистрации и заранее напоминаем о продлении домена.')],
    [ShieldCheck, t('SSL without surprises', 'SSL без сюрпризов'), t('Certificate health and expiration are tracked long before browsers show warnings.', 'Контролируем сертификат и предупреждаем задолго до ошибок в браузере.')],
  ];
  return (
    <div className="overflow-hidden">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:pt-14">
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-soft-lime px-4 py-2 text-xs font-semibold text-accent">
              {t('Website monitoring · Telegram', 'Мониторинг сайтов · Telegram')}
            </p>
            <h1 className="text-balance mt-6 max-w-2xl text-5xl font-extrabold leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-[4.7rem]">
              {t('Site went down? PingoGo already told you.', 'Сайт упал? PingoGo уже пишет вам.')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              {t(
                'Uptime, SSL, DNS and domain expiry—watched around the clock. Useful alerts arrive in Telegram before customers start writing.',
                'Доступность, SSL, DNS и срок домена — под круглосуточным контролем. Полезные уведомления приходят в Telegram раньше, чем напишут клиенты.',
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-base font-semibold text-white shadow-lg shadow-emerald-900/10 hover:-translate-y-0.5 hover:bg-[#00765f]"
              >
                {t('Connect your site', 'Подключить сайт')}
              </Link>
              <Link
                href="#how"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-accent bg-white px-6 text-base font-semibold text-accent"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white">
                  <Play className="h-3 w-3 fill-current" />
                </span>
                {t('See how it works', 'Как это работает')}
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted">{t('No credit card · No installation · Setup in 60 seconds', 'Без карты · Без установки · Настройка за 60 секунд')}</p>
          </div>

          <div className="relative min-h-[520px]">
            <div className="absolute -inset-8 rounded-[4rem] bg-lime/35 blur-3xl" />
            <div className="brand-grid brand-card relative rounded-[2.4rem] bg-[#efffd8] p-4 sm:p-8">
              <div className="brand-card rounded-[1.8rem] bg-white p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-lg font-bold">{t('Your websites', 'Ваши сайты')}</p>
                  <span className="inline-flex items-center gap-2 rounded-full bg-soft-lime px-3 py-1.5 text-xs font-semibold text-accent">
                    <span className="h-2 w-2 rounded-full bg-ok" /> {t('All operational', 'Всё работает')}
                  </span>
                </div>
                <div className="space-y-3">
                  <MonitorPreview name="example.com" uptime="99.98%" />
                  <MonitorPreview name="shop.example" uptime="99.95%" warning={t('SSL · 12 days', 'SSL · 12 дней')} />
                  <MonitorPreview name="studio.example" uptime="100%" />
                </div>
              </div>
              <div className="brand-card relative -mt-2 ml-auto mr-3 max-w-sm translate-y-8 rounded-3xl bg-white p-5 sm:mr-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#2aabee] text-white">
                    <Send className="h-6 w-6 fill-current" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-6">
                      <p className="font-bold">PingoGo</p>
                      <span className="text-xs text-muted">14:32</span>
                    </div>
                    <p className="mt-2 font-semibold text-crit">● {t('Website unavailable', 'Сайт недоступен')}</p>
                    <p className="mt-1 text-sm text-muted">shop.example · {t('HTTP 502', 'Ошибка 502')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-white/60">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-0 px-5 sm:px-8 md:grid-cols-4">
            {trustItems.map(([Icon, label]) => (
              <div key={label} className="flex items-center justify-center gap-3 border-border px-3 py-6 text-sm font-semibold md:border-r md:last:border-0">
                <Icon className="h-5 w-5 text-accent" /> {label}
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{t('Everything that matters', 'Всё самое важное')}</p>
            <h2 className="text-balance mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              {t('Three reasons to stop checking manually.', 'Три причины больше не проверять вручную.')}
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {featureItems.map(([Icon, title, copy]) => (
              <div key={title} className="brand-card group rounded-[1.75rem] p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-soft-lime text-accent">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-6 text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
                <div className="mt-8 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">example.com</span>
                    <span className="text-xs font-bold text-ok">99.98%</span>
                  </div>
                  <div className="status-bars mt-4">{Array.from({ length: 10 }).map((_, i) => <span key={i} />)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{t('How it works', 'Как это работает')}</p>
            <h2 className="text-balance mt-3 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">
              {t('From a URL to peace of mind in three clear steps.', 'От ссылки до спокойствия — три понятных шага.')}
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted">
              {t(
                'No code, agents or complicated dashboards. PingoGo starts collecting the signals that matter as soon as you add a website.',
                'Никакого кода, агентов и сложной настройки. PingoGo начинает собирать важные сигналы сразу после добавления сайта.',
              )}
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ['1', t('Add your website', 'Добавьте сайт'), t('Paste an HTTPS address. We validate it and launch uptime, SSL, DNS and domain checks immediately.', 'Укажите HTTPS-адрес. Мы проверим его и сразу запустим проверку доступности, SSL, DNS и домена.'), t('First result usually appears in under a minute.', 'Первый результат обычно появляется меньше чем за минуту.')],
              ['2', t('Connect Telegram', 'Подключите Telegram'), t('Open a secure one-time link and press Start in the bot. Your account and chat connect automatically.', 'Откройте защищённую одноразовую ссылку и нажмите Start в боте. Аккаунт и чат свяжутся автоматически.'), t('Send a test notification at any time.', 'Тестовое уведомление можно отправить в любой момент.')],
              ['3', t('Let PingoGo watch', 'Доверьте контроль PingoGo'), t('We confirm failures, open an incident and notify you. After recovery, you get the response code and downtime duration.', 'Мы подтверждаем сбой, создаём инцидент и уведомляем вас. После восстановления присылаем код ответа и длительность простоя.'), t('No duplicate noise—only important events.', 'Без повторяющегося шума — только важные события.')],
            ].map(([number, title, copy, note]) => (
              <div key={number} className="brand-card relative rounded-3xl p-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-lime text-lg font-extrabold">{number}</span>
                <div>
                  <h3 className="mt-5 text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
                  <p className="mt-5 border-t border-border pt-4 text-xs font-semibold leading-5 text-accent">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{t('Clear pricing', 'Понятные тарифы')}</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">{t('Start free. Scale when you need.', 'Начните бесплатно. Растите по мере необходимости.')}</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <PricingCard code="FREE" ctaHref="/register" ctaLabel={t('Start free', 'Начать бесплатно')} />
            <PricingCard code="PERSONAL" ctaHref="/register" ctaLabel={t('Upgrade', 'Выбрать')} />
            <PricingCard code="PRO" ctaHref="/register" ctaLabel={t('Upgrade', 'Выбрать')} />
            <PricingCard code="AGENCY" ctaHref="/register" ctaLabel={t('Upgrade', 'Выбрать')} />
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-20 sm:px-8">
          <h2 className="text-center text-4xl font-extrabold tracking-[-0.04em]">{t('Questions, answered.', 'Ответы на вопросы.')}</h2>
          <div className="mt-10 divide-y divide-border rounded-3xl border border-border bg-white px-6">
            {[
              [t('Can I start without a credit card?', 'Можно начать без банковской карты?'), t('Yes. The Free plan watches two websites and includes Telegram alerts.', 'Да. Бесплатный тариф отслеживает два сайта и включает уведомления в Telegram.')],
              [t('How fast are checks?', 'Как часто выполняются проверки?'), t('Every 5 minutes on Free, every minute on paid plans.', 'Каждые 5 минут на бесплатном тарифе и каждую минуту на платных.')],
              [t('Will I get duplicate notifications?', 'Будут ли повторяющиеся уведомления?'), t('No. We confirm failures before opening an incident and suppress duplicate alerts.', 'Нет. Мы подтверждаем сбой перед созданием инцидента и подавляем дубликаты.')],
              [t('Is PingoGo difficult to install?', 'Нужно ли устанавливать PingoGo?'), t('There is nothing to install on your website. Add a URL and monitoring starts.', 'На сайт ничего устанавливать не нужно. Добавьте URL — мониторинг начнётся автоматически.')],
            ].map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold">
                  {q}<span className="text-xl text-accent group-open:rotate-45">+</span>
                </summary>
                <p className="max-w-2xl pt-3 text-sm leading-6 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <div className="relative overflow-hidden rounded-[2rem] bg-navy px-7 py-12 text-white sm:px-12">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{t('You run the business. PingoGo watches the website.', 'Вы занимаетесь бизнесом. PingoGo следит за сайтом.')}</h2>
              <p className="mt-3 text-sm text-white/65">{t('Less worrying. More time for work that moves you forward.', 'Меньше переживаний. Больше времени на действительно важные задачи.')}</p>
              <Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-lime px-5 py-3 font-bold text-navy hover:-translate-y-0.5">
                {t('Start monitoring free', 'Начать бесплатно')}
              </Link>
            </div>
            <div className="absolute -bottom-20 right-10 h-52 w-52 rounded-full bg-accent/50 blur-2xl" />
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function MonitorPreview({ name, uptime, warning }: { name: string; uptime: string; warning?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-4 shadow-sm">
      <span className="h-3 w-3 shrink-0 rounded-full bg-ok ring-4 ring-emerald-50" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="truncate text-xs text-muted">https://{name}</p>
      </div>
      <p className="hidden text-xs font-bold sm:block">{uptime}</p>
      <div className="status-bars hidden sm:flex">{Array.from({ length: 7 }).map((_, i) => <span key={i} />)}</div>
      {warning ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-warn">{warning}</span> : <Check className="h-4 w-4 text-ok" />}
    </div>
  );
}
