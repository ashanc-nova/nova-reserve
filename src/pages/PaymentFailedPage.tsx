import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react'
import { useToast } from '../hooks/use-toast'
import { Toaster } from '../components/ui/toaster'
import { getReservation } from '../lib/supabase-data'
import { useRestaurant } from '../lib/restaurant-context'
import type { Reservation } from '../lib/supabase'
import { formatDateWithTimezone, formatTimeInTimezone } from '../lib/timezone-utils'

export default function PaymentFailedPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { restaurant } = useRestaurant()
  const { toast } = useToast()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)

  // Get restaurant prefix from URL path
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

  useEffect(() => {
    const loadReservation = async () => {
      if (!reservationId) {
        toast({ title: 'Error', description: 'Invalid reservation ID', variant: 'destructive' })
        navigate(`${restaurantPrefix}/reserve`)
        return
      }

      try {
        setLoading(true)
        const res = await getReservation(reservationId)
        
        if (!res) {
          toast({ title: 'Error', description: 'Reservation not found', variant: 'destructive' })
          navigate(`${restaurantPrefix}/reserve`)
          return
        }

        setReservation(res)
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to load reservation', variant: 'destructive' })
        navigate(`${restaurantPrefix}/reserve`)
      } finally {
        setLoading(false)
      }
    }

    loadReservation()
  }, [reservationId, navigate, toast, restaurantPrefix])

  if (loading) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </>
    )
  }

  if (!reservation) {
    return null
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
          {/* Failure Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-500/10 p-4">
                <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Payment Failed</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              We couldn't process your payment. Please try again.
            </p>
          </div>

          {/* Reservation Details Card */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Reservation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{reservation.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Party Size</p>
                  <p className="font-medium">{reservation.party_size} {reservation.party_size === 1 ? 'guest' : 'guests'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDateWithTimezone(reservation.date_time)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{formatTimeInTimezone(reservation.date_time)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(`${restaurantPrefix}/payment/${reservationId}`)}
              className="flex-1 h-12 sm:h-14"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Try Payment Again
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(`${restaurantPrefix}/reserve`)}
              className="flex-1 h-12 sm:h-14"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>

          {/* Help Text */}
          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              If you continue to experience issues, please contact the restaurant directly.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

