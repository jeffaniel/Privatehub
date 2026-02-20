import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a simple Supabase client for server actions
 * This bypasses the SSR client which has issues in some environments
 */
export function createActionClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.error("SERVER ERROR: Missing Supabase Environment Variables")
        console.error(`- URL: ${url ? "Found" : "Missing"}`)
        console.error(`- KEY: ${key ? "Found" : "Missing"}`)
        throw new Error("Supabase configuration missing on server")
    }

    return createSupabaseClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    })
}
