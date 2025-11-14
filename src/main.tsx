import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { GlobalStateProvider } from './lib/global-state'
import { RestaurantProvider } from './lib/restaurant-context'
import { Header } from './components/layout/Header'
import { Toaster } from './components/ui/toaster'
import WaitlistPage from './pages/WaitlistPage'
import ReservationsPage from './pages/ReservationsPage'
import BuzzPage from './pages/BuzzPage'
import ReservationSettingsPage from './pages/ReservationSettingsPage'
import GuestReservationPage from './pages/GuestReservationPage'
import AdminPanel from './pages/AdminPanel'
import { RestaurantGuard } from './components/RestaurantGuard'
import { isAdminSubdomain } from './lib/subdomain-utils'

function Shell({ children }: { children: React.ReactNode }) {
  // Admin routes don't need restaurant context
  if (isAdminSubdomain()) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[#050816] text-white">
        <main className="flex-1 py-6">
          {children}
        </main>
        <Toaster />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#050816] text-white">
      <Header />
      <main className="flex-1 py-6">
        <RestaurantGuard>
          {children}
        </RestaurantGuard>
      </main>
      <Toaster />
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Shell><WaitlistPage /></Shell> },
  { path: '/dashboard/waitlist', element: <Shell><WaitlistPage /></Shell> },
  { path: '/dashboard/reservations', element: <Shell><ReservationsPage /></Shell> },
  { path: '/dashboard/buzz', element: <Shell><BuzzPage /></Shell> },
  { path: '/dashboard/settings/reservations', element: <Shell><ReservationSettingsPage /></Shell> },
  { 
    path: '/reserve', 
    element: (
      <RestaurantGuard>
        <GuestReservationPage />
      </RestaurantGuard>
    )
  },
  { path: '/admin', element: <AdminPanel /> },
  { path: '/admin/*', element: <AdminPanel /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RestaurantProvider>
      <GlobalStateProvider>
        <RouterProvider router={router} />
      </GlobalStateProvider>
    </RestaurantProvider>
  </StrictMode>,
)
