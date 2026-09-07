import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./ssrf.js', () => ({
  resolvePublicHost: async (hostname: string) => ({
    hostname,
    addresses: ['127.0.0.1'],
  }),
}));

import { checkHttp } from './http-check.js';

function listen(handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void) {
  const server = createServer(handler);
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

function monitorUrl(serverUrl: string): string {
  const parsed = new URL(serverUrl);
  return `http://example.com:${parsed.port}/`;
}

describe('HTTP check integration', () => {
  const closers: Array<() => Promise<void>> = [];
  afterEach(async () => {
    await Promise.all(closers.splice(0).map((fn) => fn()));
  });

  it('treats HTTP 200 as success', async () => {
    const server = await listen((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    closers.push(server.close);
    const result = await checkHttp({ url: monitorUrl(server.url), timeoutSeconds: 3 });
    expect(result.status).toBe('UP');
    expect(result.httpStatus).toBe(200);
  });

  it('classifies a 500 response as HTTP_ERROR', async () => {
    const server = await listen((_req, res) => {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('fail');
    });
    closers.push(server.close);
    const result = await checkHttp({ url: monitorUrl(server.url), timeoutSeconds: 3 });
    expect(result.status).toBe('DOWN');
    expect(result.errorType).toBe('HTTP_ERROR');
    expect(result.httpStatus).toBe(500);
  });

  it('falls back from HEAD 405 to GET', async () => {
    const server = await listen((req, res) => {
      if (req.method === 'HEAD') {
        res.writeHead(405);
        res.end();
        return;
      }
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('ok');
    });
    closers.push(server.close);
    const result = await checkHttp({ url: monitorUrl(server.url), timeoutSeconds: 3 });
    expect(result.status).toBe('UP');
    expect(result.httpStatus).toBe(200);
  });
});
