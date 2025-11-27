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
  { path: '/', element: <Navigate to="/reserve" replace /> },
  { path: '/dashboard', element: <Navigate to="/dashboard/reservations" replace /> },
  { path: '/dashboard/waitlist', element: <Shell><WaitlistPage /></Shell> },
  { path: '/dashboard/reservations', element: <Shell><ReservationsPage /></Shell> },
  { path: '/dashboard/buzz', element: <Shell><BuzzPage /></Shell> },
  { path: '/dashboard/settings/reservations', element: <Shell><ReservationSettingsPage /></Shell> },
  
  // Path-based routes with novaref_id
  { path: '/:novaref_id/dashboard', element: <Navigate to="./reservations" replace /> },
  { path: '/:novaref_id/dashboard/waitlist', element: <Shell><WaitlistPage /></Shell> },
  { path: '/:novaref_id/dashboard/reservations', element: <Shell><ReservationsPage /></Shell> },
  { path: '/:novaref_id/dashboard/buzz', element: <Shell><BuzzPage /></Shell> },
  { path: '/:novaref_id/dashboard/settings/reservations', element: <Shell><ReservationSettingsPage /></Shell> },
  { 
    path: '/reserve', 
    element: (
      <RestaurantGuard>
        <GuestReservationPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:novaref_id/reserve', 
    element: (
      <RestaurantGuard>
        <GuestReservationPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/payment/:reservationId', 
    element: (
      <RestaurantGuard>
        <PaymentPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/reserve/confirm/:reservationId', 
    element: (
      <RestaurantGuard>
        <ReservationConfirmationPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/reserve/payment/failed/:reservationId', 
    element: (
      <RestaurantGuard>
        <PaymentFailedPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:novaref_id/payment/:reservationId', 
    element: (
      <RestaurantGuard>
        <PaymentPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:novaref_id/reserve/confirm/:reservationId', 
    element: (
      <RestaurantGuard>
        <ReservationConfirmationPage />
      </RestaurantGuard>
    )
  },
  { 
    path: '/:novaref_id/reserve/payment/failed/:reservationId', 
    element: (
      <RestaurantGuard>
        <PaymentFailedPage />
      </RestaurantGuard>
    )
  },
  { path: '/admin', element: <AdminPanel /> },
  { path: '/admin/*', element: <AdminPanel /> },
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
