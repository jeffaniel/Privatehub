import { supabase } from './supabase'
import { promiseWithTimeout } from './utils'

export interface StaffUser {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'moderator' | 'viewer'
  is_active: boolean
  created_at: string
}

// Check if user is authenticated using Supabase Auth
export async function getCurrentStaff(): Promise<StaffUser | null> {
  const isClient = typeof window !== 'undefined'

  if (isClient) console.log('🔍 [getCurrentStaff] 🚀 Starting auth check...')

  try {
    // 1. Check Supabase session with timeout
    if (isClient) console.log('🔍 [getCurrentStaff] ⏳ Fetching session...')
    let sessionResult: any = null
    try {
      sessionResult = await promiseWithTimeout(supabase.auth.getSession(), 5000, 'Session fetch')
      if (sessionResult.error) {
        if (isClient) console.error('❌ [getCurrentStaff] Session error:', sessionResult.error)
        return null
      }
    } catch (err) {
      if (isClient) console.warn('⚠️ [getCurrentStaff] Session fetch hang/error:', err)
      return null
    }

    const session = sessionResult.data.session
    if (!session) {
      if (isClient) console.log('ℹ️ [getCurrentStaff] No active session found')
      return null
    }

    if (isClient) console.log('✅ [getCurrentStaff] Session active:', session.user.email)

    // 2. Try to fetch profile from public.admins table with a timeout
    if (isClient) console.log('🔍 [getCurrentStaff] ⏳ Fetching DB profile for:', session.user.id)

    let adminProfile: any = null
    try {
      const dbResult = await promiseWithTimeout(
        supabase.from('admins').select('*').eq('id', session.user.id).single() as any,
        3000,
        'DB profile fetch'
      ) as any
      adminProfile = dbResult.data
      if (isClient && dbResult.error) {
        console.warn('⚠️ [getCurrentStaff] DB profile fetch error (falling back to session), result error:', dbResult.error)
      }
    } catch (raceError) {
      if (isClient) console.warn('⚠️ [getCurrentStaff] DB profile fetch hang/error (falling back to session), race error:', raceError)
    }

    // Return staff user, preferring DB profile over session metadata
    const staff: StaffUser = {
      id: session.user.id,
      email: session.user.email || '',
      full_name: adminProfile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Admin',
      role: (adminProfile?.role || session.user.user_metadata?.role || 'admin') as StaffUser['role'],
      is_active: adminProfile?.is_active ?? true,
      created_at: session.user.created_at
    }

    if (isClient) console.log('✅ [getCurrentStaff] Final staff state:', staff.email, '-', staff.role)
    return staff
  } catch (error) {
    if (isClient) console.error('❌ [getCurrentStaff] Critical unexpected error:', error)
    return null
  }
}

// Store session - now handled by Supabase Auth automatically
export function setStaffSession(staff: StaffUser): void {
  // Session is handled automatically by supabase-js
}

// Clear session
export function clearStaffSession(): void {
  // Sign out from Supabase
  supabase.auth.signOut()
}