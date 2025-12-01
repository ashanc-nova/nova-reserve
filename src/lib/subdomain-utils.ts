/**
 * Restaurant slug detection and validation utilities
 * New implementation: Path-based routing instead of subdomain-based
 * 
 * Examples:
 * - "domain.com/bill/reserve" -> "bill"
 * - "domain.com/admin" -> null (admin, no restaurant)
 * - "domain.com/reserve" -> null (no restaurant slug)
 * - "domain.com/713df1ae-.../dashboard" -> null (UUID, handled separately)
 */

/**
 * Extracts restaurant slug from the current URL path
 * @returns The restaurant slug or null if not found
 * 
 * Examples:
 * - "/bill/reserve" -> "bill"
 * - "/bill/dashboard/reservations" -> "bill"
 * - "/admin" -> null
 * - "/reserve" -> null
 * - "/713df1ae-84f5-45b0-b5c7-c8084a647197/dashboard" -> null (UUID)
 */
export function getRestaurantSlug(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const pathname = window.location.pathname
  const pathParts = pathname.split('/').filter(Boolean)

  // No path parts
  if (pathParts.length === 0) {
    return null
  }

  const firstPart = pathParts[0]

  // Reserved paths that are not restaurant slugs
  const reservedPaths = ['admin', 'reserve', 'payment']
  if (reservedPaths.includes(firstPart.toLowerCase())) {
    return null
  }

  // Check if it's a UUID (novaref_id) - not a restaurant slug
  if (firstPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return null
  }

  // First part is the restaurant slug
  return firstPart
}

/**
 * Legacy function for backward compatibility
 * Now returns restaurant slug from path instead of subdomain
 * @deprecated Use getRestaurantSlug() instead
 */
export function getSubdomain(): string | null {
  return getRestaurantSlug()
}

/**
 * Checks if the current path is the admin path
 */
export function isAdminSubdomain(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.location.pathname.startsWith('/admin')
}

/**
 * Checks if the current path has a valid restaurant slug
 */
export function isRestaurantSubdomain(): boolean {
  const slug = getRestaurantSlug()
  return slug !== null
}

/**
 * Validates restaurant slug format
 * Rules: lowercase, alphanumeric and hyphens only, 3-63 characters
 */
export function validateRestaurantSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Restaurant slug is required' }
  }

  if (slug.length < 3) {
    return { valid: false, error: 'Restaurant slug must be at least 3 characters' }
  }

  if (slug.length > 63) {
    return { valid: false, error: 'Restaurant slug must be less than 63 characters' }
  }

  // Must start and end with alphanumeric
  if (!/^[a-z0-9]/.test(slug) || !/[a-z0-9]$/.test(slug)) {
    return { valid: false, error: 'Restaurant slug must start and end with a letter or number' }
  }

  // Only lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Restaurant slug can only contain lowercase letters, numbers, and hyphens' }
  }

  // Reserved slugs
  const reserved = ['admin', 'api', 'reserve', 'payment', 'dashboard', 'settings']
  if (reserved.includes(slug.toLowerCase())) {
    return { valid: false, error: 'This slug is reserved' }
  }

  return { valid: true }
}

/**
 * Normalizes restaurant slug (lowercase, trim)
 */
export function normalizeRestaurantSlug(slug: string): string {
  return slug.toLowerCase().trim()
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use validateRestaurantSlug() instead
 */
export function validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
  return validateRestaurantSlug(subdomain)
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use normalizeRestaurantSlug() instead
 */
export function normalizeSubdomain(subdomain: string): string {
  return normalizeRestaurantSlug(subdomain)
}

