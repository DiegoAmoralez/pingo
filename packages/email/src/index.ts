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

export function verificationEmail(url: string) {
  return {
    subject: 'Verify your PINGO email',
    html: `<p>Welcome to PINGO.</p><p><a href="${url}">Verify your email</a> to start monitoring.</p>`,
    text: `Welcome to PINGO. Verify your email: ${url}`,
  };
}

export function resetPasswordEmail(url: string) {
  return {
    subject: 'Reset your PINGO password',
    html: `<p>Reset your password with this link:</p><p><a href="${url}">${url}</a></p><p>If you did not request this, you can ignore the email.</p>`,
    text: `Reset your PINGO password: ${url}`,
  };
}

export function paymentProblemEmail() {
  return {
    subject: 'PINGO payment failed',
    html: `<p>We could not process your latest PINGO payment.</p><p>Update your billing details to keep paid monitoring active.</p>`,
    text: 'We could not process your latest PINGO payment. Update your billing details to keep paid monitoring active.',
  };
}
