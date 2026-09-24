import { logger } from '@pingo/shared';
import { Resend } from 'resend';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class LogEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    logger.info({ to: message.to, subject: message.subject }, 'email (log provider)');
  }
}

class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(message: EmailMessage): Promise<void> {
    const from = process.env.EMAIL_FROM || 'PINGO <noreply@localhost>';
    const result = await this.client.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}

let cached: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  cached = key ? new ResendEmailProvider(key) : new LogEmailProvider();
  return cached;
}

export {
  paymentProblemEmail,
  renderEmail,
  resetPasswordEmail,
  toEmailLocale,
  verificationEmail,
  type EmailLocale,
  type RenderedEmail,
} from './templates.js';
