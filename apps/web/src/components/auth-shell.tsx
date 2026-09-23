'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Send } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLocale } from '@/components/locale-provider';

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { tr } = useLocale();
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_0.9fr]">
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="w-fit" aria-label="PingoGo home">
            <Image src="/logo.png" alt="PingoGo" width={168} height={48} priority className="h-10 w-auto" />
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">{tr('Welcome to PingoGo', 'Добро пожаловать в PingoGo')}</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">{title}</h1>
          {description ? <p className="mt-3 text-sm leading-6 text-muted">{description}</p> : null}
          <div className="brand-card mt-8 rounded-3xl p-6 sm:p-7">{children}</div>
          {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </div>
      </section>
      <aside className="brand-grid relative hidden overflow-hidden bg-soft-lime lg:flex lg:items-center lg:justify-center lg:p-12">
        <div className="relative z-10 w-full max-w-lg">
          <div className="brand-card rounded-[2rem] bg-white p-7">
            <p className="text-lg font-bold">{tr('Everything is under control', 'Всё под контролем')}</p>
            <div className="mt-6 space-y-3">
              {[tr('Website uptime', 'Доступность сайта'), tr('SSL & domain expiry', 'Срок SSL и домена'), tr('DNS changes', 'Изменения DNS')].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-background p-4">
                  <CheckCircle2 className="h-5 w-5 text-ok" />
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="brand-card -mt-3 ml-auto mr-5 flex max-w-sm items-center gap-4 rounded-2xl bg-white p-4">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#2aabee] text-white">
              <Send className="h-5 w-5 fill-current" />
            </span>
            <div><p className="text-sm font-bold">PingoGo</p><p className="text-xs text-muted">{tr('Your site is online · 186 ms', 'Ваш сайт доступен · 186 мс')}</p></div>
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-lime/70 blur-2xl" />
      </aside>
    </main>
  );
}
