import Link from 'next/link';

export function SiteHeader({ signedIn }: { signedIn?: boolean }) {
  return (
    <header className="site-header mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        PINGO
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
        <Link className="hover:text-foreground" href="/#how">
          How it works
        </Link>
        <Link className="hover:text-foreground" href="/#features">
          What we watch
        </Link>
        <Link className="hover:text-foreground" href="/pricing">
          Pricing
        </Link>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        {signedIn ? (
          <Link href="/dashboard" className="rounded-xl bg-accent px-3 py-2 text-accent-fg">
            Dashboard
          </Link>
        ) : (
          <>
            <Link href="/login">Sign in</Link>
            <Link href="/register" className="rounded-xl bg-accent px-3 py-2 text-accent-fg">
              Start free
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-6xl px-6 pb-12 text-sm text-muted">
      <div className="flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:justify-between">
        <p>PINGO monitors the things that actually matter.</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/website-monitoring">Website</Link>
          <Link href="/ssl-monitoring">SSL</Link>
          <Link href="/domain-expiration-monitor">Domain</Link>
          <Link href="/dns-monitoring">DNS</Link>
          <Link href="/telegram-website-monitor">Telegram</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
