/**
 * Password Security Utilities
 * Enforces strong password policies for admin accounts
 */

export interface PasswordStrength {
    score: number // 0-4
    feedback: string[]
    isStrong: boolean
}

/**
 * Validate password strength
 * Requires minimum 16 characters with complexity
 */
export function validatePasswordStrength(password: string): PasswordStrength {
    const feedback: string[] = []
    let score = 0

    // Minimum length check (16+ characters for admin accounts)
    if (password.length < 16) {
        feedback.push('Password must be at least 16 characters long')
    } else if (password.length >= 16) {
        score++
    }

    if (password.length >= 20) {
        score++
    }

    // Complexity checks
    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumbers = /[0-9]/.test(password)
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

    if (!hasUppercase) feedback.push('Add uppercase letters')
    if (!hasLowercase) feedback.push('Add lowercase letters')
    if (!hasNumbers) feedback.push('Add numbers')
    if (!hasSpecialChars) feedback.push('Add special characters (!@#$%^&* etc.)')

    const complexityCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars].filter(Boolean).length
    if (complexityCount >= 3) score++
    if (complexityCount === 4) score++

    // Check for common patterns
    const commonPatterns = [
        /^password/i,
        /^admin/i,
        /^123456/,
        /^qwerty/i,
        /(.)\1{2,}/, // Repeated characters
    ]

    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            feedback.push('Avoid common patterns and repeated characters')
            score = Math.max(0, score - 1)
            break
        }
    }

    // Check for sequential characters
    if (/abc|bcd|cde|123|234|345/i.test(password)) {
        feedback.push('Avoid sequential characters')
        score = Math.max(0, score - 1)
    }

    const isStrong = score >= 3 && password.length >= 16 && complexityCount >= 3

    if (isStrong) {
        feedback.push('✓ Strong password')
    }

    return {
        score,
        feedback,
        isStrong
    }
}

/**
 * Check if password has been compromised in known breaches
 * This would integrate with Have I Been Pwned API in production
 */
export async function checkPasswordBreach(password: string): Promise<boolean> {
    try {
        // Hash the password using SHA-1 (HIBP uses SHA-1)
        const encoder = new TextEncoder()
        const data = encoder.encode(password)

        let hashHex: string
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            const hashBuffer = await window.crypto.subtle.digest('SHA-1', data)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        } else {
            // Server-side
            const crypto = require('crypto')
            hashHex = crypto.createHash('sha1').update(password).digest('hex')
        }

        const prefix = hashHex.substring(0, 5).toUpperCase()
        const suffix = hashHex.substring(5).toUpperCase()

        // In production, call HIBP API
        // const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
        // const text = await response.text()
        // return text.includes(suffix)

        // For now, return false (not breached)
        return false
    } catch (error) {
        console.error('Error checking password breach:', error)
        return false
    }
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 20): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lowercase = 'abcdefghijkmnopqrstuvwxyz'
    const numbers = '23456789'
    const special = '!@#$%^&*()-_=+[]{}|;:,.<>?'

    const allChars = uppercase + lowercase + numbers + special
    let password = ''

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Generate recovery codes for MFA
 */
export function generateRecoveryCodes(count: number = 10): string[] {
    const codes: string[] = []

    for (let i = 0; i < count; i++) {
        const code = Array.from({ length: 8 }, () =>
            Math.floor(Math.random() * 10)
        ).join('')

        // Format as XXXX-XXXX
        codes.push(`${code.substring(0, 4)}-${code.substring(4)}`)
    }

    return codes
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Check password age and recommend rotation
 */
export function shouldRotatePassword(lastChangedDate: Date, maxAgeDays: number = 90): boolean {
    const daysSinceChange = (Date.now() - lastChangedDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceChange >= maxAgeDays
}
