import { createClient } from "@/lib/server-client"
import { headers } from "next/headers"

interface LogEntry {
    action: string
    entity: string
    entityId?: string
    details?: Record<string, any>
}

export async function logAction(entry: LogEntry) {
    try {
        const supabase = await createClient()

        // Get user from session
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return // Can't log if not authenticated (or handle anonym logs if needed)

        // Get IP
        const headersList = await headers()
        const ip = headersList.get("x-received-from") || headersList.get("x-real-ip") || headersList.get("x-forwarded-for") || "unknown"

        const { error } = await supabase.from("audit_logs").insert({
            user_id: user.id,
            action: entry.action,
            entity: entry.entity,
            entity_id: entry.entityId,
            details: entry.details,
            ip_address: ip,
        })

        if (error) {
            console.error("Failed to write audit log:", error)
        }
    } catch (err) {
        console.error("Audit log error:", err)
    }
}
