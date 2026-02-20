const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read credentials
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
// Need service role key to check triggers on auth schema
const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';

if (!serviceKeyMatch) {
    console.log('❌ SERVICE ROLE key not found in .env');
    console.log('Cannot verify triggers without service role key.');
    console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.');
    process.exit(1);
}

const serviceKey = serviceKeyMatch[1].trim();
const supabase = createClient(supabaseUrl, serviceKey);

async function checkTriggers() {
    console.log('=== Checking Database Triggers ===\n');

    try {
        // 1. Check if admins table exists
        const { error: tableError } = await supabase
            .from('admins')
            .select('count')
            .limit(1);

        if (tableError) {
            console.log('❌ Admins table access error:', tableError.message);
        } else {
            console.log('✅ Admins table exists and is accessible');
        }

        // 2. Check if the function exists (needs SQL injection via postgres function if enabled, or just inferred)
        // Since we can't easily check internal postgres schema via API without specific functions,
        // we'll try to trigger it by creating a test user.

        console.log('\n=== Testing Trigger with New User ===');
        const testEmail = `trigger-test-${Date.now()}@example.com`;
        console.log(`Creating test user: ${testEmail}`);

        const { data: user, error: createError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: 'password123',
            user_metadata: { is_admin: true, role: 'admin' },
            email_confirm: true
        });

        if (createError) {
            console.error('❌ Error creating test user:', createError.message);
            return;
        }

        console.log('✅ Test user created in Auth');

        // Wait for trigger
        console.log('⏳ Waiting 2 seconds for trigger to fire...');
        await new Promise(r => setTimeout(r, 2000));

        // Check admins table
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('email', testEmail)
            .single();

        if (admin) {
            console.log('✅ SUCCESS! Trigger worked. Admin record created:');
            console.log(admin);

            // Clean up
            await supabase.auth.admin.deleteUser(user.user.id);
            console.log('🧹 Test user deleted');
        } else {
            console.log('❌ FAILURE: Admin record was NOT created.');
            console.log('Root cause possibilities:');
            console.log('1. Trigger "on_auth_user_created" is missing');
            console.log('2. Function "handle_new_admin" is missing or failing');
            console.log('3. RLS policy prevents insertion (unlikely for trigger)');

            // Clean up
            await supabase.auth.admin.deleteUser(user.user.id);
            console.log('🧹 Test user deleted');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkTriggers();
