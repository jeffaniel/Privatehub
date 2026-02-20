import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  // Safety check: only allow in development or with a secret token
  if (process.env.NODE_ENV === 'production' && 
      request.headers.get('x-setup-token') !== process.env.SETUP_TOKEN) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    )
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return (cookies as any).get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            ;(cookies as any).set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            ;(cookies as any).set({ name, value: '', ...options })
          },
        },
      }
    )

    // Check if any admins exist
    const { data: existingAdmins, error: checkError } = await supabase
      .from('admins')
      .select('id')
      .limit(1)

    if (checkError) throw checkError

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        { error: 'Admin account already exists' }, 
        { status: 400 }
      )
    }

    // Create invitation code for first admin
    const { data: inviteCode, error: inviteError } = await supabase
      .from('invitation_codes')
      .insert([
        {
          code: 'FIRST-ADMIN-SETUP',
          created_by: 'system',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        }
      ])
      .select()

    if (inviteError) throw inviteError

    return NextResponse.json({
      message: 'Setup complete! Use this invitation code to sign up:',
      invitationCode: 'FIRST-ADMIN-SETUP',
      expiresIn: '24 hours',
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Setup failed' }, 
      { status: 500 }
    )
  }
}
