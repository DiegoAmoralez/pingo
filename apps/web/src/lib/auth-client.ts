import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL,
});

const EMAIL_MISMATCH = /email mismatch/i;

/**
 * Re-sends the verification email for `email`.
 * If the browser still holds a session for a different account, better-auth answers
 * "Email mismatch" — we drop that stale session and retry once.
 */
export async function resendVerificationEmail(email: string, callbackURL: string): Promise<void> {
  const send = () => authClient.sendVerificationEmail({ email, callbackURL });

  let result = await send();
  if (result.error && EMAIL_MISMATCH.test(result.error.message ?? '')) {
    await authClient.signOut();
    result = await send();
  }
  if (result.error) throw new Error(result.error.message ?? 'Could not send the email.');
}
