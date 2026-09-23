import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export default async function ForgotPasswordPage() {
  const locale = await getLocale();
  return (
    <AuthShell
      title={pick(locale, 'Reset your password.', 'Сбросьте пароль.')}
      description={pick(locale, 'Enter your email and we’ll send a secure reset link.', 'Введите email, и мы отправим защищённую ссылку для сброса.')}
      footer={<Link className="font-semibold text-accent" href="/login">{pick(locale, 'Back to sign in', 'Вернуться ко входу')}</Link>}
    >
      <AuthForm mode="forgot" />
    </AuthShell>
  );
}
