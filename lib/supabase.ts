import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a single supabase client for use across the client-side
// createBrowserClient is designed to handle cookie-based sessions for SSR
// This ensures that the client-side session is in sync with the middleware cookies
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)