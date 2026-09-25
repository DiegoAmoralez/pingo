import { z } from 'zod';
import { DEFAULT_TIMEOUT_SECONDS } from './constants.js';

export const emailSchema = z.string().trim().email().max(255);
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const addMonitorSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  name: z.string().trim().min(1).max(100).optional(),
  checkIntervalSeconds: z.coerce.number().int().min(60).max(3600).optional(),
  timeoutSeconds: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .optional()
    .default(DEFAULT_TIMEOUT_SECONDS),
  expectedStatusCodes: z.string().trim().max(64).optional().default('200-399'),
});

export const updateMonitorSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  url: z.string().trim().min(1).max(2048).optional(),
  checkIntervalSeconds: z.coerce.number().int().min(60).max(3600).optional(),
  timeoutSeconds: z.coerce.number().int().min(1).max(30).optional(),
  expectedStatusCodes: z.string().trim().max(64).optional(),
  paused: z.boolean().optional(),
});

export const notificationPreferencesSchema = z.object({
  websiteDowntime: z.boolean(),
  websiteRecovery: z.boolean(),
  sslExpiration: z.boolean(),
  domainExpiration: z.boolean(),
  dnsChanges: z.boolean(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(64),
});

export const checkoutSchema = z.object({
  plan: z.enum(['PERSONAL', 'PRO', 'AGENCY']),
  /** Where the checkout was started from; shows up in Stripe metadata. */
  source: z.enum(['web', 'bot', 'miniapp']).optional(),
});

export const telegramAddSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export type AddMonitorInput = z.infer<typeof addMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof updateMonitorSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
