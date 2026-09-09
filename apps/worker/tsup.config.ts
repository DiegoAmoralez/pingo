import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // CJS deps bundled into ESM need a real Node require.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';const require = __createRequire(import.meta.url);",
  },
  // Bundle workspace packages so the Docker image only needs native deps.
  noExternal: [/^@pingo\//],
  external: ['@prisma/client', 'ioredis', 'bullmq', 'grammy'],
});
