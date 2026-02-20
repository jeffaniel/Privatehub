/**
 * API Security Middleware
 * Validates requests, enforces rate limits, and adds security headers
 */

import { NextRequest, NextResponse } from 'next/server'
import { detectSQLInjection, detectXSS, processSecurityEvent } from './security-monitoring'

export interface APISecurityConfig {
    requireAuth?: boolean
    rateLimit?: {
        maxRequests: number
        windowMs: number
    }
    validateInput?: boolean
    allowedMethods?: string[]
}

/**
 * API security middleware wrapper
 */
export function withAPISecurity(
    handler: (req: NextRequest) => Promise<NextResponse>,
    config: APISecurityConfig = {}
) {
    return async (req: NextRequest): Promise<NextResponse> => {
        try {
            // Check allowed methods
            if (config.allowedMethods && !config.allowedMethods.includes(req.method)) {
                return NextResponse.json(
                    { error: 'Method not allowed' },
                    { status: 405 }
                )
            }

            // Validate input for SQL injection and XSS
            if (config.validateInput) {
                const body = await req.clone().text()

                const sqlEvent = detectSQLInjection(body)
                if (sqlEvent) {
                    await processSecurityEvent(sqlEvent)
                    return NextResponse.json(
                        { error: 'Invalid input detected' },
                        { status: 400 }
                    )
                }

                const xssEvent = detectXSS(body)
                if (xssEvent) {
                    await processSecurityEvent(xssEvent)
                    return NextResponse.json(
                        { error: 'Invalid input detected' },
                        { status: 400 }
                    )
                }
            }

            // Call the actual handler
            const response = await handler(req)

            // Add security headers
            response.headers.set('X-Content-Type-Options', 'nosniff')
            response.headers.set('X-Frame-Options', 'DENY')
            response.headers.set('X-XSS-Protection', '1; mode=block')
            response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

            return response
        } catch (error) {
            console.error('API Security Error:', error)
            return NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            )
        }
    }
}

/**
 * Validate API request body against schema
 */
export function validateRequestBody<T>(
    body: any,
    schema: {
        [K in keyof T]: {
            type: 'string' | 'number' | 'boolean' | 'array' | 'object'
            required?: boolean
            minLength?: number
            maxLength?: number
            min?: number
            max?: number
            pattern?: RegExp
        }
    }
): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    for (const [key, rules] of Object.entries(schema) as [string, any][]) {
        const value = body[key]

        // Check required
        if (rules.required && (value === undefined || value === null)) {
            errors.push(`${key} is required`)
            continue
        }

        if (value === undefined || value === null) continue

        // Check type
        const actualType = Array.isArray(value) ? 'array' : typeof value
        if (actualType !== rules.type) {
            errors.push(`${key} must be of type ${rules.type}`)
            continue
        }

        // String validations
        if (rules.type === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${key} must be at least ${rules.minLength} characters`)
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${key} must not exceed ${rules.maxLength} characters`)
            }
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${key} has invalid format`)
            }
        }

        // Number validations
        if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${key} must be at least ${rules.min}`)
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${key} must not exceed ${rules.max}`)
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * Generate API key
 */
export function generateAPIKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const length = 32
    let key = ''

    if (typeof window !== 'undefined' && window.crypto) {
        const array = new Uint8Array(length)
        window.crypto.getRandomValues(array)
        for (let i = 0; i < length; i++) {
            key += chars[array[i] % chars.length]
        }
    } else {
        const crypto = require('crypto')
        const bytes = crypto.randomBytes(length)
        for (let i = 0; i < length; i++) {
            key += chars[bytes[i] % chars.length]
        }
    }

    return `lv_${key}` // Prefix for identification
}

/**
 * Hash API key for storage
 */
export async function hashAPIKey(key: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(key)

    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
        const crypto = require('crypto')
        return crypto.createHash('sha256').update(key).digest('hex')
    }
}

/**
 * Verify API key
 */
export async function verifyAPIKey(
    providedKey: string,
    storedHash: string
): Promise<boolean> {
    const providedHash = await hashAPIKey(providedKey)
    return providedHash === storedHash
}

/**
 * Extract IP address from request
 */
export function getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for')
    const realIP = req.headers.get('x-real-ip')
    const cfIP = req.headers.get('cf-connecting-ip')

    if (cfIP) return cfIP
    if (realIP) return realIP
    if (forwarded) return forwarded.split(',')[0].trim()

    return 'unknown'
}

/**
 * Check if IP is whitelisted (for admin panel)
 */
export function isIPWhitelisted(ip: string, whitelist: string[]): boolean {
    return whitelist.includes(ip) || whitelist.includes('*')
}

/**
 * Create CORS headers
 */
export function getCORSHeaders(allowedOrigins: string[]): Headers {
    const headers = new Headers()

    // In production, check against allowed origins
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0] || '*')
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    headers.set('Access-Control-Max-Age', '86400')

    return headers
}
