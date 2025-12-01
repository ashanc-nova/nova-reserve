import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '../ui/sheet'
import { Logo } from '../layout/Logo'
import { useRestaurant } from '../../lib/restaurant-context'
import { cn } from '../../lib/utils'

interface DashboardMobileNavProps {
  activeView: string
  onViewChange?: (view: string) => void
}

export function DashboardMobileNav({ activeView, onViewChange }: DashboardMobileNavProps) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { restaurant } = useRestaurant()

  // Get restaurant prefix from URL or context
  const getRestaurantPrefix = () => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0 && !['admin', 'reserve', 'payment'].includes(pathParts[0])) {
      if (pathParts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return `/${pathParts[0]}`
      }
      return `/${pathParts[0]}`
    }
    if (restaurant?.slug) {
      return `/${restaurant.slug}`
    }
    return ''
  }

  const restaurantPrefix = getRestaurantPrefix()

  const handleNav = (view: string, path: string) => {
    navigate(`${restaurantPrefix}${path}`)
    onViewChange?.(view)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="md:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs bg-background/80 backdrop-blur-xl border-r-border">
        <nav className="grid gap-6 text-lg font-medium">
          <div
            className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            onClick={() => setOpen(false)}
          >
            <Logo />
            <span className="sr-only">QueuePilot</span>
          </div>
          {/* <button
            onClick={() => handleNav('waitlist', '/dashboard/waitlist')}
            className={cn(
              "flex items-center gap-4 px-2.5 transition-colors hover:text-foreground whitespace-nowrap",
              activeView === 'waitlist' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Waitlist
          </button> */}
          <button
            onClick={() => handleNav('reservations', '/dashboard/reservations')}
            className={cn(
              "flex items-center gap-4 px-2.5 transition-colors hover:text-foreground whitespace-nowrap",
              activeView === 'reservations' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Reservations
          </button>
          {/* <button
            onClick={() => handleNav('buzz', '/dashboard/buzz')}
            className={cn(
              "flex items-center gap-4 px-2.5 transition-colors hover:text-foreground whitespace-nowrap",
              activeView === 'buzz' ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Buzz Feed
          </button> */}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

