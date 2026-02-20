const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

console.log("=== Supabase Client Test ===");
console.log("URL:", url);
console.log("Key exists:", !!key);
console.log("");

if (!url || !key) {
    console.error("Missing credentials!");
    process.exit(1);
}

const supabase = createClient(url, key);

async function testSignup() {
    console.log("Testing signup with Supabase client...");

    try {
        const { data, error } = await supabase.auth.signUp({
            email: 'test@example.com',
            password: 'TestPassword123!@#',
        });

        if (error) {
            console.error("\n❌ Signup Error:");
            console.error("Message:", error.message);
            console.error("Status:", error.status);
            console.error("Full error:", JSON.stringify(error, null, 2));

            // Check if it's a JSON parsing error
            if (error.message.includes("Unexpected token") || error.message.includes("JSON")) {
                console.error("\n⚠️ This is a JSON parsing error - Supabase is returning HTML!");

                // Try to fetch directly to see what we get
                console.log("\nFetching signup endpoint directly...");
                const response = await fetch(`${url}/auth/v1/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': key
                    },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'TestPassword123!@#'
                    })
                });

                const contentType = response.headers.get('content-type');
                const text = await response.text();

                console.log("Response Status:", response.status);
                console.log("Content-Type:", contentType);
                console.log("\nResponse body (first 2000 chars):");
                console.log(text.substring(0, 2000));
            }
        } else {
            console.log("\n✅ Signup successful!");
            console.log("User:", data.user?.email);
        }
    } catch (err) {
        console.error("\n❌ Unexpected error:");
        console.error(err);
    }
}

testSignup();
