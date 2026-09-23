'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { useLocale } from '@/components/locale-provider';

function ResetInner() {
  const { tr } = useLocale();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) setError(result.error.message ?? tr('Could not reset password', 'Не удалось сбросить пароль'));
    else setMessage(tr('Password updated. You can sign in now.', 'Пароль обновлён. Теперь можно войти.'));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="password">{tr('New password', 'Новый пароль')}</Label>
        <Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error ? <p className="text-sm text-crit">{error}</p> : null}
      {message ? <p className="text-sm text-ok">{message}</p> : null}
      <Button className="w-full" type="submit">
        {tr('Update password', 'Обновить пароль')}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { tr } = useLocale();
  return (
    <AuthShell
      title={tr('Choose a new password.', 'Выберите новый пароль.')}
      description={tr('Use at least eight characters and keep it unique.', 'Используйте не менее восьми символов и не повторяйте старый пароль.')}
      footer={<Link className="font-semibold text-accent" href="/login">{tr('Back to sign in', 'Вернуться ко входу')}</Link>}
    >
      <Suspense>
        <ResetInner />
      </Suspense>
    </AuthShell>
  );
}
