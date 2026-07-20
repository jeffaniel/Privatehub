/**
 * MFA Utility Library
 * Handles TOTP generation, verification, and QR code generation
 */

import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import { supabase } from './supabase'

/**
 * Generate a new TOTP secret for an admin
 */
export function generateMfaSecret(): string {
    return generateSecret()
}

/**
 * Generate a QR code URL for the TOTP secret
 */
export async function generateMfaQrCode(email: string, secret: string, issuer: string = 'Lincoln Student Union Voice'): Promise<string> {
    const otpauth = generateURI({
        issuer,
        label: email,
        secret,
        strategy: 'totp'
    })
    return await QRCode.toDataURL(otpauth)
}

/**
 * Verify a TOTP token against a secret
 */
export function verifyMfaToken(token: string, secret: string): boolean {
    try {
        const result = verifySync({
            token,
            secret,
            strategy: 'totp'
        })
        // verifySync returns a VerifyResult discriminated union with a 'valid' property
        return result.valid
    } catch (error) {
        console.error('MFA Verification Error:', error)
        return false
    }
}

/**
 * Check if an admin has MFA enabled
 */
export async function isMfaEnabled(adminId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('admin_mfa')
            .select('is_enabled')
            .eq('admin_id', adminId)
            .single()

        if (error || !data) return false
        return data.is_enabled
    } catch (error) {
        console.error('Error checking MFA status:', error)
        return false
    }
}

/**
 * Get the MFA secret for an admin
 */
export async function getMfaSecret(adminId: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('admin_mfa')
            .select('secret_key')
            .eq('admin_id', adminId)
            .single()

        if (error || !data) return null
        return data.secret_key
    } catch (error) {
        console.error('Error fetching MFA secret:', error)
        return null
    }
}

/**
 * Enable MFA for an admin
 */
export async function enableMfa(adminId: string, secret: string, recoveryCodes: string[]): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('admin_mfa')
            .upsert({
                admin_id: adminId,
                secret_key: secret,
                is_enabled: true,
                recovery_codes: recoveryCodes,
                updated_at: new Date().toISOString()
            })

        return !error
    } catch (error) {
        console.error('Error enabling MFA:', error)
        return false
    }
}

/**
 * Disable MFA for an admin
 */
export async function disableMfa(adminId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('admin_mfa')
            .update({ is_enabled: false })
            .eq('admin_id', adminId)

        return !error
    } catch (error) {
        console.error('Error disabling MFA:', error)
        return false
    }
}
