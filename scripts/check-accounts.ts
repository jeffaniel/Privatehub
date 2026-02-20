import { createClient } from '@supabase/supabase-js'

// Hardcoded for quick check as standalone script
const supabaseUrl = 'https://qajbticeqivhbvakmsby.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamJ0aWNlcWl2aGJ2YWttc2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc2NjYsImV4cCI6MjA4NDM5MzY2Nn0.PyLVLW_k3-wahT17Ngjj7JEy_OGDs9UrUyKzMamqlsQ'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAdmins() {
    console.log('🔍 Checking for existing admin accounts...')

    try {
        // Try to count admins in the public.admins table
        const { data, error } = await supabase
            .from('admins')
            .select('*')

        if (error) {
            console.error('❌ Error querying admins table:', error.message)
            if (error.message.includes('permission denied')) {
                console.log('ℹ️ RLS is active. Only authenticated admins can see this table.')
            }
            return
        }

        if (data && data.length > 0) {
            console.log(`✅ Found ${data.length} admin(s):`)
            data.forEach((admin: any) => {
                console.log(`  - ${admin.email} (Role: ${admin.role}, Active: ${admin.is_active})`)
            })
        } else {
            console.log('ℹ️ No admin accounts found in the public.admins table.')
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err)
    }
}

checkAdmins()
