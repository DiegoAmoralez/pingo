import { NextResponse } from 'next/server';
import { getPlanDefinitions } from '@pingo/shared';

/** Public plan catalogue (used by the Telegram Mini App). */
export function GET() {
  return NextResponse.json({ plans: Object.values(getPlanDefinitions()) });
}
