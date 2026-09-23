import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  Globe2,
  LockKeyhole,
  Play,
  Send,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { MobileStickerBoard, StickerBoard } from '@/components/landing/sticker-board';
import { CtaBanner } from '@/components/landing/cta-banner';
import { Reveal } from '@/components/landing/reveal';
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

  const mobileTrust: Array<[LucideIcon, string, string]> = [
    [Clock3, t('Uptime', 'Доступность'), t('Round-the-clock monitoring', 'Круглосуточный мониторинг')],
    [Globe2, t('Domains', 'Домены'), t('We track renewal dates', 'Следим за сроками регистрации')],
    [LockKeyhole, 'SSL', t('We watch certificate expiry', 'Контролируем срок действия')],
  ];

  const steps: Array<[string, string, string]> = [
    ['1', t('Add your site', 'Добавьте сайт'), t('Enter the address and we start monitoring right away.', 'Укажите адрес сайта, и мы сразу начнём мониторинг.')],
    ['2', t('Connect Telegram', 'Подключите Telegram'), t('Link your Telegram in a couple of clicks. It is secure.', 'В пару кликов свяжите свой Telegram — это безопасно.')],
    ['3', t('Get notified', 'Получайте уведомления'), t('We message you in Telegram when something breaks — and again when everything is back to normal.', 'Мы напишем в Telegram, если что-то пойдет не так. И когда всё снова будет в порядке.')],
  ];

  return (
    <div className="overflow-x-clip">
      <SiteHeader signedIn={Boolean(session?.user)} />

      <main>
        {/* Hero ---------------------------------------------------------------- */}
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6 lg:pb-16 lg:pt-10">
          <div className="relative z-10 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-soft-lime px-4 py-2 text-xs font-bold text-accent">
              {t('Website monitoring', 'Мониторинг сайтов')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              Telegram
            </p>
            <h1 className="text-balance mt-6 text-[2.75rem] font-extrabold leading-[1] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">
              {t('Site down? PingoGo is already texting you.', 'Сайт упал? PingoGo уже пишет вам.')}
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-7 text-foreground/75">
              {t(
                'Watches your site uptime, SSL and domain expiry. Reports problems straight to Telegram.',
                'Следит за доступностью сайта, SSL и сроком домена. Сообщает о проблемах прямо в Telegram.',
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register" className="lp-btn lp-btn-primary">
                {t('Connect a site', 'Подключить сайт')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="#how" className="lp-btn lp-btn-outline">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-white" aria-hidden>
                  <Play className="ml-0.5 h-3 w-3 fill-current" />
                </span>
                {t('Watch the demo', 'Посмотреть демо')}
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted">{t('Nothing to install on your site', 'Без установки на сайт')}</p>
          </div>

          <div className="hidden lg:block">
            <StickerBoard t={t} />
          </div>
          <div className="lg:hidden">
            <MobileStickerBoard t={t} />
          </div>
        </section>

        {/* Trust strip ---------------------------------------------------------- */}
        <section className="mx-auto max-w-7xl px-5 sm:px-8" aria-label={t('What we monitor', 'Что мы контролируем')}>
          <div className="lp-card hidden grid-cols-4 divide-x divide-border !rounded-[20px] md:grid">
            {trustItems.map(([Icon, label]) => (
              <div key={label} className="flex items-center justify-center gap-3 px-4 py-5 text-[15px] font-semibold">
                <Icon className="h-5 w-5 text-accent" aria-hidden /> {label}
              </div>
            ))}
          </div>

          <div className="md:hidden">
            <h2 className="text-2xl font-extrabold tracking-tight">{t('Peace of mind for your site', 'Спокойствие за ваш сайт')}</h2>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {mobileTrust.map(([Icon, title, caption]) => (
                <div key={title} className="flex flex-col items-center">
                  <span className="lp-icon">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="mt-2.5 text-sm font-bold">{title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted">{caption}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features ------------------------------------------------------------- */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-20 sm:px-8 lg:pt-24">
          <Reveal>
            <h2 className="text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-[2.6rem]">
              {t('Three reasons to stop checking by hand.', 'Три причины больше не проверять вручную.')}
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Reveal delay={0}>
              <FeatureCard
                icon={Activity}
                title={t('Your site, watched', 'Сайт под наблюдением')}
                copy={t(
                  'We check availability from several regions. If the site goes down, you know in Telegram right away.',
                  'Проверяем доступность из разных регионов. Если сайт недоступен — вы сразу узнаете в Telegram.',
                )}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 font-bold">
                    <span className="h-2.5 w-2.5 rounded-full bg-ok" aria-hidden /> example.ru
                  </span>
                  <span className="font-bold tabular-nums">99.98%</span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="status-bars">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                  <span className="text-right text-[11px] leading-3.5 text-muted">
                    {t('Online', 'Сейчас')}
                    <br />
                    {t('now', 'в сети')}
                  </span>
                </div>
              </FeatureCard>
            </Reveal>

            <Reveal delay={80}>
              <FeatureCard
                icon={Globe2}
                title={t('Your domain stays yours', 'Домен не потеряется')}
                copy={t(
                  'We track the domain registration date and remind you in advance, so you never lose the site.',
                  'Следим за сроком регистрации домена. Напомним заранее, чтобы вы не потеряли сайт.',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft-lime text-accent" aria-hidden>
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">example.ru</p>
                    <p className="text-xs text-muted">{t('Domain active', 'Домен активен')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted">{t('Expires in', 'Истекает через')}</p>
                    <p className="text-xl font-extrabold leading-none tabular-nums">{t('32 days', '32 дня')}</p>
                  </div>
                </div>
              </FeatureCard>
            </Reveal>

            <Reveal delay={160}>
              <FeatureCard
                icon={LockKeyhole}
                title={t('SSL without surprises', 'SSL без сюрпризов')}
                copy={t(
                  'We watch the SSL certificate expiry and warn you when it is time to renew.',
                  'Контролируем срок действия SSL-сертификата. Предупредим, когда пора продлить.',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft-lime text-accent" aria-hidden>
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">shop.example</p>
                    <p className="text-xs text-muted">{t('SSL certificate', 'SSL-сертификат')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted">{t('Remaining', 'Осталось')}</p>
                    <p className="text-xl font-extrabold leading-none text-[#e08a00] tabular-nums">{t('12 days', '12 дней')}</p>
                  </div>
                </div>
              </FeatureCard>
            </Reveal>
          </div>
        </section>

        {/* How it works --------------------------------------------------------- */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-20 sm:px-8 lg:pt-24">
          <Reveal>
            <h2 className="text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-[2.6rem]">
              {t('From a link to peace of mind — three steps.', 'От ссылки до спокойствия — три шага.')}
            </h2>
          </Reveal>

          <ol className="mt-10 grid gap-8 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start md:gap-4">
            {steps.map(([number, title, copy], index) => (
              <StepItem key={number} number={number} title={title} copy={copy} last={index === steps.length - 1} delay={index * 80} />
            ))}
          </ol>
        </section>

        {/* CTA ------------------------------------------------------------------ */}
        <div className="pt-20 lg:pt-24">
          <Reveal>
            <CtaBanner t={t} />
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  copy,
  children,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <article className="lp-card flex h-full flex-col p-6 sm:p-7">
      <div className="flex items-center gap-3.5">
        <span className="lp-icon">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
      </div>
      <p className="mt-4 flex-1 text-[15px] leading-6 text-foreground/75">{copy}</p>
      <div className="lp-widget mt-6 p-4">{children}</div>
    </article>
  );
}

function StepItem({ number, title, copy, last, delay }: { number: string; title: string; copy: string; last: boolean; delay: number }) {
  return (
    <>
      <li>
        <Reveal delay={delay} className="flex gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soft-lime text-lg font-extrabold text-foreground">{number}</span>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
            <p className="mt-2 text-[15px] leading-6 text-foreground/75">{copy}</p>
          </div>
        </Reveal>
      </li>
      {!last ? (
        <li aria-hidden className="hidden pt-3 text-muted/70 md:block">
          <ArrowRight className="h-5 w-5" />
        </li>
      ) : null}
    </>
  );
}
