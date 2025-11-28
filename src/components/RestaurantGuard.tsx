import type { ReactNode } from 'react'
import { useRestaurant } from '../lib/restaurant-context'
import { isAdminSubdomain } from '../lib/subdomain-utils'
import { Loader2, AlertCircle } from 'lucide-react'
import { Button } from './ui/button'

interface RestaurantGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Component that ensures a restaurant is loaded before rendering children
 * Shows loading state or error if restaurant not found
 */
export function RestaurantGuard({ children, fallback }: RestaurantGuardProps) {
  const { restaurant, loading, error } = useRestaurant()
  const isAdmin = isAdminSubdomain()

  // Admin subdomain doesn't need restaurant
  if (isAdmin) {
    return <>{children}</>
  }

  if (loading) {
    return (
      fallback || (
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading restaurant...</p>
          </div>
        </div>
      )
    )
  }

  if (error || !restaurant) {
    const handleGoToAdmin = () => {
      const hostname = window.location.hostname
      const port = window.location.port
      const protocol = window.location.protocol
      const baseDomain = import.meta.env.VITE_BASE_DOMAIN || 'localhost'
      
      let adminUrl: string
      
      if (hostname.includes('localhost') || hostname === '127.0.0.1') {
        // Development: go to admin.localhost or just localhost/admin
        if (hostname.includes('.localhost')) {
          adminUrl = `${protocol}//admin.localhost${port ? ':' + port : ''}/admin`
        } else {
          adminUrl = `${protocol}//${hostname}${port ? ':' + port : ''}/admin`
        }
      } else {
        // Production: Check if we're on the base domain or a subdomain
        if (hostname === baseDomain) {
          // On base domain (e.g., nova-reserve.netlify.app)
          // Just use /admin path
          adminUrl = `${protocol}//${hostname}${port ? ':' + port : ''}/admin`
        } else if (hostname.endsWith(`.${baseDomain}`)) {
          // On a subdomain (e.g., restaurant.nova-reserve.netlify.app)
          // Replace subdomain with 'admin'
          adminUrl = `${protocol}//admin.${baseDomain}${port ? ':' + port : ''}/admin`
        } else {
          // Fallback for custom domains: use /admin path
          adminUrl = `${protocol}//${hostname}${port ? ':' + port : ''}/admin`
        }
      }
      
      window.location.href = adminUrl
    }

    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <div className="p-3 bg-destructive/20 rounded-full">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-2xl font-bold gradient-text">Restaurant Not Found</h2>
          <p className="text-muted-foreground">
            {error || 'The restaurant you\'re looking for doesn\'t exist or the subdomain is invalid.'}
          </p>
          <div className="pt-4">
            <Button
              variant="outline"
              onClick={handleGoToAdmin}
              className="bg-card/50 border-border"
            >
              Go to Admin Panel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

