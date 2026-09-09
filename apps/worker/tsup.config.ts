import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  sourcemap: true,
  // Bundle workspace packages + dotenv so the Docker image only needs native deps.
  noExternal: [/^@pingo\//, 'dotenv'],
  external: ['@prisma/client', 'ioredis', 'bullmq', 'grammy'],
});
