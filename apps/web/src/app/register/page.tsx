import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';
import { enabledSso } from '@/lib/auth';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function RegisterPage() {
  const locale = await getLocale();
  return (
    <AuthShell
      title={pick(locale, 'Start monitoring free.', 'Начните мониторинг бесплатно.')}
      description={pick(locale, 'Add your first website in under a minute. No card or code changes required.', 'Добавьте первый сайт меньше чем за минуту. Без карты и изменений в коде.')}
      footer={<>{pick(locale, 'Already have an account?', 'Уже есть аккаунт?')} <Link className="font-semibold text-accent" href="/login">{pick(locale, 'Sign in', 'Войти')}</Link></>}
    >
      <AuthForm mode="register" sso={enabledSso()} />
    </AuthShell>
  );
}
