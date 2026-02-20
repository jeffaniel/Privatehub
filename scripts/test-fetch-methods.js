// Test if the issue is with createServerClient vs createClient
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually parse .env
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

console.log("=== Testing Regular Client vs SSR Client ===\n");

// Test 1: Regular client (what works in our test script)
async function testRegularClient() {
    console.log("1. Testing with regular createClient...");
    const supabase = createClient(url, key);

    try {
        const { data, error } = await supabase.auth.signUp({
            email: 'test2@example.com',
            password: 'TestPassword123!@#',
        });

        if (error) {
            console.error("   ❌ Error:", error.message);
            return false;
        } else {
            console.log("   ✅ Success!");
            return true;
        }
    } catch (err) {
        console.error("   ❌ Exception:", err.message);
        return false;
    }
}

// Test 2: Direct fetch to see what we get
async function testDirectFetch() {
    console.log("\n2. Testing with direct fetch (like Supabase client does internally)...");

    try {
        const response = await fetch(`${url}/auth/v1/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': key,
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                email: 'test3@example.com',
                password: 'TestPassword123!@#'
            })
        });

        const contentType = response.headers.get('content-type');
        console.log("   Status:", response.status);
        console.log("   Content-Type:", contentType);

        const text = await response.text();

        if (contentType && contentType.includes('html')) {
            console.error("   ❌ Got HTML instead of JSON!");
            console.log("   First 500 chars:", text.substring(0, 500));
            return false;
        } else {
            console.log("   ✅ Got JSON response");
            try {
                const json = JSON.parse(text);
                console.log("   Response:", json);
            } catch {
                console.log("   Raw text:", text.substring(0, 200));
            }
            return true;
        }
    } catch (err) {
        console.error("   ❌ Exception:", err.message);
        return false;
    }
}

async function runTests() {
    await testRegularClient();
    await testDirectFetch();

    console.log("\n=== Tests Complete ===");
}

runTests();
