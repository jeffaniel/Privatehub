/**
 * File Upload Security
 * Validates and secures file uploads
 */

export interface FileValidationResult {
    valid: boolean
    errors: string[]
    sanitizedFilename?: string
}

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],

    // Documents
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],

    // Archives (if needed)
    'application/zip': ['.zip'],
} as const

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILENAME_LENGTH = 255

/**
 * Validate file upload
 */
export function validateFile(file: File): FileValidationResult {
    const errors: string[] = []

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    if (file.size === 0) {
        errors.push('File is empty')
    }

    // Check MIME type
    const allowedMimeTypes = Object.keys(ALLOWED_FILE_TYPES)
    if (!allowedMimeTypes.includes(file.type)) {
        errors.push(`File type ${file.type} is not allowed`)
    }

    // Check file extension
    const extension = getFileExtension(file.name)
    const allowedExtensions = ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES] as readonly string[] | undefined

    if (allowedExtensions && !allowedExtensions.includes(extension)) {
        errors.push(`File extension ${extension} does not match MIME type ${file.type}`)
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name)

    if (sanitizedFilename.length === 0) {
        errors.push('Invalid filename')
    }

    if (sanitizedFilename.length > MAX_FILENAME_LENGTH) {
        errors.push(`Filename too long (max ${MAX_FILENAME_LENGTH} characters)`)
    }

    return {
        valid: errors.length === 0,
        errors,
        sanitizedFilename: errors.length === 0 ? sanitizedFilename : undefined
    }
}

/**
 * Get file extension
 */
function getFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.')
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : ''
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename: string): string {
    // Remove path separators and dangerous characters
    let sanitized = filename
        .replace(/[\/\\]/g, '')
        .replace(/\0/g, '')
        .replace(/\.\./g, '')
        .replace(/[<>:"|?*]/g, '')
        .trim()

    // Add timestamp to prevent collisions
    const timestamp = Date.now()
    const extension = getFileExtension(sanitized)
    const nameWithoutExt = sanitized.substring(0, sanitized.length - extension.length)

    return `${nameWithoutExt}_${timestamp}${extension}`
}

/**
 * Generate secure file path
 * Files should be stored outside web root
 */
export function generateSecureFilePath(sanitizedFilename: string, userId?: string): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')

    // Organize by year/month for easier management
    const basePath = userId
        ? `/uploads/users/${userId}/${year}/${month}`
        : `/uploads/anonymous/${year}/${month}`

    return `${basePath}/${sanitizedFilename}`
}

/**
 * Validate image dimensions (client-side)
 */
export async function validateImageDimensions(
    file: File,
    maxWidth: number = 4096,
    maxHeight: number = 4096
): Promise<{ valid: boolean; error?: string }> {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve({ valid: true }) // Not an image, skip dimension check
            return
        }

        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)

            if (img.width > maxWidth || img.height > maxHeight) {
                resolve({
                    valid: false,
                    error: `Image dimensions ${img.width}x${img.height} exceed maximum ${maxWidth}x${maxHeight}`
                })
            } else {
                resolve({ valid: true })
            }
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve({ valid: false, error: 'Invalid image file' })
        }

        img.src = url
    })
}

/**
 * Check file signature (magic bytes) to verify actual file type
 * This prevents extension spoofing
 */
export async function verifyFileSignature(file: File): Promise<boolean> {
    return new Promise((resolve) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const arr = new Uint8Array(e.target?.result as ArrayBuffer).subarray(0, 4)
            let header = ''
            for (let i = 0; i < arr.length; i++) {
                header += arr[i].toString(16).padStart(2, '0')
            }

            // Check magic bytes for common file types
            const signatures: Record<string, string[]> = {
                'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
                'image/png': ['89504e47'],
                'image/gif': ['47494638'],
                'application/pdf': ['25504446'],
                'application/zip': ['504b0304'],
            }

            const expectedSignatures = signatures[file.type]
            if (!expectedSignatures) {
                resolve(false)
                return
            }

            const matches = expectedSignatures.some(sig => header.startsWith(sig))
            resolve(matches)
        }

        reader.onerror = () => resolve(false)
        reader.readAsArrayBuffer(file.slice(0, 4))
    })
}

/**
 * Scan file for malware (placeholder for integration with antivirus service)
 */
export async function scanFileForMalware(file: File): Promise<{
    clean: boolean
    threats?: string[]
}> {
    // In production, integrate with services like:
    // - VirusTotal API
    // - ClamAV
    // - AWS S3 Malware Scanning
    // - Google Cloud Security Scanner

    // For now, return clean
    return { clean: true }
}

/**
 * Generate Content-Disposition header for safe file serving
 */
export function getSecureContentDisposition(filename: string, inline: boolean = false): string {
    const sanitized = sanitizeFilename(filename)
    const disposition = inline ? 'inline' : 'attachment'

    // RFC 5987 encoding for non-ASCII filenames
    const encodedFilename = encodeURIComponent(sanitized)

    return `${disposition}; filename="${sanitized}"; filename*=UTF-8''${encodedFilename}`
}
