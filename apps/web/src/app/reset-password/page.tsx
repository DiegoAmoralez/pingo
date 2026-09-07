'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import Link from 'next/link';
import { Suspense } from 'react';

function ResetInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) setError(result.error.message ?? 'Could not reset password');
    else setMessage('Password updated. You can sign in now.');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="password">New password</Label>
        <Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error ? <p className="text-sm text-crit">{error}</p> : null}
      {message ? <p className="text-sm text-ok">{message}</p> : null}
      <Button className="w-full" type="submit">
        Update password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-lg font-semibold">
        PINGO
      </Link>
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <div className="mt-8">
        <Suspense>
          <ResetInner />
        </Suspense>
      </div>
    </main>
  );
}
