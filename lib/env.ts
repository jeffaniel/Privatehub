/**
 * Environment variable validation
 * Ensures all required environment variables are present at runtime
 */

function getEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function getOptionalEnvVar(key: string, defaultValue: string = ''): string {
    return process.env[key] || defaultValue;
}

export const env = {
    // Required Supabase variables
    SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

    // Optional Redis variables
    UPSTASH_REDIS_REST_URL: getOptionalEnvVar('UPSTASH_REDIS_REST_URL'),
    UPSTASH_REDIS_REST_TOKEN: getOptionalEnvVar('UPSTASH_REDIS_REST_TOKEN'),

    // Optional monitoring
    SENTRY_DSN: getOptionalEnvVar('NEXT_PUBLIC_SENTRY_DSN'),
} as const;

// Validate on module load (only in Node.js environment)
if (typeof window === 'undefined') {
    console.log('✓ Environment variables validated');
}
