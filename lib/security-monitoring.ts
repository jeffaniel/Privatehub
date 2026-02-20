/**
 * Security Monitoring Utility
 * Detects suspicious activity and triggers alerts
 */

import { createSecurityAlert } from './audit-enhanced'

export interface SecurityEvent {
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    metadata?: Record<string, any>
    adminId?: string
}

/**
 * Detect suspicious login patterns
 */
export async function detectSuspiciousLogin(
    email: string,
    ipAddress: string,
    userAgent: string,
    previousLogins: Array<{ ip_address: string; user_agent: string; created_at: string }> = []
): Promise<SecurityEvent | null> {
    // Check for login from new location
    const knownIPs = previousLogins.map(l => l.ip_address)
    if (!knownIPs.includes(ipAddress) && previousLogins.length > 0) {
        return {
            type: 'new_location_login',
            severity: 'medium',
            description: `Login from new IP address: ${ipAddress}`,
            metadata: { email, ipAddress, userAgent }
        }
    }

    // Check for rapid login attempts from different IPs
    const recentLogins = previousLogins.filter(l => {
        const loginTime = new Date(l.created_at).getTime()
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
        return loginTime > fiveMinutesAgo
    })

    const uniqueIPs = new Set(recentLogins.map(l => l.ip_address))
    if (uniqueIPs.size > 3) {
        return {
            type: 'multiple_ip_login',
            severity: 'high',
            description: `Login attempts from ${uniqueIPs.size} different IPs in 5 minutes`,
            metadata: { email, ips: Array.from(uniqueIPs) }
        }
    }

    // Check for unusual time (e.g., 2-5 AM local time)
    const hour = new Date().getHours()
    if (hour >= 2 && hour <= 5) {
        return {
            type: 'unusual_time_login',
            severity: 'low',
            description: `Login at unusual hour: ${hour}:00`,
            metadata: { email, hour }
        }
    }

    return null
}

/**
 * Detect unusual data access patterns
 */
export function detectUnusualDataAccess(
    adminId: string,
    action: string,
    resourceCount: number,
    timeWindowMinutes: number = 5
): SecurityEvent | null {
    // Detect bulk data export
    if (action === 'export_data' && resourceCount > 100) {
        return {
            type: 'bulk_data_export',
            severity: 'high',
            description: `Admin exported ${resourceCount} records`,
            metadata: { adminId, resourceCount },
            adminId
        }
    }

    // Detect rapid viewing of many submissions
    if (action === 'view_submission' && resourceCount > 50) {
        return {
            type: 'rapid_data_access',
            severity: 'medium',
            description: `Admin viewed ${resourceCount} submissions in ${timeWindowMinutes} minutes`,
            metadata: { adminId, resourceCount, timeWindowMinutes },
            adminId
        }
    }

    // Detect mass deletion
    if (action === 'delete_submission' && resourceCount > 10) {
        return {
            type: 'mass_deletion',
            severity: 'critical',
            description: `Admin deleted ${resourceCount} submissions`,
            metadata: { adminId, resourceCount },
            adminId
        }
    }

    return null
}

/**
 * Detect privilege escalation attempts
 */
export function detectPrivilegeEscalation(
    adminId: string,
    currentRole: string,
    attemptedAction: string,
    requiredRole: string
): SecurityEvent | null {
    if (currentRole !== requiredRole) {
        return {
            type: 'privilege_escalation_attempt',
            severity: 'critical',
            description: `Admin with role '${currentRole}' attempted action requiring '${requiredRole}'`,
            metadata: { adminId, currentRole, attemptedAction, requiredRole },
            adminId
        }
    }

    return null
}

/**
 * Monitor for brute force attacks
 */
export function detectBruteForce(
    failedAttempts: number,
    timeWindowMinutes: number = 15
): SecurityEvent | null {
    if (failedAttempts >= 5) {
        return {
            type: 'brute_force_attempt',
            severity: 'high',
            description: `${failedAttempts} failed login attempts in ${timeWindowMinutes} minutes`,
            metadata: { failedAttempts, timeWindowMinutes }
        }
    }

    return null
}

/**
 * Detect SQL injection attempts in input
 */
export function detectSQLInjection(input: string): SecurityEvent | null {
    const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(UNION\s+SELECT)/i,
        /(--|\#|\/\*)/,
        /('|")\s*(OR|AND)\s*('|")/i,
        /(\bOR\b\s+\d+\s*=\s*\d+)/i
    ]

    for (const pattern of sqlPatterns) {
        if (pattern.test(input)) {
            return {
                type: 'sql_injection_attempt',
                severity: 'critical',
                description: 'Potential SQL injection detected in user input',
                metadata: { input: input.substring(0, 100) } // Only log first 100 chars
            }
        }
    }

    return null
}

/**
 * Detect XSS attempts in input
 */
export function detectXSS(input: string): SecurityEvent | null {
    const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=\s*["'][^"']*["']/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi
    ]

    for (const pattern of xssPatterns) {
        if (pattern.test(input)) {
            return {
                type: 'xss_attempt',
                severity: 'high',
                description: 'Potential XSS attack detected in user input',
                metadata: { input: input.substring(0, 100) }
            }
        }
    }

    return null
}

/**
 * Process security event and create alert if needed
 */
export async function processSecurityEvent(event: SecurityEvent): Promise<void> {
    // Log to console
    console.warn(`[SECURITY] ${event.severity.toUpperCase()}: ${event.description}`, event.metadata)

    // Create alert for medium+ severity
    if (event.severity !== 'low') {
        await createSecurityAlert(
            event.type,
            event.description,
            event.severity,
            event.adminId,
            event.metadata
        )
    }

    // In production, you would also:
    // - Send email/SMS alerts for critical events
    // - Trigger automated responses (e.g., temporary IP ban)
    // - Log to external monitoring service (Sentry, DataDog, etc.)
}

/**
 * Calculate risk score for a user session
 */
export function calculateRiskScore(factors: {
    newIP: boolean
    newDevice: boolean
    unusualTime: boolean
    failedAttempts: number
    vpnDetected: boolean
    torDetected: boolean
}): number {
    let score = 0

    if (factors.newIP) score += 2
    if (factors.newDevice) score += 2
    if (factors.unusualTime) score += 1
    if (factors.failedAttempts > 0) score += factors.failedAttempts * 2
    if (factors.vpnDetected) score += 1
    if (factors.torDetected) score += 3

    return Math.min(score, 10) // Cap at 10
}
