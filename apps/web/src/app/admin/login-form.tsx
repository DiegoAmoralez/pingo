'use client';

import { useActionState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { useLocale } from '@/components/locale-provider';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = { error: null };

export function AdminLoginForm() {
  const { tr } = useLocale();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4" aria-describedby={state.error ? 'admin-login-error' : undefined}>
      <div>
        <Label htmlFor="admin-login">{tr('Login', 'Логин')}</Label>
        <Input
          id="admin-login"
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          placeholder="admin"
        />
      </div>
      <div>
        <Label htmlFor="admin-password">{tr('Password', 'Пароль')}</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>
      {state.error ? (
        <p id="admin-login-error" role="alert" className="rounded-xl bg-crit/10 px-3.5 py-2.5 text-sm font-semibold text-crit">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <Lock className="h-4 w-4" aria-hidden />
        {pending ? tr('Signing in…', 'Входим…') : tr('Sign in', 'Войти')}
      </Button>
    </form>
  );
}
