/**
 * Centralized validation and sanitization utilities
 */

export const VALID_CATEGORIES = ["feedback", "complaint", "suggestion", "report", "praise", "other"]
export const VALID_STATUSES = ["open", "under_review", "implemented"]

/**
 * Strips HTML tags and trims strings
 */
export function sanitizeString(str: string, maxLength?: number): string {
    if (!str) return ""
    // Basic HTML strip
    const sanitized = str.replace(/<[^>]*>?/gm, "").trim()
    if (maxLength) {
        return sanitized.slice(0, maxLength)
    }
    return sanitized
}

/**
 * Validates category strings against whitelist
 */
export function isValidCategory(category: string): boolean {
    return VALID_CATEGORIES.includes(category)
}

/**
 * Validates status strings against whitelist
 */
export function isValidStatus(status: string): boolean {
    return VALID_STATUSES.includes(status)
}

/**
 * Enforces minimum length requirements
 */
export function hasMinLength(str: string, min: number): boolean {
    return str.trim().length >= min
}
