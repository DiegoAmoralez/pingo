import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AddMonitorButton } from '@/components/add-monitor-button';

export function AppShell({
  email,
  isAdmin,
  children,
}: {
  email: string;
  isAdmin?: boolean;
  children: React.ReactNode;
}) {
  async function logout() {
    'use server';
    await auth.api.signOut({ headers: await headers() });
    redirect('/');
  }

  return (
    <div className="min-h-screen">
      <header className="site-header border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              PINGO
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-muted sm:flex">
              <Link className="hover:text-foreground" href="/dashboard">
                Dashboard
              </Link>
              <Link className="hover:text-foreground" href="/dashboard/incidents">
                Incidents
              </Link>
              <Link className="hover:text-foreground" href="/settings">
                Settings
              </Link>
              {isAdmin ? <Link href="/admin">Admin</Link> : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <AddMonitorButton />
            <form action={logout}>
              <button className="max-w-[140px] truncate text-sm text-muted" type="submit">
                {email}
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
