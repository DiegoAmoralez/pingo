import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { enabledSso } from '@/lib/auth';

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-lg font-semibold">
        PINGO
      </Link>
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-muted">Add a website and start watching in under a minute.</p>
      <div className="mt-8">
        <AuthForm mode="register" sso={enabledSso()} />
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
