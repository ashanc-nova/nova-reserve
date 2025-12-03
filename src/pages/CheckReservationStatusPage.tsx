import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../hooks/use-toast'
import { Loader2, Phone, User, Calendar as CalendarIcon, Clock, Users, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { getReservationsByPhone } from '../lib/supabase-data'
import { formatDateWithTimezone, formatTimeInTimezone } from '../lib/timezone-utils'
import { useRestaurant } from '../lib/restaurant-context'
import { Toaster } from '../components/ui/toaster'
import { Badge } from '../components/ui/badge'
import { getRestaurant } from '../lib/supabase-data'

export default function CheckReservationStatusPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { restaurant } = useRestaurant()
  
  // Get restaurant prefix from URL path
  const getRestaurantPrefix = () => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0 && !['admin', 'reserve', 'payment', 'cancel', 'status'].includes(pathParts[0])) {
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
  
  const [phone, setPhone] = useState('')
  const [loadingReservations, setLoadingReservations] = useState(false)
  const [foundReservations, setFoundReservations] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)

  // Load settings to determine draft type
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const restaurantData = await getRestaurant()
        setSettings(restaurantData.settings?.reservation_settings || {})
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])
  
  // Phone validation: only numbers, max 10 chars
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '') // Remove non-digits
    if (value.length <= 10) {
      setPhone(value)
    }
  }
  
  const handleSearch = async () => {
    if (!phone.trim() || phone.length < 10) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive'
      })
      return
    }
    
    setLoadingReservations(true)
    try {
      const reservations = await getReservationsByPhone(phone.trim())
      if (reservations.length === 0) {
        toast({
          title: 'No Reservations Found',
          description: 'No reservations found for this phone number.',
          variant: 'default'
        })
        setFoundReservations([])
      } else {
        setFoundReservations(reservations)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch reservations',
        variant: 'destructive'
      })
      setFoundReservations([])
    } finally {
      setLoadingReservations(false)
    }
  }

  const getStatusDisplay = (reservation: any) => {
    if (reservation.status === 'confirmed' || reservation.status === 'notified') {
      return { label: 'Confirmed', variant: 'default' as const, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300' }
    }
    if (reservation.status === 'draft') {
      const isPendingPayment = settings?.require_payment && !reservation.payment_amount
      const isPendingApproval = !settings?.auto_confirm && (!settings?.require_payment || reservation.payment_amount)
      
      if (isPendingPayment) {
        return { label: 'Pending Payment', variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300' }
      }
      if (isPendingApproval) {
        return { label: 'Pending Approval', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300' }
      }
      return { label: 'Pending', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300' }
    }
    return { label: reservation.status, variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300' }
  }
  
  return (
    <>
      <Toaster />
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-primary/5 flex items-start justify-center py-6 sm:py-12 px-4">
        <div className="w-full max-w-2xl space-y-6 pt-6 sm:pt-12">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`${restaurantPrefix}/reserve`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reservation
          </Button>
          
          {/* Main Card */}
          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <div className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-6 sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-bold gradient-text mb-6 text-center">Check Reservation Status</h2>
              
              {/* Phone Input Section */}
              <div className="space-y-4 mb-8">
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="Enter your 10-digit phone number"
                    className="pl-12 h-12 text-base bg-background/50 border-border focus:border-primary/50"
                    maxLength={10}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={loadingReservations || phone.length < 10}
                  className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white"
                >
                  {loadingReservations ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Check Status'
                  )}
                </Button>
              </div>
              
              {/* Found Reservations List */}
              {foundReservations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-muted-foreground text-center">
                    Found {foundReservations.length} reservation{foundReservations.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-3">
                    {foundReservations.map((reservation) => {
                      const statusDisplay = getStatusDisplay(reservation)
                      return (
                        <div
                          key={reservation.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-border rounded-lg bg-card/50"
                        >
                          <div className="flex-1 mb-3 sm:mb-0">
                            <div className="flex items-center gap-3 mb-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-foreground">{reservation.name}</span>
                              <Badge
                                variant={statusDisplay.variant}
                                className={`${statusDisplay.color} border text-xs font-medium`}
                              >
                                {statusDisplay.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground ml-7">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {formatDateWithTimezone(reservation.date_time)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatTimeInTimezone(reservation.date_time)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {reservation.party_size}
                              </div>
                              {reservation.payment_amount && reservation.payment_amount > 0 && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  Paid ${reservation.payment_amount.toFixed(2)}
                                </div>
                              )}
                            </div>
                            {reservation.status === 'draft' && (
                              <div className="mt-2 ml-7 text-xs text-muted-foreground">
                                {statusDisplay.label === 'Pending Payment' && (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Please complete payment to confirm your reservation
                                  </span>
                                )}
                                {statusDisplay.label === 'Pending Approval' && (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    Waiting for restaurant approval. You'll receive a confirmation SMS once approved.
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

