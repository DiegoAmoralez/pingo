'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { logger } from '@pingo/shared';
import {
  clearAdminSession,
  createAdminSession,
  getAdminSession,
  isAdminPanelConfigured,
  verifyAdminCredentials,
} from '@/lib/admin-auth';
import { rateLimit } from '@/lib/api';
import { setMaintenanceEnabled } from '@/lib/maintenance';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const locale = await getLocale();
  const t = (en: string, ru: string) => pick(locale, en, ru);

  if (!isAdminPanelConfigured()) {
    return { error: t('Admin panel is not configured on this server.', 'Админ-панель не настроена на этом сервере.') };
  }

  const login = String(formData.get('login') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!login || !password) {
    return { error: t('Enter login and password.', 'Введите логин и пароль.') };
  }

  // 10 attempts per 15 minutes per IP: enough for typos, useless for brute force.
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  try {
    await rateLimit(`admin-login:${ip}`, 10, 15 * 60);
  } catch {
    return { error: t('Too many attempts. Try again in 15 minutes.', 'Слишком много попыток. Попробуйте через 15 минут.') };
  }

  if (!verifyAdminCredentials(login, password)) {
    logger.warn({ ip, login }, 'admin panel login failed');
    return { error: t('Wrong login or password.', 'Неверный логин или пароль.') };
  }

  await createAdminSession(login);
  logger.info({ login }, 'admin panel login');
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await clearAdminSession();
  redirect('/admin');
}

export async function setMaintenanceAction(enabled: boolean): Promise<void> {
  const session = await getAdminSession();
  if (!session) redirect('/admin');

  await setMaintenanceEnabled(enabled, session.login);
  // Every page reads the flag in the root layout; drop cached RSC payloads.
  revalidatePath('/', 'layout');
}
