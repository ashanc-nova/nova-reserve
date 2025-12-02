import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../hooks/use-toast'
import { Loader2, Phone, User, Calendar as CalendarIcon, Clock, Users, XCircle, ArrowLeft } from 'lucide-react'
import { getReservationsByPhone, updateReservationStatus } from '../lib/supabase-data'
import { formatDateWithTimezone, formatTimeInTimezone } from '../lib/timezone-utils'
import { useRestaurant } from '../lib/restaurant-context'
import { Toaster } from '../components/ui/toaster'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'

export default function CancelReservationPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { restaurant } = useRestaurant()
  
  // Get restaurant prefix from URL path
  const getRestaurantPrefix = () => {
    const pathParts = location.pathname.split('/').filter(Boolean)
    if (pathParts.length > 0 && !['admin', 'reserve', 'payment', 'cancel'].includes(pathParts[0])) {
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null)
  const [cancelling, setCancelling] = useState(false)
  
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
          description: 'No active reservations found for this phone number.',
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
  
  const handleCancelClick = (reservation: any) => {
    setSelectedReservation(reservation)
    setShowCancelConfirm(true)
  }
  
  const handleConfirmCancel = async () => {
    if (!selectedReservation) return
    
    setCancelling(true)
    try {
      await updateReservationStatus(selectedReservation.id, 'cancelled')
      toast({
        title: 'Reservation Cancelled',
        description: 'Your reservation has been cancelled successfully.',
        variant: 'default'
      })
      // Remove from list
      setFoundReservations(prev => prev.filter(r => r.id !== selectedReservation.id))
      setShowCancelConfirm(false)
      setSelectedReservation(null)
      
      // If no more reservations, clear the list
      if (foundReservations.length === 1) {
        setFoundReservations([])
        setPhone('')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel reservation',
        variant: 'destructive'
      })
    } finally {
      setCancelling(false)
    }
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
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Cancel a Reservation</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Enter your phone number to find and cancel your reservation
                  </p>
                </div>
                
                {/* Phone Input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="Enter 10-digit phone number"
                        className="pl-12"
                        maxLength={10}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter your 10-digit phone number (numbers only)
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleSearch}
                    disabled={loadingReservations || phone.length < 10}
                    className="w-full h-12 text-base font-semibold"
                  >
                    {loadingReservations ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      'Search Reservations'
                    )}
                  </Button>
                </div>
                
                {/* Reservations List */}
                {foundReservations.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h2 className="text-lg font-semibold">
                      Found {foundReservations.length} active reservation{foundReservations.length !== 1 ? 's' : ''}
                    </h2>
                    <div className="space-y-3">
                      {foundReservations.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold">{reservation.name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                reservation.status === 'draft' 
                                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  : 'bg-primary/20 text-primary'
                              }`}>
                                {reservation.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground ml-7">
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
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelClick(reservation)}
                            disabled={cancelling}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Cancel Confirmation Modal */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the reservation for <strong>{selectedReservation?.name}</strong> on{' '}
              <strong>{selectedReservation ? formatDateWithTimezone(selectedReservation.date_time) : ''}</strong> at{' '}
              <strong>{selectedReservation ? formatTimeInTimezone(selectedReservation.date_time) : ''}</strong>?
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCancelConfirm(false)
              setSelectedReservation(null)
            }}>
              No, Keep Reservation
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Reservation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

