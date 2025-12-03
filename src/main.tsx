import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate, useSearchParams } from 'react-router-dom'
import './index.css'
import { GlobalStateProvider } from './lib/global-state'
import { RestaurantProvider } from './lib/restaurant-context'
import { ThemeProvider } from './lib/theme-context'
import { Header } from './components/layout/Header'
import { Toaster } from './components/ui/toaster'
import WaitlistPage from './pages/WaitlistPage'
import ReservationsPage from './pages/ReservationsPage'
import BuzzPage from './pages/BuzzPage'
import ReservationSettingsPage from './pages/ReservationSettingsPage'
import GuestReservationPage from './pages/GuestReservationPage'
import PaymentPage from './pages/PaymentPage'
import ReservationConfirmationPage from './pages/ReservationConfirmationPage'
import PaymentFailedPage from './pages/PaymentFailedPage'
import CancelReservationPage from './pages/CancelReservationPage'
import CheckReservationStatusPage from './pages/CheckReservationStatusPage'
import AdminPanel from './pages/AdminPanel'
import { RestaurantGuard } from './components/RestaurantGuard'
import { isAdminSubdomain } from './lib/subdomain-utils'

function Shell({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const isEmbedded = searchParams.get('embed') === 'true'

  // Admin routes don't need restaurant context
  if (isAdminSubdomain()) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        <main className="flex-1 py-6">
          {children}
        </main>
        <Toaster />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      {!isEmbedded && <Header />}
      <main className={`flex-1 ${isEmbedded ? 'pt-4 sm:pt-10 pb-0' : 'py-6'}`}>
        <RestaurantGuard>
          {children}
        </RestaurantGuard>
      </main>
      <Toaster />
    </div>
  )
}

const router = createBrowserRouter([
  // Root redirects to admin (no default restaurant)
  { path: '/', element: <Navigate to="/admin" replace /> },
  
  // Admin routes
  { path: '/admin', element: <AdminPanel /> },
  { path: '/admin/*', element: <AdminPanel /> },
  
  // Restaurant slug-based routes (e.g., /bill/dashboard/reservations)
  { path: '/:restaurant_slug/dashboard', element: <Navigate to="./reservations" replace /> },
  { path: '/:restaurant_slug/dashboard/waitlist', element: <Shell><WaitlistPage /></Shell> },
  { path: '/:restaurant_slug/dashboard/reservations', element: <Shell><ReservationsPage /></Shell> },
  { path: '/:restaurant_slug/dashboard/buzz', element: <Shell><BuzzPage /></Shell> },
  { path: '/:restaurant_slug/dashboard/settings/reservations', element: <Shell><ReservationSettingsPage /></Shell> },
  { 
    path: '/:restaurant_slug/reserve', 
    element: (
      <RestaurantGuard>
        <GuestReservationPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:restaurant_slug/payment/:reservationId', 
    element: (
      <RestaurantGuard>
        <PaymentPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:restaurant_slug/reserve/confirm/:reservationId', 
    element: (
      <RestaurantGuard>
        <ReservationConfirmationPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:restaurant_slug/reserve/payment/failed/:reservationId', 
    element: (
      <RestaurantGuard>
        <PaymentFailedPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:restaurant_slug/reserve/cancel', 
    element: (
      <RestaurantGuard>
        <CancelReservationPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:restaurant_slug/reserve/status', 
    element: (
      <RestaurantGuard>
        <CheckReservationStatusPage />
      </RestaurantGuard>
    )
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RestaurantProvider>
        <GlobalStateProvider>
          <RouterProvider router={router} />
        </GlobalStateProvider>
      </RestaurantProvider>
    </ThemeProvider>
  </StrictMode>,
)
