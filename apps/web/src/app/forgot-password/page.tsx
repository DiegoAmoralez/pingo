import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 text-lg font-semibold">
        PINGO
      </Link>
      <h1 className="text-3xl font-semibold">Reset password</h1>
      <div className="mt-8">
        <AuthForm mode="forgot" />
      </div>
    </main>
  );
}
