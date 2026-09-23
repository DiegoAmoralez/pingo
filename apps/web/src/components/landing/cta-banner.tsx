import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type T = (en: string, ru: string) => string;

/** Night hills with a river — pure SVG so it scales and stays crisp. */
function HillsScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 260"
      className={className}
      fill="none"
      aria-hidden
      preserveAspectRatio="xMaxYMax slice"
      style={{ maskImage: 'linear-gradient(to right, transparent, #000 35%)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 35%)' }}
    >
      <defs>
        <linearGradient id="lp-moon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3f8c9" />
          <stop offset="1" stopColor="#d7f56b" />
        </linearGradient>
      </defs>
      {/* glow + moon */}
      <circle cx="352" cy="136" r="56" fill="#d7f56b" opacity="0.12" />
      <circle cx="352" cy="136" r="32" fill="url(#lp-moon)" />
      {/* far hills */}
      <path d="M0 190 C 70 150, 120 140, 190 165 C 250 185, 290 120, 360 150 C 420 175, 470 160, 520 130 V 260 H 0 Z" fill="#276b47" />
      {/* near hills */}
      <path d="M0 215 C 60 190, 110 180, 170 205 C 230 230, 300 170, 380 200 C 440 222, 480 210, 520 190 V 260 H 0 Z" fill="#1e5a3b" />
      {/* river */}
      <path
        d="M 250 260 C 260 235, 300 232, 305 215 C 310 198, 280 190, 296 176 C 310 164, 345 165, 350 152"
        stroke="#d7f56b"
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M 250 260 C 260 235, 300 232, 305 215 C 310 198, 280 190, 296 176 C 310 164, 345 165, 350 152"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* tiny trees */}
      <g fill="#d7f56b" opacity="0.7">
        <path d="M120 198 l6 -14 l6 14 z" />
        <path d="M133 203 l5 -11 l5 11 z" />
        <path d="M430 178 l6 -14 l6 14 z" />
      </g>
    </svg>
  );
}

function ScribbleUnderline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 14" className={className} fill="none" stroke="#d7f56b" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M3 9 C 40 3, 80 12, 157 5" />
    </svg>
  );
}

export function CtaBanner({ t }: { t: T }) {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8" aria-labelledby="cta-title">
      <div className="relative overflow-hidden rounded-[32px] bg-navy px-7 py-12 text-white sm:px-12 sm:py-14 lg:px-16">
        <HillsScene className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[44%] lg:block" />

        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h2 id="cta-title" className="text-balance text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[2.6rem]">
              {t('You run the business.', 'Вы занимаетесь бизнесом.')}
              <br />
              {t('PingoGo watches the website.', 'PingoGo следит за сайтом.')}
            </h2>
            <p className="mt-4 text-base text-white/75 sm:text-lg">
              {t('Less worry. More time for what matters.', 'Меньше переживаний. Больше времени на важное.')}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-start lg:pl-4">
            <Link href="/register" className="lp-btn lp-btn-lime">
              {t('Start free', 'Начать бесплатно')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <span className="pl-1 text-xs text-white/70">{t('Nothing to install on your site', 'Без установки на сайт')}</span>
          </div>
        </div>

        <div className="hand absolute right-6 top-7 z-10 hidden w-40 -rotate-6 text-[21px] leading-[1] !text-lime lg:block xl:right-10">
          {t('Stable sites — a stronger business', 'Стабильные сайты — более успешный бизнес')}
          <ScribbleUnderline className="mt-1 h-3 w-32" />
        </div>
      </div>
    </section>
  );
}
