import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { CheckCircle2, DollarSign, Mail, Star, MessageSquare, Calendar, Clock, Users, User, Phone } from 'lucide-react'
import { useToast } from '../hooks/use-toast'
import { Toaster } from '../components/ui/toaster'
import { getReservation } from '../lib/supabase-data'
import type { Reservation } from '../lib/supabase'
import { formatInTimeZone } from 'date-fns-tz'

export default function ReservationConfirmationPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const paymentStatus = searchParams.get('payment_status')

  // Get user's local timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Format date/time in user's timezone
  const formatInUserTimezone = (date: Date | string, formatStr: string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return formatInTimeZone(dateObj, userTimezone, formatStr)
  }

  useEffect(() => {
    const loadReservation = async () => {
      if (!reservationId) {
        toast({ title: 'Error', description: 'Invalid reservation ID', variant: 'destructive' })
        navigate('/reserve')
        return
      }

      try {
        setLoading(true)
        const res = await getReservation(reservationId)
        
        if (!res) {
          toast({ title: 'Error', description: 'Reservation not found', variant: 'destructive' })
          navigate('/reserve')
          return
        }

        // If reservation is still in draft status and we're on the confirmation page,
        // it likely means payment was successful, so update status to confirmed
        // Also check for payment_status=success in URL
        if (res.status === 'draft' || paymentStatus === 'success') {
          const { supabase } = await import('../lib/supabase')
          if (supabase) {
            // Update status to confirmed
            // Payment amount should already be saved from PaymentPage, but ensure it's there
            await supabase
              .from('reservations')
              .update({ status: 'confirmed' })
              .eq('id', reservationId)
            // Reload reservation to get updated status and payment_amount
            const updatedRes = await getReservation(reservationId)
            setReservation(updatedRes)
          } else {
            setReservation(res)
          }
        } else {
          setReservation(res)
        }
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to load reservation', variant: 'destructive' })
        navigate('/reserve')
      } finally {
        setLoading(false)
      }
    }

    loadReservation()
  }, [reservationId, navigate, toast])

  if (loading) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading reservation details...</p>
          </div>
        </div>
      </>
    )
  }

  if (!reservation) {
    return null
  }

  const formattedDate = formatInUserTimezone(new Date(reservation.date_time), 'PPP')
  const formattedTime = formatInUserTimezone(new Date(reservation.date_time), 'p')

  return (
    <>
      <Toaster />
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center py-6 sm:py-12 px-4">
        <div className="text-center space-y-6 sm:space-y-8 animate-in fade-in-50 max-w-2xl w-full">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl shadow-green-500/50 ring-4 ring-green-500/20">
                <CheckCircle2 className="h-12 w-12 sm:h-14 sm:w-14 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Reservation Confirmed!</h1>
            <p className="text-sm sm:text-base text-muted-foreground">A confirmation email has been sent to you.</p>
          </div>

          {/* Reservation Details Cards */}
          <div className="space-y-4">
            {/* Guest Information Section */}
            <div className="rounded-lg border border-border bg-card/90 backdrop-blur-xl p-4 sm:p-5 shadow-sm">
              <div className="space-y-3">
                <div className="pb-2 border-b border-border/50">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Guest Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground truncate">{reservation.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{reservation.phone}</p>
                  </div>
                  {reservation.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-semibold text-foreground truncate">{reservation.email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reservation Details Section */}
            <div className="rounded-lg border border-border bg-card/90 backdrop-blur-xl p-4 sm:p-5 shadow-sm">
              <div className="space-y-3">
                <div className="pb-2 border-b border-border/50">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Reservation Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{formattedDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{formattedTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground">{reservation.party_size} {reservation.party_size === 1 ? 'person' : 'people'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {reservation.payment_amount && reservation.payment_amount > 0 && (
              <div className="rounded-lg border border-border bg-card/90 backdrop-blur-xl p-4 sm:p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="pb-2 border-b border-border/50">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Payment</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{reservation.payment_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Special Requests Section */}
            {(reservation.special_occasion_type || reservation.special_requests) && (
              <div className="rounded-lg border border-border bg-card/90 backdrop-blur-xl p-4 sm:p-5 shadow-sm">
                <div className="space-y-3">
                  <div className="pb-2 border-b border-border/50">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">Special Requests</h3>
                  </div>
                  <div className="space-y-2">
                    {reservation.special_occasion_type && (
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm font-semibold text-foreground">{reservation.special_occasion_type}</p>
                      </div>
                    )}
                    {reservation.special_requests && (
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-foreground break-words">{reservation.special_requests}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <Button 
              onClick={() => navigate('/reserve')} 
              variant="outline" 
              className="w-full sm:w-auto px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base font-semibold border-2 hover:bg-card/80 hover:border-primary/50 transition-all"
            >
              Make another reservation
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

