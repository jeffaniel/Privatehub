/**
 * Input Sanitization Utilities
 * Prevents XSS, SQL injection, and other injection attacks
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content to prevent XSS
 * Uses DOMPurify for comprehensive sanitization
 */
export function sanitizeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    })
}

/**
 * Sanitize plain text (escape HTML entities)
 */
export function sanitizeText(text: string): string {
    if (!text) return ''

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
}

/**
 * Sanitize for use in URLs
 */
export function sanitizeURL(url: string): string {
    try {
        const parsed = new URL(url)

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return ''
        }

        return parsed.toString()
    } catch {
        return ''
    }
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
    // Remove path separators and null bytes
    return filename
        .replace(/[\/\\]/g, '')
        .replace(/\0/g, '')
        .replace(/\.\./g, '')
        .trim()
        .substring(0, 255) // Limit length
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
    const sanitized = email.trim().toLowerCase()

    // Basic email validation
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
    if (!emailRegex.test(sanitized)) {
        throw new Error('Invalid email format')
    }

    return sanitized
}

/**
 * Sanitize JSON input
 */
export function sanitizeJSON(input: string): any {
    try {
        const parsed = JSON.parse(input)

        // Recursively sanitize string values
        const sanitize = (obj: any): any => {
            if (typeof obj === 'string') {
                return sanitizeText(obj)
            } else if (Array.isArray(obj)) {
                return obj.map(sanitize)
            } else if (typeof obj === 'object' && obj !== null) {
                const sanitized: any = {}
                for (const [key, value] of Object.entries(obj)) {
                    sanitized[sanitizeText(key)] = sanitize(value)
                }
                return sanitized
            }
            return obj
        }

        return sanitize(parsed)
    } catch {
        throw new Error('Invalid JSON')
    }
}

/**
 * Remove potentially dangerous characters from input
 */
export function removeDangerousChars(input: string): string {
    // Remove null bytes, control characters, and other dangerous chars
    return input
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/[<>]/g, '')
        .trim()
}

/**
 * Validate and sanitize markdown
 * Allows safe markdown but prevents XSS
 */
export function sanitizeMarkdown(markdown: string): string {
    // Remove script tags and javascript: links
    let sanitized = markdown
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')

    return sanitized
}

/**
 * Validate input length
 */
export function validateLength(
    input: string,
    minLength: number,
    maxLength: number,
    fieldName: string = 'Input'
): void {
    if (input.length < minLength) {
        throw new Error(`${fieldName} must be at least ${minLength} characters`)
    }
    if (input.length > maxLength) {
        throw new Error(`${fieldName} must not exceed ${maxLength} characters`)
    }
}

/**
 * Sanitize database query parameters
 * Note: Always use parameterized queries, this is additional protection
 */
export function sanitizeQueryParam(param: string): string {
    // Remove SQL keywords and dangerous characters
    return param
        .replace(/[;'"\\]/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '')
        .trim()
}
