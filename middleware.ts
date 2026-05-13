import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/update', '/api/state']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas públicas: login, APIs (update y state no requieren auth)
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Archivos estáticos (imágenes, etc.)
  if (pathname.startsWith('/_next') || pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
    return NextResponse.next()
  }

  const auth = req.cookies.get('cubodemo_auth')
  if (auth?.value !== process.env.AUTH_SECRET) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
