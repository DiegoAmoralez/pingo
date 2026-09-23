import { NextResponse, type NextRequest } from 'next/server';

/**
 * Server components cannot read the current URL, so the root layout learns the
 * path from this header to decide whether to render the maintenance screen.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Pages only: static assets, images and API routes are handled elsewhere.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
