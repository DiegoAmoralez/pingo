import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';
import { enabledSso } from '@/lib/auth';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function LoginPage() {
  const locale = await getLocale();
  return (
    <AuthShell
      title={pick(locale, 'Welcome back.', 'С возвращением.')}
      description={pick(locale, 'Sign in to see the health of every site you monitor.', 'Войдите, чтобы увидеть состояние всех сайтов под наблюдением.')}
      footer={<>{pick(locale, 'No account?', 'Нет аккаунта?')} <Link className="font-semibold text-accent" href="/register">{pick(locale, 'Start free', 'Начать бесплатно')}</Link></>}
    >
      <AuthForm mode="login" sso={enabledSso()} />
    </AuthShell>
  );
}
