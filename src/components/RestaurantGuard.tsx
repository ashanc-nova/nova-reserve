import type { ReactNode } from 'react'
import { useRestaurant } from '../lib/restaurant-context'
import { isAdminSubdomain } from '../lib/subdomain-utils'
import { Loader2, AlertCircle, Mail, HelpCircle } from 'lucide-react'

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
            <p className="text-muted-foreground">Loading reservations...</p>
          </div>
        </div>
      )
    )
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="w-full max-w-2xl">
          <div className="relative">
            {/* Animated gradient border */}
            <div className="absolute -inset-1 animate-pulse rounded-3xl bg-gradient-to-r from-primary/60 via-purple-500/40 to-primary/60 opacity-60 blur-2xl"></div>
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-primary/30 via-purple-500/20 to-primary/30"></div>
            
            {/* Main card */}
            <div className="relative rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card/95 via-card/90 to-card/95 shadow-2xl backdrop-blur-2xl p-8 sm:p-12 md:p-16">
              <div className="text-center space-y-8">
                {/* Icon with enhanced glow */}
                <div className="flex justify-center">
                  <div className="relative">
                    {/* Outer glow rings */}
                    <div className="absolute -inset-4 bg-primary/30 rounded-full blur-2xl animate-pulse"></div>
                    <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl"></div>
                    
                    {/* Icon container */}
                    <div className="relative rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 p-5 sm:p-6 border-2 border-primary/30 shadow-lg">
                      <HelpCircle className="h-12 w-12 sm:h-14 sm:w-14 text-primary drop-shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Title with enhanced styling */}
                <div className="space-y-3">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text tracking-tight">
                    Reservation Module Not Enabled
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-1.5 w-12 bg-gradient-to-r from-transparent via-primary/60 to-primary/60 rounded-full"></div>
                    <div className="h-1.5 w-24 bg-gradient-to-r from-primary/60 via-primary/80 to-primary/60 rounded-full"></div>
                    <div className="h-1.5 w-12 bg-gradient-to-r from-primary/60 via-primary/60 to-transparent rounded-full"></div>
                  </div>
                </div>

                {/* Message section */}
                <div className="space-y-6 pt-4">
                  <p className="text-lg sm:text-xl text-muted-foreground/90 leading-relaxed font-medium">
                    The reservation module is not enabled for your restaurant.
                  </p>
                  
                  {/* Support contact card */}
                  <div className="relative">
                    <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/20 via-purple-500/10 to-primary/20 blur-sm"></div>
                    <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-muted/30 rounded-2xl p-6 sm:p-8 border border-primary/20 shadow-lg">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-primary/20 p-3 border border-primary/30">
                            <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Contact Support</p>
                            <a 
                              href="mailto:support@novatab.com"
                              className="text-base sm:text-lg font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group"
                            >
                              support@novatab.com
                              <span className="text-primary/60 group-hover:text-primary transition-transform group-hover:translate-x-1">→</span>
                            </a>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground/80 mt-4 text-center">
                        Please reach out to enable the reservations module for your restaurant.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

