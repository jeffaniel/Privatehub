/**
 * Anonymization Utilities
 * Ensures user submissions remain truly anonymous
 */

/**
 * Remove all potentially identifying metadata from submission
 */
export function sanitizeSubmissionMetadata(data: any): any {
    // Remove any fields that could identify the user
    const sanitized = { ...data }

    // Remove identifying fields
    delete sanitized.ip_address
    delete sanitized.user_agent
    delete sanitized.device_fingerprint
    delete sanitized.session_id
    delete sanitized.user_id
    delete sanitized.browser_fingerprint

    return sanitized
}

/**
 * Generate a truly random tracking code
 * Uses crypto.randomBytes for cryptographic randomness
 */
export function generateAnonymousTrackingCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous characters
    const length = 12
    let code = ''

    // Use crypto for better randomness
    if (typeof window !== 'undefined' && window.crypto) {
        const array = new Uint8Array(length)
        window.crypto.getRandomValues(array)
        for (let i = 0; i < length; i++) {
            code += chars[array[i] % chars.length]
        }
    } else {
        // Fallback for server-side
        const crypto = require('crypto')
        const bytes = crypto.randomBytes(length)
        for (let i = 0; i < length; i++) {
            code += chars[bytes[i] % chars.length]
        }
    }

    return code
}

/**
 * Hash sensitive data for comparison without storing plaintext
 */
export async function hashSensitiveData(data: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder()
        const dataBuffer = encoder.encode(data)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
        // Server-side fallback
        const crypto = require('crypto')
        return crypto.createHash('sha256').update(data).digest('hex')
    }
}

/**
 * Prevent timing attacks by using constant-time comparison
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
}

/**
 * Remove metadata from user-agent string
 * Keeps only browser type, not version or OS details
 */
export function anonymizeUserAgent(userAgent: string): string {
    if (!userAgent) return 'Unknown'

    // Extract only the browser name
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    if (userAgent.includes('Opera')) return 'Opera'

    return 'Other'
}

/**
 * Check if request is from Tor network
 * Returns true if likely from Tor (for special handling)
 */
export function isTorRequest(headers: Headers): boolean {
    // Check for common Tor exit node indicators
    const userAgent = headers.get('user-agent') || ''
    const via = headers.get('via') || ''

    return userAgent.toLowerCase().includes('tor') ||
        via.toLowerCase().includes('tor')
}

/**
 * Prevent correlation through writing style analysis
 * This is a placeholder - real implementation would use NLP
 */
export function detectWritingStyleFingerprint(text: string): {
    riskLevel: 'low' | 'medium' | 'high'
    suggestions: string[]
} {
    const suggestions: string[] = []
    let riskLevel: 'low' | 'medium' | 'high' = 'low'

    // Check for very unique patterns
    const uniquePhrases = text.match(/\b(\w+\s+){10,}\b/g) || []
    if (uniquePhrases.length > 3) {
        riskLevel = 'medium'
        suggestions.push('Consider rephrasing long unique sentences')
    }

    // Check for excessive punctuation patterns
    const punctuationDensity = (text.match(/[!?;:]/g) || []).length / text.length
    if (punctuationDensity > 0.05) {
        riskLevel = 'medium'
        suggestions.push('Unusual punctuation patterns detected')
    }

    // Check for very short or very long messages
    if (text.length < 50) {
        suggestions.push('Very short messages may be easier to correlate')
    } else if (text.length > 2000) {
        riskLevel = 'high'
        suggestions.push('Very long messages may contain identifying patterns')
    }

    return { riskLevel, suggestions }
}
