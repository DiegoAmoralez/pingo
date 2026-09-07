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
  transpilePackages: [
    '@pingo/database',
    '@pingo/shared',
    '@pingo/monitoring',
    '@pingo/notifications',
    '@pingo/billing',
    '@pingo/email',
  ],
  serverExternalPackages: ['@prisma/client', 'ioredis', 'bullmq', 'pino', 'grammy'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
