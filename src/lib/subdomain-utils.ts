/**
 * Subdomain detection and validation utilities
 */

/**
 * Extracts subdomain from the current hostname
 * @returns The subdomain or null if not found
 * 
 * Examples:
 * - "joes-pizza.localhost:5173" -> "joes-pizza"
 * - "admin.localhost:5173" -> "admin"
 * - "localhost:5173" -> null
 * - "joes-pizza.novaqueue.com" -> "joes-pizza"
 */
export function getSubdomain(): string | null {
  if (typeof window === 'undefined') {
    // Server-side: would need to extract from request headers
    return null
  }

  const hostname = window.location.hostname
  const parts = hostname.split('.')

  // Handle localhost development
  if (hostname.includes('localhost') || hostname === '127.0.0.1') {
    // For localhost, check if there's a subdomain before "localhost"
    // Format: subdomain.localhost or subdomain.127.0.0.1
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== '127') {
      return parts[0]
    }
    // Could also check for subdomain in the path or query params as fallback
    return null
  }

  // Production: subdomain.domain.com
  // Assuming format: subdomain.novaqueue.com
  if (parts.length >= 3) {
    // Return the first part as subdomain
    return parts[0]
  }

  // No subdomain found
  return null
}

/**
 * Checks if the current subdomain is the admin subdomain
 */
export function isAdminSubdomain(): boolean {
  const subdomain = getSubdomain()
  return subdomain === 'admin'
}

/**
 * Checks if the current subdomain is a valid restaurant subdomain
 */
export function isRestaurantSubdomain(): boolean {
  const subdomain = getSubdomain()
  return subdomain !== null && subdomain !== 'admin' && subdomain !== 'www'
}

/**
 * Validates subdomain format
 * Rules: lowercase, alphanumeric and hyphens only, 3-63 characters
 */
export function validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
  if (!subdomain) {
    return { valid: false, error: 'Subdomain is required' }
  }

  if (subdomain.length < 3) {
    return { valid: false, error: 'Subdomain must be at least 3 characters' }
  }

  if (subdomain.length > 63) {
    return { valid: false, error: 'Subdomain must be less than 63 characters' }
  }

  // Must start and end with alphanumeric
  if (!/^[a-z0-9]/.test(subdomain) || !/[a-z0-9]$/.test(subdomain)) {
    return { valid: false, error: 'Subdomain must start and end with a letter or number' }
  }

  // Only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return { valid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' }
  }

  // Reserved subdomains
  const reserved = ['admin', 'www', 'api', 'app', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev']
  if (reserved.includes(subdomain.toLowerCase())) {
    return { valid: false, error: 'This subdomain is reserved' }
  }

  return { valid: true }
}

/**
 * Normalizes subdomain (lowercase, trim)
 */
export function normalizeSubdomain(subdomain: string): string {
  return subdomain.toLowerCase().trim()
}

