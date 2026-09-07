import { NextResponse } from 'next/server';
import { getApiUser, jsonError, rateLimit } from '@/lib/api';
import { requestManualCheck } from '@/server/monitors';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getApiUser(request);
    const { id } = await params;
    await rateLimit(`manual-check:${user.id}:${id}`, 4, 60);
    await requestManualCheck(user.id, id);
    return NextResponse.json({ ok: true, checking: true });
  } catch (error) {
    return jsonError(error);
  }
}
