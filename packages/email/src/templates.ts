/**
 * Branded transactional emails.
 *
 * Email clients are hostile: no web fonts, no flexbox, partial CSS support and
 * Outlook still renders with Word. So everything here is table-based with
 * inline styles, a system font stack and a "bulletproof" button. Colors mirror
 * the site tokens in apps/web/src/app/globals.css.
 */

export type EmailLocale = 'en' | 'ru';

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const COLORS = {
  background: '#f6f9f1',
  card: '#ffffff',
  foreground: '#0f2a22',
  muted: '#5f6f67',
  border: '#dde8dc',
  accent: '#1b7d45',
  accentFg: '#ffffff',
  softLime: '#e9f8cf',
  lime: '#d7f56b',
};

const FONT_STACK =
  "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function appUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.pingogo.eu';
  return raw.replace(/\/+$/, '');
}

export function toEmailLocale(value: string | null | undefined): EmailLocale {
  return value?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type EmailContent = {
  locale: EmailLocale;
  subject: string;
  /** Short line shown next to the subject in inbox previews. */
  preheader: string;
  /** Small uppercase label above the title. */
  eyebrow: string;
  title: string;
  /** Paragraphs, plain text (escaped on render). */
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Text under the button, e.g. link validity. */
  note?: string;
  /** "Didn't request this?" style closing line. */
  closing?: string;
};

const FOOTER: Record<EmailLocale, { tagline: string; fallback: string; sentBy: string }> = {
  en: {
    tagline: 'Website, SSL, DNS and domain monitoring with Telegram alerts.',
    fallback: 'Button not working? Copy this link into your browser:',
    sentBy: 'You received this email because an account was created with this address on PingoGo.',
  },
  ru: {
    tagline: 'Мониторинг сайта, SSL, DNS и домена с уведомлениями в Telegram.',
    fallback: 'Кнопка не работает? Скопируйте ссылку в браузер:',
    sentBy: 'Вы получили это письмо, потому что с этим адресом создан аккаунт в PingoGo.',
  },
};

export function renderEmail(content: EmailContent): RenderedEmail {
  const base = appUrl();
  const footer = FOOTER[content.locale];
  const lang = content.locale;

  const paragraphsHtml = content.paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:26px;color:${COLORS.foreground};">${escapeHtml(text)}</p>`,
    )
    .join('');

  const ctaHtml = content.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px;">
        <tr>
          <td align="center" bgcolor="${COLORS.accent}" style="border-radius:14px;">
            <a href="${escapeHtml(content.cta.url)}" target="_blank"
               style="display:inline-block;padding:15px 30px;font-family:${FONT_STACK};font-size:16px;font-weight:700;line-height:20px;color:${COLORS.accentFg};text-decoration:none;border-radius:14px;">
              ${escapeHtml(content.cta.label)}&nbsp;&rarr;
            </a>
          </td>
        </tr>
      </table>`
    : '';

  const noteHtml = content.note
    ? `<p style="margin:10px 0 0;font-size:13px;line-height:20px;color:${COLORS.muted};">${escapeHtml(content.note)}</p>`
    : '';

  const fallbackHtml = content.cta
    ? `
      <p style="margin:26px 0 0;font-size:13px;line-height:20px;color:${COLORS.muted};">${escapeHtml(footer.fallback)}</p>
      <p style="margin:6px 0 0;font-size:12px;line-height:18px;word-break:break-all;">
        <a href="${escapeHtml(content.cta.url)}" style="color:${COLORS.accent};text-decoration:underline;">${escapeHtml(content.cta.url)}</a>
      </p>`
    : '';

  const closingHtml = content.closing
    ? `<p style="margin:26px 0 0;padding-top:20px;border-top:1px solid ${COLORS.border};font-size:14px;line-height:22px;color:${COLORS.muted};">${escapeHtml(content.closing)}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(content.subject)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <style>table,td{font-family:Arial,sans-serif !important;}</style>
  <![endif]-->
  <style>
    body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table{border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;}
    img{border:0;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    a[x-apple-data-detectors]{color:inherit !important;text-decoration:none !important;}
    @media only screen and (max-width:620px){
      .container{width:100% !important;}
      .card{padding:28px 22px !important;border-radius:20px !important;}
      .title{font-size:26px !important;line-height:32px !important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:${FONT_STACK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(content.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.background}" style="background:${COLORS.background};">
    <tr>
      <td align="center" style="padding:36px 16px 44px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
          <tr>
            <td style="padding:0 6px 22px;">
              <a href="${base}" target="_blank" style="text-decoration:none;">
                <img src="${base}/logo.png" width="150" height="42" alt="PingoGo" style="display:block;width:150px;height:auto;">
              </a>
            </td>
          </tr>
          <tr>
            <td class="card" bgcolor="${COLORS.card}" style="background:${COLORS.card};border-radius:24px;padding:40px 40px 36px;border:1px solid ${COLORS.border};">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${COLORS.softLime}" style="background:${COLORS.softLime};border-radius:999px;padding:6px 12px;font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${COLORS.accent};">
                    ${escapeHtml(content.eyebrow)}
                  </td>
                </tr>
              </table>
              <h1 class="title" style="margin:20px 0 14px;font-size:30px;line-height:36px;font-weight:800;letter-spacing:-0.6px;color:${COLORS.foreground};">${escapeHtml(content.title)}</h1>
              ${paragraphsHtml}
              ${ctaHtml}
              ${noteHtml}
              ${fallbackHtml}
              ${closingHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:22px 10px 0;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:20px;color:${COLORS.muted};">
                <a href="${base}" style="color:${COLORS.accent};font-weight:700;text-decoration:none;">PingoGo</a> &middot; ${escapeHtml(footer.tagline)}
              </p>
              <p style="margin:8px 0 0;font-size:12px;line-height:18px;color:${COLORS.muted};">${escapeHtml(footer.sentBy)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    content.title,
    '',
    ...content.paragraphs,
    ...(content.cta ? ['', `${content.cta.label}: ${content.cta.url}`] : []),
    ...(content.note ? ['', content.note] : []),
    ...(content.closing ? ['', content.closing] : []),
    '',
    `PingoGo · ${footer.tagline}`,
    base,
  ];

  return { subject: content.subject, html, text: textParts.join('\n') };
}

// ---------------------------------------------------------------------------
// Concrete emails
// ---------------------------------------------------------------------------

export function verificationEmail(url: string, locale: EmailLocale = 'en'): RenderedEmail {
  if (locale === 'ru') {
    return renderEmail({
      locale,
      subject: 'Подтвердите email — PingoGo',
      preheader: 'Один клик — и мониторинг запущен.',
      eyebrow: 'Подтверждение email',
      title: 'Один клик — и вы внутри.',
      paragraphs: [
        'Спасибо, что выбрали PingoGo. Подтвердите адрес, чтобы мы знали, куда писать о падениях сайта, истекающих сертификатах и смене DNS.',
      ],
      cta: { label: 'Подтвердить email', url },
      note: 'Ссылка действует 1 час.',
      closing: 'Если вы не создавали аккаунт в PingoGo, просто проигнорируйте это письмо — ничего не произойдёт.',
    });
  }
  return renderEmail({
    locale,
    subject: 'Verify your email — PingoGo',
    preheader: 'One click and monitoring starts.',
    eyebrow: 'Email verification',
    title: "One click and you're in.",
    paragraphs: [
      'Thanks for choosing PingoGo. Verify your address so we know where to reach you about downtime, expiring certificates and DNS changes.',
    ],
    cta: { label: 'Verify email', url },
    note: 'This link is valid for 1 hour.',
    closing: "If you didn't create a PingoGo account, you can safely ignore this email — nothing will happen.",
  });
}

export function resetPasswordEmail(url: string, locale: EmailLocale = 'en'): RenderedEmail {
  if (locale === 'ru') {
    return renderEmail({
      locale,
      subject: 'Сброс пароля — PingoGo',
      preheader: 'Задайте новый пароль для аккаунта PingoGo.',
      eyebrow: 'Сброс пароля',
      title: 'Задайте новый пароль.',
      paragraphs: ['Мы получили запрос на сброс пароля. Нажмите кнопку и введите новый пароль — старый перестанет работать.'],
      cta: { label: 'Задать новый пароль', url },
      note: 'Ссылка действует 1 час.',
      closing: 'Не запрашивали сброс? Проигнорируйте письмо — пароль останется прежним.',
    });
  }
  return renderEmail({
    locale,
    subject: 'Reset your password — PingoGo',
    preheader: 'Set a new password for your PingoGo account.',
    eyebrow: 'Password reset',
    title: 'Set a new password.',
    paragraphs: ['We received a request to reset your password. Press the button and choose a new one — the old password stops working.'],
    cta: { label: 'Set a new password', url },
    note: 'This link is valid for 1 hour.',
    closing: "Didn't request this? Ignore the email — your password stays the same.",
  });
}

export function paymentProblemEmail(locale: EmailLocale = 'en'): RenderedEmail {
  const billingUrl = `${appUrl()}/settings`;
  if (locale === 'ru') {
    return renderEmail({
      locale,
      subject: 'Не прошёл платёж — PingoGo',
      preheader: 'Обновите способ оплаты, чтобы мониторинг не остановился.',
      eyebrow: 'Оплата',
      title: 'Платёж не прошёл.',
      paragraphs: [
        'Мы не смогли списать оплату за PingoGo. Проверки сайтов пока работают, но платные функции отключатся, если платёж не пройдёт повторно.',
        'Обновите карту в настройках — обычно это занимает меньше минуты.',
      ],
      cta: { label: 'Обновить способ оплаты', url: billingUrl },
    });
  }
  return renderEmail({
    locale,
    subject: 'Payment failed — PingoGo',
    preheader: 'Update your billing details to keep monitoring running.',
    eyebrow: 'Billing',
    title: 'Your payment failed.',
    paragraphs: [
      "We couldn't charge your PingoGo subscription. Checks keep running for now, but paid features switch off if the retry fails too.",
      'Update your card in settings — it usually takes under a minute.',
    ],
    cta: { label: 'Update billing details', url: billingUrl },
  });
}
