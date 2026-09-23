import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { getLocale } from '@/lib/i18n-server';
import { pick } from '@/lib/i18n';

export const alt = 'PingoGo — Website monitoring with instant Telegram alerts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const locale = await getLocale();
  const logoData = await readFile(path.join(process.cwd(), 'public/logo.png'));
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#f7faf4',
          color: '#092c25',
          display: 'flex',
          height: '100%',
          justifyContent: 'space-between',
          padding: '72px 80px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: 650 }}>
          <img src={logoSrc} alt="PingoGo" width={280} height={78} style={{ objectFit: 'contain' }} />
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 800, letterSpacing: -3, lineHeight: 1.04, marginTop: 42 }}>
            {pick(locale, 'Your site went down? You’ll know first.', 'Сайт упал? Вы узнаете первым.')}
          </div>
          <div style={{ color: '#66766f', display: 'flex', fontSize: 28, lineHeight: 1.4, marginTop: 28 }}>
            {pick(locale, 'Uptime, SSL, DNS and domain monitoring with instant Telegram alerts.', 'Мониторинг доступности, SSL, DNS и домена с уведомлениями в Telegram.')}
          </div>
        </div>
        <div
          style={{
            background: '#e9ffac',
            borderRadius: 48,
            display: 'flex',
            flexDirection: 'column',
            padding: 38,
            transform: 'rotate(-2deg)',
            width: 340,
          }}
        >
          <div style={{ background: 'white', borderRadius: 24, display: 'flex', flexDirection: 'column', padding: 28 }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700 }}>shop.example</div>
            <div style={{ alignItems: 'center', color: '#e04444', display: 'flex', fontSize: 22, gap: 12, marginTop: 22 }}>
              <span style={{ background: '#e04444', borderRadius: 99, display: 'flex', height: 14, width: 14 }} />
              {pick(locale, 'Website unavailable', 'Сайт недоступен')}
            </div>
            <div style={{ color: '#66766f', display: 'flex', fontSize: 18, marginTop: 12 }}>HTTP 502 · {pick(locale, 'just now', 'только что')}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
