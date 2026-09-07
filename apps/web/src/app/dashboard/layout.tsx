import { requireUser } from '@/lib/session';
import { AppShell } from '@/components/app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return (
    <AppShell email={user.email} isAdmin={user.role === 'ADMIN'}>
      {children}
    </AppShell>
  );
}
