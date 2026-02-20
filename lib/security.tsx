// Security utilities for anonymous submissions

// Generate a cryptographically secure tracking code
export function generateTrackingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Removed confusing characters like 0, O, 1, I, S, 5
  const segments = 3
  const segmentLength = 4
  const parts: string[] = []

  for (let i = 0; i < segments; i++) {
    let segment = ""
    const randomArray = new Uint32Array(segmentLength)

    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(randomArray)
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(randomArray[j] % chars.length)
      }
    } else {
      // Fallback for non-browser environments if needed (though rare in this project)
      for (let j = 0; j < segmentLength; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length))
      }
    }
    parts.push(segment)
  }

  return parts.join("-")
}

// Sanitize user input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim()
}

// Validate tracking code format
export function isValidTrackingCode(code: string): boolean {
  // Allow 12 alphanumeric characters, with or without hyphens
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "")
  return normalized.length === 12
}

// Rate limiting helper (in production, use Redis via Upstash)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// Strip potentially identifying metadata from submissions
export function stripMetadata(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["ip", "userAgent", "referrer", "cookies", "headers"]
  const cleaned = { ...data }

  for (const field of sensitiveFields) {
    delete cleaned[field]
  }

  return cleaned
}
