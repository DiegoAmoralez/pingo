import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { signWebAppToken, verifyTelegramInitData, verifyWebAppToken } from './telegram-webapp';

const BOT_TOKEN = '123456:TEST_TOKEN';

function buildInitData(fields: Record<string, string>, token = BOT_TOKEN): string {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

describe('Telegram initData verification', () => {
  const now = 1_790_000_000_000;
  const fields = {
    auth_date: String(Math.floor(now / 1000) - 60),
    query_id: 'AAE',
    user: JSON.stringify({ id: 777, first_name: 'Max', username: 'max', language_code: 'ru' }),
    start_param: 'monitor_abc',
  };

  it('accepts a correctly signed payload', () => {
    const result = verifyTelegramInitData(buildInitData(fields), BOT_TOKEN, now);
    expect(result.user.id).toBe(777);
    expect(result.user.language_code).toBe('ru');
    expect(result.startParam).toBe('monitor_abc');
  });

  it('rejects a payload signed with another bot token', () => {
    expect(() => verifyTelegramInitData(buildInitData(fields, 'other:token'), BOT_TOKEN, now)).toThrow(
      'Invalid Telegram data',
    );
  });

  it('rejects tampered fields', () => {
    const tampered = buildInitData(fields).replace('%22id%22%3A777', '%22id%22%3A778');
    expect(() => verifyTelegramInitData(tampered, BOT_TOKEN, now)).toThrow();
  });

  it('rejects stale payloads', () => {
    const old = { ...fields, auth_date: String(Math.floor(now / 1000) - 2 * 24 * 3600) };
    expect(() => verifyTelegramInitData(buildInitData(old), BOT_TOKEN, now)).toThrow('expired');
  });
});

describe('Mini App tokens', () => {
  const secret = 'unit-test-secret';

  it('round-trips a signed token', () => {
    const token = signWebAppToken({ userId: 'u1', telegramUserId: '777' }, secret);
    expect(verifyWebAppToken(token, secret)).toMatchObject({ userId: 'u1', telegramUserId: '777' });
  });

  it('rejects tampering and expiry', () => {
    const token = signWebAppToken({ userId: 'u1', telegramUserId: '777' }, secret);
    expect(verifyWebAppToken(`${token}x`, secret)).toBeNull();
    expect(verifyWebAppToken(token, 'other-secret')).toBeNull();
    expect(verifyWebAppToken(token, secret, Date.now() + 13 * 3600 * 1000)).toBeNull();
  });
});
