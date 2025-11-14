import { NavLink, Link, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '../ui/dropdown-menu'
// import { Button } from '../ui/button'
// import { CircleUser } from 'lucide-react'
// import { WaitlistToggle } from '../dashboard/WaitlistToggle'
import { DashboardMobileNav } from '../dashboard/DashboardMobileNav'
// import { useGlobalState } from '../../lib/global-state'
import { cn } from '../../lib/utils'

export function Header() {
  // const { waitlistPaused } = useGlobalState()
  const location = useLocation()
  
  const getActiveView = () => {
    if (location.pathname.includes('/waitlist')) return 'waitlist'
    if (location.pathname.includes('/reservations')) return 'reservations'
    if (location.pathname.includes('/buzz')) return 'buzz'
    return 'waitlist'
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/10 bg-[#050816]/80 px-4 backdrop-blur-xl md:px-6">
      <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
        <Link to="/dashboard/waitlist" className="flex items-center gap-2 text-lg font-semibold md:text-base">
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
        {/* <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <WaitlistToggle isPaused={waitlistPaused} />
        </div> */}
        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full bg-card/50 hover:bg-card">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className='bg-[#0C1020]/80 backdrop-blur-xl'>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
      </div>
    </header>
  )
}
