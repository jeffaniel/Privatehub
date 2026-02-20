/**
 * Audit Logging Utility
 * Tracks all admin actions for security and compliance
 */

import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-admin'

export type AuditAction =
    | 'login'
    | 'logout'
    | 'login_failed'
    | 'view_submission'
    | 'update_submission'
    | 'delete_submission'
    | 'export_data'
    | 'create_admin'
    | 'update_admin'
    | 'delete_admin'
    | 'update_settings'
    | 'resolve_alert'
    | 'unlock_account'

export type AuditStatus = 'success' | 'failure' | 'suspicious'

export interface AuditLogEntry {
    admin_id?: string
    admin_email: string
    action: AuditAction
    resource_type?: string
    resource_id?: string
    details?: Record<string, any>
    ip_address?: string
    user_agent?: string
    status?: AuditStatus
}

/**
 * Log an admin action to the audit trail
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
        // Use admin client if available (server-side), otherwise falls back to standard client
        const client = supabaseAdmin || supabase

        const { error } = await client
            .from('audit_logs')
            .insert({
                admin_id: entry.admin_id || null,
                admin_email: entry.admin_email,
                action: entry.action,
                resource_type: entry.resource_type || null,
                resource_id: entry.resource_id || null,
                details: entry.details || null,
                ip_address: entry.ip_address ? anonymizeIP(entry.ip_address) : null,
                user_agent: entry.user_agent || null,
                status: entry.status || 'success',
            })

        if (error) {
            console.error('Failed to log audit event:', error)
        }
    } catch (error) {
        console.error('Error logging audit event:', error)
    }
}

/**
 * Log a login attempt (success or failure)
 */
export async function logLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string
): Promise<void> {
    try {
        const client = supabaseAdmin || supabase

        const { error } = await client
            .from('login_attempts')
            .insert({
                email,
                success,
                ip_address: ipAddress ? anonymizeIP(ipAddress) : null,
                user_agent: userAgent || null,
                failure_reason: failureReason || null,
            })

        if (error) {
            console.error('Failed to log login attempt:', error)
        }

        // Also log to audit trail
        await logAuditEvent({
            admin_email: email,
            action: success ? 'login' : 'login_failed',
            status: success ? 'success' : 'failure',
            ip_address: ipAddress,
            user_agent: userAgent,
            details: failureReason ? { reason: failureReason } : undefined,
        })
    } catch (error) {
        console.error('Error logging login attempt:', error)
    }
}

/**
 * Check if an account is currently locked
 */
export async function isAccountLocked(email: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .rpc('is_account_locked', { p_email: email })

        if (error) {
            console.error('Error checking account lock status:', error)
            return false
        }

        return data || false
    } catch (error) {
        console.error('Error checking account lock:', error)
        return false
    }
}

/**
 * Create a security alert
 */
export async function createSecurityAlert(
    alertType: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    adminId?: string,
    metadata?: Record<string, any>
): Promise<void> {
    try {
        const { error } = await supabase
            .from('security_alerts')
            .insert({
                alert_type: alertType,
                severity,
                admin_id: adminId || null,
                description,
                metadata: metadata || null,
            })

        if (error) {
            console.error('Failed to create security alert:', error)
        }
    } catch (error) {
        console.error('Error creating security alert:', error)
    }
}

/**
 * Get recent failed login attempts for an email
 */
export async function getRecentFailedAttempts(
    email: string,
    minutesAgo: number = 15
): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('login_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('email', email)
            .eq('success', false)
            .gte('created_at', new Date(Date.now() - minutesAgo * 60 * 1000).toISOString())

        if (error) {
            console.error('Error getting failed attempts:', error)
            return 0
        }

        return count || 0
    } catch (error) {
        console.error('Error getting failed attempts:', error)
        return 0
    }
}

/**
 * Anonymize IP address for privacy
 * Keeps first 3 octets for IPv4, first 4 groups for IPv6
 */
export function anonymizeIP(ip: string): string {
    if (!ip) return ''

    // IPv4
    if (ip.includes('.')) {
        const parts = ip.split('.')
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.0`
        }
    }

    // IPv6
    if (ip.includes(':')) {
        const parts = ip.split(':')
        if (parts.length >= 4) {
            return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::`
        }
    }

    return ip
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(filters?: {
    adminId?: string
    action?: AuditAction
    startDate?: Date
    endDate?: Date
    limit?: number
}) {
    try {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })

        if (filters?.adminId) {
            query = query.eq('admin_id', filters.adminId)
        }

        if (filters?.action) {
            query = query.eq('action', filters.action)
        }

        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate.toISOString())
        }

        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate.toISOString())
        }

        if (filters?.limit) {
            query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching audit logs:', error)
            return []
        }

        return data || []
    } catch (error) {
        console.error('Error fetching audit logs:', error)
        return []
    }
}
