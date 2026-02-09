import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates Bearer token auth against CRON_SECRET.
 * Returns an error response if unauthorized, or null if auth passed.
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
