const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Read credentials
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);

// Check for standard or NEXT_ prefixed service role key
const serviceKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/) ||
    envContent.match(/NEXT_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';

// We need the Service Role Key to bypass RLS and insert directly into admins table if needed
if (!serviceKeyMatch) {
    console.log('❌ SERVICE ROLE key not found in .env');
    console.log('Please add SUPABASE_SERVICE_ROLE_KEY to your .env file to run this script.');
    process.exit(1);
}

const serviceKey = serviceKeyMatch[1].trim();
const supabase = createClient(supabaseUrl, serviceKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
    console.log('=== Create New Admin User (Direct Database Insert) ===\n');
    console.log('This script will:');
    console.log('1. Create a user in Supabase Auth (if not exists)');
    console.log('2. Optimistically insert/update the user in the public.admins table\n');

    try {
        const email = await question('Enter email: ');
        const password = await question('Enter password (min 8 chars): ');

        if (!email || !password) {
            console.error('❌ Email and password required');
            rl.close();
            return;
        }

        if (password.length < 8) {
            console.error('❌ Password must be at least 8 chars');
            rl.close();
            return;
        }

        console.log(`\nCreating/Fetching user ${email}...`);

        // 1. Create/Get Auth User
        // We use admin.createUser which auto-confirms email
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { is_admin: true, role: 'admin', full_name: 'Admin User' }
        });

        let userId;

        if (authError) {
            // If user already exists, we need to fetch their ID
            if (authError.message.includes('already_registered') || authError.status === 422) {
                console.log('ℹ️  User already exists in Auth. Fetching ID...');
                const { data: listData } = await supabase.auth.admin.listUsers();
                const existingUser = listData.users.find(u => u.email === email);

                if (!existingUser) {
                    console.error('❌ Could not find existing user ID');
                    rl.close();
                    return;
                }
                userId = existingUser.id;
                console.log(`   Found ID: ${userId}`);

                // Update metadata to ensure is_admin is true
                await supabase.auth.admin.updateUserById(userId, {
                    user_metadata: { is_admin: true, role: 'admin' }
                });
            } else {
                console.error('❌ Auth Error:', authError.message);
                rl.close();
                return;
            }
        } else {
            userId = authData.user.id;
            console.log(`✅ User created! ID: ${userId}`);
        }

        // 2. Insert into Admins Table
        console.log('\nInserting/Updating public.admins table...');

        const { error: dbError } = await supabase
            .from('admins')
            .upsert({
                id: userId,
                email: email,
                role: 'admin',
                is_active: true,
                full_name: 'Admin User', // Default name
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (dbError) {
            console.error('❌ Database Error:', dbError.message);
        } else {
            console.log('✅ Admin user successfully added to database!');

            // Verify
            const { data: admin } = await supabase
                .from('admins')
                .select('*')
                .eq('id', userId)
                .single();

            console.log('\nAdmin Record:');
            console.table(admin);
        }

    } catch (err) {
        console.error('Unexpected Error:', err.message);
    } finally {
        rl.close();
    }
}

createAdminUser();
