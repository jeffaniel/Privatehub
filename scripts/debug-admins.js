const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdmins() {
    console.log('Checking admins table...');
    const { data, error } = await supabase
        .from('admins')
        .select('*');

    if (error) {
        console.error('Error fetching admins:', error);
    } else {
        console.log(`Found ${data.length} admins:`);
        console.table(data);
    }

    console.log('\nChecking auth users...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
        console.error('Error fetching auth users:', authError);
    } else {
        console.log(`Found ${users.length} auth users:`);
        users.forEach(u => {
            console.log(`- ${u.email} (${u.id}) - metadata: ${JSON.stringify(u.user_metadata)}`);
        });
    }
}

checkAdmins();
