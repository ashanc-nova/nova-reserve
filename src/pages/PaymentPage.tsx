import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Loader2, CheckCircle2, CreditCard, Calendar, Clock, Users, DollarSign, User } from 'lucide-react'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../hooks/use-toast'
import { Toaster } from '../components/ui/toaster'
import { getReservation, updateReservationPaymentAmount, getRestaurant } from '../lib/supabase-data'
import { getMerchantConfig, createCheckoutSession } from '../lib/nova-api'
import type { Reservation } from '../lib/supabase'
import { formatInTimeZone } from 'date-fns-tz'

export default function PaymentPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>('')
  const [paymentSettings, setPaymentSettings] = useState<any>(null)

  // Get user's local timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Format date/time in user's local timezone
  const formatInUserTimezone = (date: Date | string, formatStr: string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return formatInTimeZone(dateObj, userTimezone, formatStr)
  }

  // Calculate payment amount based on settings
  const calculatePaymentAmount = (res: Reservation, settings: any): number => {
    let amount = settings.base_payment_amount || 0
    
    // Party size-based pricing
    if (settings.party_size_pricing && settings.party_size_pricing.length > 0) {
      const partyPricing = settings.party_size_pricing.find((p: any) => 
        res.party_size >= p.minParty && res.party_size <= p.maxParty
      )
      if (partyPricing) {
        amount = partyPricing.amount
      }
    }
    
    // Peak hours premium
    if (settings.peak_hours_premium && settings.peak_hours_start && settings.peak_hours_end) {
      const reservationTime = new Date(res.date_time)
      const reservationHour = reservationTime.getHours()
      const reservationMinute = reservationTime.getMinutes()
      const reservationTimeMinutes = reservationHour * 60 + reservationMinute
      
      const [peakStartHour, peakStartMin] = settings.peak_hours_start.split(':').map(Number)
      const [peakEndHour, peakEndMin] = settings.peak_hours_end.split(':').map(Number)
      const peakStartMinutes = peakStartHour * 60 + peakStartMin
      const peakEndMinutes = peakEndHour * 60 + peakEndMin
      
      if (reservationTimeMinutes >= peakStartMinutes && reservationTimeMinutes <= peakEndMinutes) {
        amount += settings.peak_hours_premium
      }
    }
    
    // Weekend premium
    if (settings.weekend_premium) {
      const reservationDate = new Date(res.date_time)
      const dayOfWeek = reservationDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        amount += settings.weekend_premium
      }
    }
    
    return Math.max(0, amount)
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

        if (res.status !== 'draft') {
          toast({ title: 'Error', description: 'This reservation has already been processed', variant: 'destructive' })
          navigate('/reserve')
          return
        }

        setReservation(res)
        
        // Load payment settings
        const restaurant = await getRestaurant()
        const settings = restaurant.settings?.reservation_settings?.payment_settings || {}
        setPaymentSettings(settings)
        
        // Calculate payment amount if fixed
        if (settings.payment_type === 'fixed') {
          const calculated = calculatePaymentAmount(res, settings)
          setPaymentAmount(calculated.toFixed(2))
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

  const handleConfirm = async () => {
    if (!reservationId || !reservation) return

    setConfirming(true)
    try {
      // Get payment amount from input
      const amount = paymentAmount ? parseFloat(paymentAmount) : null
      
      if (!amount || amount <= 0) {
        toast({ 
          title: 'Error', 
          description: 'Please enter a valid payment amount', 
          variant: 'destructive' 
        })
        setConfirming(false)
        return
      }
      
      // Validate against min/max for custom amounts
      if (paymentSettings?.payment_type === 'custom') {
        const minAmount = paymentSettings.min_payment_amount || 0
        const maxAmount = paymentSettings.max_payment_amount || Infinity
        
        if (amount < minAmount) {
          toast({ 
            title: 'Error', 
            description: `Payment amount must be at least $${minAmount.toFixed(2)}`, 
            variant: 'destructive' 
          })
          setConfirming(false)
          return
        }
        
        if (maxAmount > 0 && amount > maxAmount) {
          toast({ 
            title: 'Error', 
            description: `Payment amount cannot exceed $${maxAmount.toFixed(2)}`, 
            variant: 'destructive' 
          })
          setConfirming(false)
          return
        }
      }

      // Get restaurant to get novaref_id
      const restaurant = await getRestaurant()
      if (!restaurant.novaref_id) {
        throw new Error('Restaurant Nova reference ID is not configured')
      }

      // Step 1: Get merchant configuration
      const merchantConfig = await getMerchantConfig(restaurant.novaref_id)
      
      if (!merchantConfig.gatewayId || !merchantConfig.merchantId) {
        throw new Error('Payment gateway not configured for this restaurant')
      }

      // Step 2: Create checkout session
      // Always use window.location.origin to preserve subdomain
      // This ensures we redirect back to the same subdomain (e.g., default.localhost:5173)
      const baseUrl = window.location.origin
      const successUrl = `${baseUrl}/reserve/confirm/${reservationId}`
      const failureUrl = `${baseUrl}/reserve/payment/failed/${reservationId}`

      // Save payment amount to reservation before redirecting
      await updateReservationPaymentAmount(reservationId, amount)

      // Convert amount to cents
      const amountInCents = Math.round(amount * 100).toString()

      const checkoutSession = await createCheckoutSession(
        merchantConfig.gatewayId,
        merchantConfig.merchantId,
        {
          amount: amountInCents,
          currency: 'USD',
          metadata: {
            orderRefId: reservationId,
            applicationName: 'Nova Queue'
          },
          amount_details: {
            tips: '0',
            surcharge: '0'
          },
          successUrl: successUrl,
          failureUrl: failureUrl,
          wallets_only: false
        }
      )

      // Step 3: Redirect to payment URL
      if (checkoutSession.url) {
        window.location.href = checkoutSession.url
      } else {
        throw new Error('Payment URL not received from payment gateway')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      toast({ 
        title: 'Payment Error', 
        description: error.message || 'Failed to initiate payment. Please try again.', 
        variant: 'destructive' 
      })
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading reservation details...</p>
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
          {/* Payment Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Complete Your Payment</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Secure payment to confirm your reservation</p>
          </div>

          {/* Reservation Details Card */}
          <Card className="border-border bg-card">
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                Reservation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 sm:divide-x divide-border">
                <div className="flex items-center gap-3 sm:flex-1 p-2 sm:p-0 rounded-lg sm:rounded-none bg-primary/5 sm:bg-transparent">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <User className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <span className="font-medium text-sm sm:text-base">{reservation.name}</span>
                </div>
                <div className="flex items-center gap-3 p-2 sm:p-0 sm:pl-4 rounded-lg sm:rounded-none bg-primary/5 sm:bg-transparent">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Users className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <span className="font-medium text-sm sm:text-base">{reservation.party_size} {reservation.party_size === 1 ? 'guest' : 'guests'}</span>
                </div>
                <div className="flex items-center gap-3 p-2 sm:p-0 sm:pl-4 rounded-lg sm:rounded-none bg-primary/5 sm:bg-transparent">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <span className="font-medium text-sm sm:text-base">{formatInUserTimezone(reservation.date_time, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 sm:p-0 sm:pl-4 rounded-lg sm:rounded-none bg-primary/5 sm:bg-transparent">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  </div>
                  <span className="font-medium text-sm sm:text-base">{formatInUserTimezone(reservation.date_time, 'h:mm a')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card className="border-border bg-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Payment Information
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">You will be redirected to a secure payment page to complete your payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
              <div className="space-y-4">
                {paymentSettings?.payment_type === 'fixed' ? (
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount" className="text-sm sm:text-base font-semibold">Payment Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <Input
                        id="paymentAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base bg-background/50 border-border"
                        readOnly
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Amount calculated based on party size, time, and date
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount" className="text-sm sm:text-base font-semibold">Payment Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <Input
                        id="paymentAmount"
                        type="number"
                        step="0.01"
                        min={paymentSettings?.min_payment_amount || 0}
                        max={paymentSettings?.max_payment_amount > 0 ? paymentSettings.max_payment_amount : undefined}
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-10 sm:pl-12 h-12 sm:h-14 text-sm sm:text-base bg-background/50 border-border"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                      <span>
                        {paymentSettings?.min_payment_amount > 0 && (
                          <>Min: ${paymentSettings.min_payment_amount.toFixed(2)}</>
                        )}
                      </span>
                      <span>
                        {paymentSettings?.max_payment_amount > 0 && (
                          <>Max: ${paymentSettings.max_payment_amount.toFixed(2)}</>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 sm:p-6 bg-card/50 rounded-lg border border-border space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm sm:text-base text-muted-foreground">Reservation Fee</span>
                  <span className="text-xl sm:text-2xl font-bold">${paymentAmount || '0.00'}</span>
                </div>
                <div className="pt-3 sm:pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-base font-semibold">Total</span>
                    <span className="text-xl sm:text-2xl font-bold text-primary">${paymentAmount || '0.00'}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold"
                size="lg"
              >
                {confirming ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Confirm Payment
                  </>
                )}
              </Button>

              {/* Refund Policy - Subtle one-liner */}
              {paymentSettings?.refund_policy && (
                <p className="text-xs sm:text-sm text-muted-foreground text-center mt-3 sm:mt-4">
                  {paymentSettings.refund_policy === 'refundable' && (
                    <>This reservation is fully refundable.</>
                  )}
                  {paymentSettings.refund_policy === 'non-refundable' && (
                    <>This reservation is non-refundable.</>
                  )}
                  {paymentSettings.refund_policy === 'conditional' && (
                    <>
                      Refundable if cancelled at least{' '}
                      <span className="font-medium">
                        {paymentSettings.refund_hours_before || 24} hours
                      </span>{' '}
                      before reservation.
                    </>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

