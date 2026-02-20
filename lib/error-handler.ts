/**
 * Centralized error handling utility
 * Provides consistent error handling across the application
 */

interface ErrorResponse {
    userMessage: string;
    technicalMessage: string;
    shouldLog: boolean;
}

/**
 * Handles errors consistently across the application
 * @param error - The error object
 * @param context - Context where the error occurred (e.g., 'SubmissionForm', 'AdminDashboard')
 * @returns User-friendly and technical error messages
 */
export function handleError(error: unknown, context: string): ErrorResponse {
    const timestamp = new Date().toISOString();

    // Extract error message
    let technicalMessage = 'Unknown error';
    if (error instanceof Error) {
        technicalMessage = error.message;
    } else if (typeof error === 'string') {
        technicalMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
        technicalMessage = String(error.message);
    }

    // Log to console (in production, this would go to monitoring service like Sentry)
    console.error(`[${timestamp}] [${context}]`, technicalMessage, error);

    // Return user-friendly message
    const userMessage = getUserFriendlyMessage(technicalMessage, context);

    return {
        userMessage,
        technicalMessage,
        shouldLog: true,
    };
}

/**
 * Converts technical error messages to user-friendly ones
 */
function getUserFriendlyMessage(technicalMessage: string, context: string): string {
    // Network errors
    if (technicalMessage.includes('fetch') || technicalMessage.includes('network')) {
        return 'Network error. Please check your connection and try again.';
    }

    // Database errors
    if (technicalMessage.includes('duplicate') || technicalMessage.includes('unique')) {
        return 'This item already exists.';
    }

    // Authentication errors
    if (technicalMessage.includes('auth') || technicalMessage.includes('unauthorized')) {
        return 'Authentication failed. Please log in again.';
    }

    // Validation errors
    if (technicalMessage.includes('validation') || technicalMessage.includes('invalid')) {
        return 'Please check your input and try again.';
    }

    // Rate limiting
    if (technicalMessage.includes('rate limit') || technicalMessage.includes('too many')) {
        return 'Too many requests. Please wait a moment and try again.';
    }

    // Default message
    return 'Something went wrong. Please try again later.';
}

/**
 * Async wrapper for error handling
 */
export async function tryCatch<T>(
    fn: () => Promise<T>,
    context: string,
    onError?: (error: ErrorResponse) => void
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        const errorResponse = handleError(error, context);
        if (onError) {
            onError(errorResponse);
        }
        return null;
    }
}
