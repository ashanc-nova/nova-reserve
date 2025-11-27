import { NavLink, Link, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { Button } from '../ui/button'
import { Moon, Sun } from 'lucide-react'
import { DashboardMobileNav } from '../dashboard/DashboardMobileNav'
import { useTheme } from '../../lib/theme-context'
import { cn } from '../../lib/utils'

export function Header() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  
  const getActiveView = () => {
    if (location.pathname.includes('/waitlist')) return 'waitlist'
    if (location.pathname.includes('/reservations')) return 'reservations'
    if (location.pathname.includes('/buzz')) return 'buzz'
    return 'reservations'
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link to="/dashboard/reservations" className="flex items-center gap-2 text-lg font-semibold md:text-base">
          <Logo />
        </Link>
        {/* <NavLink
          to="/dashboard/waitlist"
          className={({ isActive }) =>
            cn(
              "transition-colors hover:text-foreground font-medium whitespace-nowrap",
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )
          }
        >
          Waitlist
        </NavLink> */}
        <NavLink
          to="/dashboard/reservations"
          className={({ isActive }) =>
            cn(
              "transition-colors hover:text-foreground font-medium whitespace-nowrap",
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )
          }
        >
          Reservations
        </NavLink>
        {/* <NavLink
          to="/dashboard/buzz"
          className={({ isActive }) =>
            cn(
              "transition-colors hover:text-foreground font-medium whitespace-nowrap",
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )
          }
        >
          Buzz Feed
        </NavLink> */}
      </nav>
      
      <DashboardMobileNav activeView={getActiveView()} />

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full bg-card/50 hover:bg-card border-border"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
