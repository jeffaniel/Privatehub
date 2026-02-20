const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read credentials from .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : '';

console.log('=== Migrate Auth Users to Admins Table ===\n');
console.log('⚠️  IMPORTANT: This script requires the SERVICE ROLE key, not the ANON key.');
console.log('The ANON key cannot read from auth.users or insert into admins due to RLS.\n');
console.log('To run this script:');
console.log('1. Go to Supabase Dashboard → Settings → API');
console.log('2. Copy the SERVICE ROLE key (keep it secret!)');
console.log('3. Add to your .env file: SUPABASE_SERVICE_ROLE_KEY=your_service_key');
console.log('4. Run this script again\n');

// Check for service role key
const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
if (!serviceKeyMatch) {
    console.log('❌ SERVICE ROLE key not found in .env');
    console.log('\nAlternatively, you can run this SQL directly in Supabase SQL Editor:\n');
    console.log('--- Copy and paste this SQL ---');
    console.log(`
-- First, ensure the admins table and trigger exist
-- (Run the contents of scripts/db-admin.sql if you haven't already)

-- Then, migrate existing auth users with is_admin metadata
INSERT INTO public.admins (id, email, role, is_active)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'role', 'admin') as role,
    true as is_active
FROM auth.users
WHERE (raw_user_meta_data->>'is_admin')::boolean = true
ON CONFLICT (id) DO NOTHING;

-- Check the results
SELECT * FROM public.admins;
`);
    console.log('--- End of SQL ---\n');
    process.exit(1);
}

const serviceKey = serviceKeyMatch[1].trim();
const supabase = createClient(supabaseUrl, serviceKey);

async function migrateUsers() {
    try {
        console.log('✅ Service role key found. Proceeding with migration...\n');

        // Get all auth users with is_admin metadata
        console.log('1. Fetching auth users with is_admin metadata...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.error('❌ Error fetching auth users:', authError.message);
            return;
        }

        const adminUsers = authUsers.users.filter(user =>
            user.user_metadata?.is_admin === true ||
            user.raw_user_meta_data?.is_admin === true
        );

        console.log(`   Found ${adminUsers.length} users with is_admin metadata\n`);

        if (adminUsers.length === 0) {
            console.log('⚠️  No users found with is_admin metadata.');
            console.log('   All auth users:', authUsers.users.map(u => ({ email: u.email, metadata: u.user_metadata })));
            return;
        }

        // Check current admins table
        console.log('2. Checking current admins table...');
        const { data: existingAdmins, error: checkError } = await supabase
            .from('admins')
            .select('*');

        if (checkError) {
            console.error('❌ Error checking admins table:', checkError.message);
            console.log('\n💡 The admins table might not exist. Run scripts/db-admin.sql first!');
            return;
        }

        console.log(`   Currently ${existingAdmins.length} admins in table\n`);

        // Insert admin users
        console.log('3. Migrating users to admins table...');
        let successCount = 0;
        let errorCount = 0;

        for (const user of adminUsers) {
            const { error: insertError } = await supabase
                .from('admins')
                .insert({
                    id: user.id,
                    email: user.email,
                    role: user.user_metadata?.role || user.raw_user_meta_data?.role || 'admin',
                    is_active: true
                });

            if (insertError) {
                if (insertError.code === '23505') { // Duplicate key
                    console.log(`   ⏭️  Skipped ${user.email} (already exists)`);
                } else {
                    console.error(`   ❌ Error adding ${user.email}:`, insertError.message);
                    errorCount++;
                }
            } else {
                console.log(`   ✅ Added ${user.email}`);
                successCount++;
            }
        }

        console.log(`\n4. Migration complete!`);
        console.log(`   ✅ Successfully added: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        // Show final state
        const { data: finalAdmins } = await supabase
            .from('admins')
            .select('email, role, is_active');

        console.log(`\n5. Current admins in database:`);
        console.table(finalAdmins);

    } catch (err) {
        console.error('\n❌ Unexpected error:', err.message);
    }
}

migrateUsers();
