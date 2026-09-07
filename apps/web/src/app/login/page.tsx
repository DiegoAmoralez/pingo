import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { enabledSso } from '@/lib/auth';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-lg font-semibold">
        PINGO
      </Link>
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">Welcome back.</p>
      <div className="mt-8">
        <AuthForm mode="login" sso={enabledSso()} />
      </div>
      <p className="mt-6 text-sm text-muted">
        No account? <Link href="/register">Start free</Link>
      </p>
    </main>
  );
}
