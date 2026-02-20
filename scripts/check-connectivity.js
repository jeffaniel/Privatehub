const fs = require('fs');
const path = require('path');

// Manually parse .env to see what's in it
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    console.error(".env file NOT FOUND at", envPath);
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
console.log("--- .env File Content (redacted keys) ---");
envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL')) {
        console.log(line);
    } else if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
        console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY=exists");
    }
});
console.log("-----------------------------------------");

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : null;
const key = keyMatch ? keyMatch[1].trim() : null;

if (!url) {
    console.error("URL not found in .env");
    process.exit(1);
}

console.log("Testing connection to:", url);

async function testConnection() {
    try {
        const response = await fetch(url + '/auth/v1/health');
        const contentType = response.headers.get('content-type');
        console.log("Status:", response.status);
        console.log("Content-Type:", contentType);
        const text = await response.text();
        console.log("Response (first 100 chars):", text.substring(0, 100));

        if (contentType && contentType.includes('html')) {
            console.log("\n!!! CONFIRMED: URL returns HTML !!!");
        } else {
            console.log("\nResult: URL returns non-HTML (likely JSON)");
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

testConnection();
