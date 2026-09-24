import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n';
import { COUNTRY_HEADERS, detectLocale } from '@/lib/locale-detect';

/**
 * Server components cannot read the current URL or pick a language from
 * geo/Accept-Language on their own, so this middleware hands them:
 * - `x-pathname`: used by the root layout for the maintenance screen;
 * - `x-locale`:   detected language for visitors without a saved preference.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!isLocale(saved)) {
    const country = COUNTRY_HEADERS.map((name) => request.headers.get(name)).find(Boolean) ?? null;
    headers.set(
      'x-locale',
      detectLocale({ country, acceptLanguage: request.headers.get('accept-language') }),
    );
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Pages only: static assets, images and API routes are handled elsewhere.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
