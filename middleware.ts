import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logLoginAttempt, isAccountLocked } from '@/lib/audit-enhanced'

// In-memory rate limiting fallback (resets on server restart)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

export async function middleware(request: NextRequest) {
    // Check for account lockout before anything else if it's a login attempt
    if (request.nextUrl.pathname === '/staff-portal/login' && request.method === 'POST') {
        const email = request.nextUrl.searchParams.get('email')
        if (email && await isAccountLocked(email)) {
            return new NextResponse('Account locked. Please try again in 15 minutes or contact support.', { status: 403 })
        }
    }
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')

    if (!isValidUrl || !supabaseAnonKey || supabaseAnonKey.includes('ANON_KEY_HERE')) {
        return new NextResponse(
            `<html>
                <head>
                    <title>Configuration Required | LincolnVoice</title>
                </head>
                <body style="font-family: system-ui, -apple-system, sans-serif; padding: 2rem; max-width: 600px; margin: 4rem auto; background: #0f172a; color: #f1f5f9;">
                    <div style="border: 1px solid #334155; padding: 2rem; border-radius: 12px; background: #1e293b; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);">
                        <h2 style="color: #f43f5e; margin-top: 0; font-size: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            ⚠️ Supabase Setup Required
                        </h2>
                        <p style="line-height: 1.6; color: #cbd5e1;">It looks like your local <strong>.env</strong> file is not configured yet, or still contains placeholder values.</p>
                        <p style="line-height: 1.6; color: #cbd5e1;">Please edit the <strong>.env</strong> file in your project root and replace the placeholders with your actual Supabase URL and Anon Key:</p>
                        <pre style="background: #0f172a; padding: 1rem; border-radius: 6px; color: #38bdf8; overflow-x: auto; font-family: monospace; font-size: 0.9rem; border: 1px solid #1e293b;">NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</pre>
                        <p style="font-size: 0.9rem; color: #94a3b8; line-height: 1.6;">
                            💡 You can find these keys in your Supabase dashboard (which we saw you have open under the tab <strong>"lincolnVoice - Overview"</strong>) under <strong>Settings &rarr; API</strong>.
                        </p>
                    </div>
                </body>
            </html>`,
            {
                status: 500,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
        )
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // CSRF Protection for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const origin = request.headers.get('origin')
        const referer = request.headers.get('referer')
        const host = request.headers.get('host')

        if (origin && !origin.includes(host || '')) {
            return new NextResponse('Invalid Origin: Possible CSRF attack', { status: 403 })
        }

        if (!origin && referer && !referer.split('/')[2]?.includes(host || '')) {
            return new NextResponse('Invalid Referer: Possible CSRF attack', { status: 403 })
        }
    }

    // 1. IP-based Rate Limiting for Admin Login
    if (request.nextUrl.pathname === '/staff-portal/login' && request.method === 'POST') {
        const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown'

        // Try Upstash Redis first (if configured)
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

        if (redisUrl && redisToken) {
            try {
                // Dynamically import to avoid build crashes if package is missing
                // @ts-ignore
                const upstashRatelimit = await import('@upstash/ratelimit').catch(() => null)
                // @ts-ignore
                const upstashRedis = await import('@upstash/redis').catch(() => null)

                if (upstashRatelimit && upstashRedis) {
                    const { Ratelimit } = upstashRatelimit
                    const { Redis } = upstashRedis

                    const redis = new Redis({
                        url: redisUrl,
                        token: redisToken,
                    })

                    const ratelimit = new Ratelimit({
                        redis: redis,
                        limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 attempts per minute
                        analytics: true,
                    })

                    const { success } = await ratelimit.limit(`login_limit_${ip}`)
                    if (!success) {
                        // Log rate limited attempt
                        await logLoginAttempt(request.nextUrl.searchParams.get('email') || 'unknown', false, ip, request.headers.get('user-agent') || undefined, 'rate_limit_exceeded')
                        return new NextResponse('Too many login attempts. Please try again later.', { status: 429 })
                    }
                } else {
                    console.warn("Upstash packages not found, falling back to local rate limiting")
                    throw new Error("Missing packages")
                }
            } catch (e) {
                console.error("Redis Rate Limit Error (Falling back to local):", e)

                // Improved fallback: In-memory IP-based rate limiting
                const now = Date.now()
                const attempt = loginAttempts.get(ip) || { count: 0, resetAt: now + 60000 }

                // Reset if time window has passed
                if (now > attempt.resetAt) {
                    attempt.count = 0
                    attempt.resetAt = now + 60000
                }

                if (attempt.count >= 5) {
                    // Log local rate limited attempt
                    await logLoginAttempt(request.nextUrl.searchParams.get('email') || 'unknown', false, ip, request.headers.get('user-agent') || undefined, 'local_rate_limit_exceeded')
                    return new NextResponse('Too many login attempts. Please try again later.', { status: 429 })
                }

                // Increment attempt count
                attempt.count++
                loginAttempts.set(ip, attempt)

                // Cleanup old entries periodically (prevent memory leak)
                if (loginAttempts.size > 1000) {
                    for (const [key, value] of loginAttempts.entries()) {
                        if (now > value.resetAt) {
                            loginAttempts.delete(key)
                        }
                    }
                }
            }
        }
    }

    // Add a safety timeout to session check
    const sessionPromise = supabase.auth.getSession()
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
    )

    let session = null
    try {
        const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any
        session = data?.session
    } catch (err) {
        console.error("Middleware Session Timeout:", err)
        // If session check hangs, we continue without session rather than hanging indefinitely
    }

    // Protect staff portal routes
    if (request.nextUrl.pathname.startsWith('/staff-portal')) {
        // Exclude login page from redirect loop
        if (request.nextUrl.pathname === '/staff-portal/login') {
            if (session) {
                const redirectRes = NextResponse.redirect(new URL('/staff-portal/dashboard', request.url))
                // Copy cookies from current response to redirect response
                response.cookies.getAll().forEach(cookie => redirectRes.cookies.set(cookie.name, cookie.value))
                return redirectRes
            }
            return response
        }

        if (!session) {
            const redirectRes = NextResponse.redirect(new URL('/staff-portal/login', request.url))
            response.cookies.getAll().forEach(cookie => redirectRes.cookies.set(cookie.name, cookie.value))
            return redirectRes
        }

        // --- SESSION TIMEOUT LOGIC ---
        const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
        const now = Date.now()

        // 1. Inactivity Timeout
        const lastActivity = request.cookies.get('last_activity')?.value
        if (lastActivity && now - Number(lastActivity) > SESSION_TIMEOUT_MS) {
            console.log("Inactivity timeout triggered")
            await supabase.auth.signOut()
            const redirectUrl = new URL('/staff-portal/login', request.url)
            redirectUrl.searchParams.set('error', 'session_expired')
            const timeoutRes = NextResponse.redirect(redirectUrl)

            // Sync cookies from Supabase signOut and previous operations
            response.cookies.getAll().forEach(cookie => timeoutRes.cookies.set(cookie.name, cookie.value))
            timeoutRes.cookies.delete('last_activity')
            timeoutRes.cookies.delete('session_start')
            return timeoutRes
        }

        // 2. Absolute Timeout (from session start)
        let sessionStart = request.cookies.get('session_start')?.value
        if (!sessionStart) {
            // If missing, initialize it (e.g., first request after login)
            sessionStart = now.toString()
            response.cookies.set('session_start', sessionStart, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' })
        }

        if (now - Number(sessionStart) > SESSION_TIMEOUT_MS) {
            console.log("Absolute session timeout triggered")
            await supabase.auth.signOut()
            const redirectUrl = new URL('/staff-portal/login', request.url)
            redirectUrl.searchParams.set('error', 'session_expired')
            const timeoutRes = NextResponse.redirect(redirectUrl)

            response.cookies.getAll().forEach(cookie => timeoutRes.cookies.set(cookie.name, cookie.value))
            timeoutRes.cookies.delete('last_activity')
            timeoutRes.cookies.delete('session_start')
            return timeoutRes
        }

        // Update last activity on every valid request
        response.cookies.set('last_activity', now.toString(), { path: '/', httpOnly: true, secure: true, sameSite: 'lax' })
        // --- END SESSION TIMEOUT LOGIC ---

        // Role-based protection example
        // const userRole = session.user.user_metadata?.role || 'admin'
    }

    // Add security headers to the response
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, videos, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm)$).*)',
    ],
}
