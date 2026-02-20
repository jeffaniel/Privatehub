import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Hardcoded credentials for standalone script
const supabaseUrl = 'https://qajbticeqivhbvakmsby.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamJ0aWNlcWl2aGJ2YWttc2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc2NjYsImV4cCI6MjA4NDM5MzY2Nn0.PyLVLW_k3-wahT17Ngjj7JEy_OGDs9UrUyKzMamqlsQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Generate a cryptographically secure invitation code
function generateSecureCode(): string {
    const bytes = crypto.randomBytes(12)
    const base62 = bytes.toString('base64')
        .replace(/\+/g, '')
        .replace(/\//g, '')
        .replace(/=/g, '')
        .substring(0, 16)
        .toUpperCase()

    // Format as XXXX-XXXX-XXXX-XXXX
    return `${base62.slice(0, 4)}-${base62.slice(4, 8)}-${base62.slice(8, 12)}-${base62.slice(12, 16)}`
}

async function createInvitationCode() {
    console.log('🎫 Creating a secure invitation code...\n')

    try {
        const code = generateSecureCode()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

        console.log('Generated Code:', code)
        console.log('Expires:', expiresAt.toISOString())
        console.log('\n⚠️ IMPORTANT: Save this code securely!')
        console.log('─'.repeat(50))
        console.log(`Invitation Code: ${code}`)
        console.log('─'.repeat(50))

        // Try to insert the code
        const { data, error } = await supabase
            .from('invitation_codes')
            .insert({
                code: code,
                expires_at: expiresAt.toISOString(),
                max_uses: 1,
                notes: 'First admin account invitation code'
            })
            .select()

        if (error) {
            console.error('\n❌ Error creating invitation code:', error.message)
            if (error.message.includes('permission denied') || error.message.includes('JWT')) {
                console.log('\n💡 TIP: This is expected for the first admin.')
                console.log('Instead, you can:')
                console.log('1. Sign up without an invitation code (first admin bypass)')
                console.log('2. OR run this SQL directly in Supabase SQL Editor:')
                console.log(`\nINSERT INTO public.invitation_codes (code, expires_at, max_uses, notes)`)
                console.log(`VALUES ('${code}', '${expiresAt.toISOString()}', 1, 'First admin invitation');`)
            }
        } else {
            console.log('\n✅ Invitation code created successfully!')
            console.log('You can now use this code to create an admin account.')
        }

    } catch (err) {
        console.error('\n❌ Unexpected error:', err)
    }
}

createInvitationCode()
