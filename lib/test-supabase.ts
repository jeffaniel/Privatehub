import { supabase } from './supabase'

export async function testSupabaseConnection() {
    console.log('🔍 Testing Supabase Connection...')

    try {
        // Test 1: Check environment variables
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        console.log('✅ Environment Variables Check:')
        console.log('  URL configured:', !!url)
        console.log('  Key configured:', !!key)

        if (!url || !key) {
            console.error('❌ Missing environment variables!')
            return false
        }

        // Test 2: Try to fetch from Supabase
        console.log('🔄 Testing database connection...')
        const { data, error } = await supabase
            .from('submissions')
            .select('count')
            .limit(1)

        if (error) {
            console.error('❌ Database query failed:', error.message)
            return false
        }

        console.log('✅ Database connection successful!')

        // Test 3: Test auth
        console.log('🔄 Testing auth service...')
        const { data: session } = await supabase.auth.getSession()
        console.log('✅ Auth service accessible')

        return true
    } catch (error) {
        console.error('❌ Connection test failed:', error)
        return false
    }
}
