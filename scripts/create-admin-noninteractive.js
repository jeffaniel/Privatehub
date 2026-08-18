const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

if (!url || !key) {
    console.error("Missing credentials!");
    process.exit(1);
}

const supabase = createClient(url, key);

async function createAdmin() {
    const email = 'admin@lsuvoice.com';
    const password = 'LincolnAdmin2026!';
    console.log(`Registering ${email}...`);
    
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
        console.error("Error signing up:", error);
    } else {
        console.log("Signup successful!");
        console.log("User details:", data.user?.email, "ID:", data.user?.id);
    }
}

createAdmin();
