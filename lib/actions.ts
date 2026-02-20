"use server"

import { createActionClient } from "./action-client"
import { createServerClient } from "@supabase/ssr"
import { headers, cookies } from "next/headers"
import { redirect } from "next/navigation"
import { logLoginAttempt, logAuditEvent, createSecurityAlert } from "./audit-enhanced"
import { validatePasswordStrength } from "./password-security"
import { detectSuspiciousLogin, processSecurityEvent } from "./security-monitoring"
import { isMfaEnabled, verifyMfaToken, getMfaSecret } from "./mfa"

export async function adminSignUp(formData: FormData) {
    try {
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const confirmPassword = formData.get("confirmPassword") as string
        const adminCode = formData.get("adminCode") as string

        if (password !== confirmPassword) {
            return { error: "Passwords do not match" }
        }

        // Validate password strength
        const strength = validatePasswordStrength(password)
        if (!strength.isStrong) {
            return { error: `Weak password: ${strength.feedback.join(", ")}` }
        }

        const supabase = createActionClient()
        const headersList = await headers()
        const origin = headersList.get("origin") || ""
        const ip = headersList.get("x-forwarded-for") || "unknown"
        const userAgent = headersList.get("user-agent") || undefined

        // INVITATION CODE VALIDATION
        // Step 1: Check if any admins exist
        const { count: adminCount, error: countError } = await supabase
            .from('admins')
            .select('*', { count: 'exact', head: true })

        if (countError) {
            console.error("Error checking admin count:", countError)
            return { error: "Failed to validate invitation code. Please try again." }
        }

        // Step 2: Validate invitation code (skip for first admin)
        if (adminCount && adminCount > 0) {
            // Not the first admin - validation required
            if (!adminCode || adminCode.trim() === '') {
                return { error: "An invitation code is required to create an admin account." }
            }

            const masterCode = process.env.MASTER_INVITATION_CODE
            let isValidCode = false

            // Check against master code
            if (masterCode && adminCode === masterCode) {
                isValidCode = true
                console.log("✓ Valid master invitation code used")
            } else {
                // Check against database codes using the validation function
                const { data: validationResult, error: validationError } = await supabase
                    .rpc('validate_invitation_code', { p_code: adminCode })

                if (validationError) {
                    console.error("Error validating invitation code:", validationError)
                    return { error: "Failed to validate invitation code." }
                }

                if (validationResult === true) {
                    isValidCode = true
                    console.log("✓ Valid database invitation code used")
                }
            }

            if (!isValidCode) {
                return { error: "Invalid or expired invitation code. Please contact an administrator." }
            }
        } else {
            // First admin - no code required
            console.log("✓ First admin signup - bypassing invitation code validation")
        }

        // DEBUG: Inspect what Supabase is actually returning
        const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        if (sbUrl) {
            console.log("DEBUG: Testing connection to", sbUrl)
            try {
                const healthCheck = await fetch(`${sbUrl}/auth/v1/health`, { method: 'GET' })
                const contentType = healthCheck.headers.get('content-type')
                const text = await healthCheck.text()
                console.log("DEBUG: Health Check Status:", healthCheck.status)
                console.log("DEBUG: Health Check Content-Type:", contentType)
                console.log("DEBUG: Health Check Response (first 500 chars):", text.substring(0, 500))

                if (contentType && contentType.includes('html')) {
                    console.error("⚠️ WARNING: Supabase is returning HTML instead of JSON!")
                    console.error("This usually means the project is PAUSED or there's a network issue.")
                }
            } catch (e) {
                console.error("DEBUG: Health Check FAILED:", e)
            }
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    is_admin: true,
                    role: 'admin' // Explicitly set role for our triggers
                },
                // Redirect to the same page or a callback page if you have one
                // For now, let's just let it handle verification
                emailRedirectTo: `${origin}/staff-portal/login`,
            },
        })

        if (error) {
            console.error("Server Action SignUp Error:", error)
            console.error("Error details:", JSON.stringify(error, null, 2))

            // Specific check for the HTML response error
            if (error.message.includes("Unexpected token") || error.message.includes("JSON")) {
                // Try to fetch the actual response to see what HTML is being returned
                try {
                    const debugResponse = await fetch(`${sbUrl}/auth/v1/signup`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
                        }
                    })
                    const debugText = await debugResponse.text()
                    console.error("DEBUG: Actual response from signup endpoint (first 1000 chars):")
                    console.error(debugText.substring(0, 1000))
                } catch (debugError) {
                    console.error("DEBUG: Failed to fetch debug response:", debugError)
                }

                return { error: "CONNECTION FAILED: The Supabase URL is returning an HTML error page. Your project might be PAUSED or the URL is incorrect. Check the server logs for details." }
            }
            return { error: error.message }
        }

        if (data.user) {
            await logAuditEvent({
                admin_id: data.user.id,
                admin_email: email,
                action: 'create_admin',
                status: 'success',
                ip_address: ip,
                user_agent: userAgent,
                details: { role: 'admin' }
            })
        }

        return { success: true, message: "Account created! Check your email." }
    } catch (err: any) {
        console.error("Unexpected SignUp Error:", err)
        // Catch-all for the syntax error from JSON.parse if it bubbles up
        if (err.message && (err.message.includes("Unexpected token") || err.message.includes("JSON"))) {
            return { error: "CONNECTION FAILED: The Supabase URL is strictly returning HTML. Please check if your project is ACTIVE in the Supabase Dashboard." }
        }
        return { error: "An unexpected error occurred on the server." }
    }
}

export async function adminSignIn(formData: FormData) {
    try {
        const email = formData.get("email") as string
        const password = formData.get("password") as string

        const supabase = createActionClient()
        const headersList = await headers()
        const ip = headersList.get("x-forwarded-for") || "unknown"
        const userAgent = headersList.get("user-agent") || undefined

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error("Server Action SignIn Error:", error)
            await logLoginAttempt(email, false, ip, userAgent, error.message)
            return { error: error.message }
        }

        // Log successful login
        await logLoginAttempt(email, true, ip, userAgent)

        // Check for suspicious login (placeholder for real check)
        // In a real app, you'd fetch previous logins here
        const suspiciousEvent = await detectSuspiciousLogin(email, ip, userAgent || "", [])
        if (suspiciousEvent) {
            await processSecurityEvent(suspiciousEvent)
        }

        // Reset session tracking cookies on successful login
        const cookieStore = await cookies()
        const now = Date.now().toString()
        cookieStore.set('session_start', now, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' })
        cookieStore.set('last_activity', now, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' })

        // Manually set Supabase auth cookies using createServerClient
        // This ensures middleware can see the session
        if (data.session) {
            const supabaseServer = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() { return cookieStore.getAll() },
                        setAll(cookiesToSet) {
                            try {
                                cookiesToSet.forEach(({ name, value, options }) => {
                                    cookieStore.set(name, value, options)
                                })
                            } catch (e) {
                                // Ignore errors if already in response phase
                            }
                        }
                    }
                }
            )
            // Just set the session (should not trigger network request if both tokens provided)
            await supabaseServer.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
            })
        }
    } catch (err) {
        console.error("Unexpected SignIn Error:", err)
        return { error: "An unexpected error occurred on the server." }
    }

    // Redirect must happen outside try/catch (it throws a NEXT_REDIRECT error)
    redirect("/staff-portal/dashboard")
}

export async function verifyMfa(formData: FormData) {
    try {
        const userId = formData.get("userId") as string
        const email = formData.get("email") as string
        const code = formData.get("code") as string

        if (!userId || !code) {
            return { error: "Missing required information" }
        }

        const secret = await getMfaSecret(userId)
        if (!secret) {
            return { error: "MFA not properly configured for this account" }
        }

        const isValid = verifyMfaToken(code, secret)
        if (!isValid) {
            const headersList = await headers()
            const ip = headersList.get("x-forwarded-for") || "unknown"
            const userAgent = headersList.get("user-agent") || undefined
            await logLoginAttempt(email, false, ip, userAgent, "Invalid MFA token")
            return { error: "Invalid verification code" }
        }

        // MFA verification successful
        const headersList = await headers()
        const ip = headersList.get("x-forwarded-for") || "unknown"
        const userAgent = headersList.get("user-agent") || undefined

        await logLoginAttempt(email, true, ip, userAgent)

        // Reset session tracking cookies
        const cookieStore = await cookies()
        const now = Date.now().toString()
        cookieStore.set('session_start', now, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' })
        cookieStore.set('last_activity', now, { path: '/', httpOnly: true, secure: true, sameSite: 'lax' })

    } catch (err) {
        console.error("Unexpected MFA Error:", err)
        return { error: "An unexpected error occurred during verification" }
    }

    redirect("/staff-portal/dashboard")
}
