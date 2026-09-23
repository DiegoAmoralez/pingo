import { loadEnvConfig } from '@next/env';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const webDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.resolve(webDir, '../..'));
loadEnvConfig(webDir);

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    viewTransition: true,
  },
  // Ensure Prisma query engines are traced into the standalone output for Alpine.
  outputFileTracingIncludes: {
    '/*': [
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*',
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*',
      '../../packages/database/node_modules/.prisma/client/**/*',
    ],
  },
  transpilePackages: [
    '@pingo/database',
    '@pingo/shared',
    '@pingo/monitoring',
    '@pingo/notifications',
    '@pingo/billing',
    '@pingo/email',
    '@pingo/core',
    '@pingo/telegram-bot',
  ],
  serverExternalPackages: ['@prisma/client', 'ioredis', 'bullmq', 'pino', 'grammy'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    // BullMQ ships an optional Valkey GLIDE adapter; PingoGo uses ioredis.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@valkey/valkey-glide': false,
    };
    return config;
  },
};

export default nextConfig;
