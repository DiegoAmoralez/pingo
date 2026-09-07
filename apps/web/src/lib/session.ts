import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@pingo/database';
import { auth } from './auth';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login');
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      subscription: true,
      telegram: true,
      preferences: true,
    },
  });
  if (!user) redirect('/login');
  return { session, user };
}

export async function requireAdmin() {
  const { user, session } = await requireUser();
  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }
  return { user, session };
}
