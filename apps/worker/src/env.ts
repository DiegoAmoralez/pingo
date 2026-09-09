import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Railway/Docker inject env vars. For local runs, load the monorepo root `.env`
 * without depending on the `dotenv` package (its CJS `require('fs')` breaks in the ESM bundle).
 */
function applyEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  applyEnvFile(path.resolve(here, '../../../.env'));
  applyEnvFile(path.resolve(process.cwd(), '.env'));
}
