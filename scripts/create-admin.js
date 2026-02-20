const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = 'https://qajbticeqivhbvakmsby.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhamJ0aWNlcWl2aGJ2YWttc2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc2NjYsImV4cCI6MjA4NDM5MzY2Nn0.PyLVLW_k3-wahT17Ngjj7JEy_OGDs9UrUyKzMamqlsQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
    console.log('=== Create First Admin Account ===\n');

    try {
        const email = await question('Enter admin email: ');
        const password = await question('Enter admin password (min 8 chars): ');

        if (!email || !password) {
            console.error('❌ Email and password are required!');
            rl.close();
            return;
        }

        if (password.length < 8) {
            console.error('❌ Password must be at least 8 characters!');
            rl.close();
            return;
        }

        console.log('\n📝 Creating admin account...');

        // Sign up the user with admin metadata
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    is_admin: true,
                    role: 'admin'
                }
            }
        });

        if (error) {
            console.error('\n❌ Error creating admin:', error.message);
            rl.close();
            return;
        }

        if (data.user) {
            console.log('\n✅ Admin account created successfully!');
            console.log('User ID:', data.user.id);
            console.log('Email:', data.user.email);

            // Wait a moment for the database trigger to create the admin record
            console.log('\n⏳ Waiting for database trigger to create admin record...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if admin was created in the admins table
            console.log('\n🔍 Checking admins table...');
            const { data: admins, error: checkError } = await supabase
                .from('admins')
                .select('*')
                .eq('email', email);

            if (checkError) {
                console.error('❌ Error checking admins table:', checkError.message);
            } else if (admins && admins.length > 0) {
                console.log('✅ Admin found in database:');
                console.log(JSON.stringify(admins[0], null, 2));
            } else {
                console.log('⚠️ Admin not found in admins table yet.');
                console.log('This might be because:');
                console.log('1. The database trigger needs to be set up');
                console.log('2. Email verification is required first');
                console.log('\nCheck your email for verification link!');
            }
        }

    } catch (err) {
        console.error('\n❌ Unexpected error:', err.message);
    } finally {
        rl.close();
    }
}

createAdmin();
