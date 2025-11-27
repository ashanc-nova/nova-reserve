import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { useToast } from '../hooks/use-toast'
import { Loader2, User, Phone, CheckCircle2, Calendar as CalendarIcon, Mail, MessageSquare, Star, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover'
import { Calendar } from '../components/ui/calendar'
import { addDays, addHours } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { TimeSlotPicker } from '../components/reservations/TimeSlotPicker'
import { cn } from '../lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { getRestaurant, getAvailableSlots, addReservation } from '../lib/supabase-data'
import { createNovaCustomer } from '../lib/nova-api'
import { Toaster } from '../components/ui/toaster'

export default function GuestReservationPage() {
  const { toast } = useToast()
  
  // Form state
  const [date, setDate] = useState<Date | undefined>()
  const [partySize, setPartySize] = useState('2')
  const [time, setTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [hasFetchedSlots, setHasFetchedSlots] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  
  // New fields for special features
  const [specialRequests, setSpecialRequests] = useState('')
  const [specialOccasion, setSpecialOccasion] = useState('')
  const [showSpecialOptions, setShowSpecialOptions] = useState(false)
  
  // Settings
  const [settings, setSettings] = useState({
    allowSpecialNotes: false,
    specialOccasions: [] as string[],
    leadTimeHours: 2,
    cutoffTime: '21:00',
    autoConfirm: true,
    requirePayment: false
  })
  
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [reservationDetails, setReservationDetails] = useState<any>(null)

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const restaurant = await getRestaurant()
        const reservationSettings = restaurant.settings?.reservation_settings || {}
        setSettings({
          allowSpecialNotes: reservationSettings.allow_special_notes || false,
          specialOccasions: reservationSettings.special_occasions || [],
          leadTimeHours: reservationSettings.lead_time_hours || 2,
          cutoffTime: reservationSettings.cutoff_time || '21:00',
          autoConfirm: reservationSettings.auto_confirm !== undefined ? reservationSettings.auto_confirm : true,
          requirePayment: reservationSettings.require_payment || false
        })
        } catch {
          console.error('Failed to load settings')
      }
    }
    loadSettings()
  }, [])

  // Load available slots when date or party size changes
  useEffect(() => {
    if (date) {
      setTime('') // Reset time when date changes
      setHasFetchedSlots(false)
      setIsLoadingSlots(true)
      getAvailableSlots(date, parseInt(partySize, 10))
        .then((slots) => {
          setAvailableSlots(slots)
          setHasFetchedSlots(true)
        })
        .catch(() => {
          toast({ title: 'Could Not Check Slots', description: 'Failed to load available time slots', variant: 'destructive' })
          setAvailableSlots([])
          setHasFetchedSlots(true)
        })
        .finally(() => {
          setIsLoadingSlots(false)
        })
    }
  }, [date, partySize, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time || !name || !phone || !email) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      // Convert time from display format (h:mm A) back to 24h format
      const [timeStr, ampm] = time.split(' ')
      const [hours, minutes] = timeStr.split(':')
      let hour24 = parseInt(hours)
      if (ampm === 'PM' && hour24 !== 12) hour24 += 12
      if (ampm === 'AM' && hour24 === 12) hour24 = 0
      const time24 = `${String(hour24).padStart(2, '0')}:${minutes}:00`
      
      const dateTime = new Date(`${date.toISOString().split('T')[0]}T${time24}`)
      
      // Create Nova customer and get refId
      let novaCustomerId: string | undefined
      try {
        console.log('Creating Nova customer...')
        novaCustomerId = await createNovaCustomer(name, phone)
        console.log('Nova customer created with refId:', novaCustomerId)
      } catch (novaError: any) {
        console.error('Error creating Nova customer:', novaError)
        // Don't block reservation creation if Nova API fails
        // Just log the error and continue
        toast({ 
          title: 'Warning', 
          description: 'Reservation created but customer sync failed. ' + (novaError.message || 'Please contact support.'), 
          variant: 'default' 
        })
      }
      
      // If payment is required, create draft reservation and redirect to payment
      if (settings.requirePayment) {
        console.log('Payment required, creating draft reservation...')
        
        try {
          const reservation = await addReservation({
            name,
            phone,
            email,
            party_size: parseInt(partySize, 10),
            date_time: dateTime.toISOString(),
            // @ts-ignore - TypeScript cache issue, 'draft' is valid in the actual function signature
            status: 'draft',
            special_requests: settings.allowSpecialNotes ? (specialRequests || undefined) : undefined,
            special_occasion_type: specialOccasion && specialOccasion !== 'none' ? specialOccasion : undefined,
            slot_start_time: time24,
            novacustomer_id: novaCustomerId,
          })
          
          console.log('Draft reservation created successfully:', reservation.id, 'Status:', reservation.status)
          
          // Verify the status is actually 'draft'
          if (reservation.status !== 'draft') {
            console.error('ERROR: Reservation was not created with draft status! Actual status:', reservation.status)
            toast({ 
              title: 'Error', 
              description: `Reservation was created with status ${reservation.status} instead of draft`, 
              variant: 'destructive' 
            })
            return
          }
          
          // If Nova customer ID wasn't set during creation, update it now
          if (novaCustomerId && !reservation.novacustomer_id) {
            try {
              // Update using Supabase directly to avoid TypeScript cache issues
              const { supabase } = await import('../lib/supabase')
              if (!supabase) throw new Error('Supabase not initialized')
              const { error } = await supabase.from('reservations').update({ novacustomer_id: novaCustomerId }).eq('id', reservation.id)
              if (error) throw error
            } catch (updateError) {
              console.error('Error updating Nova customer ID:', updateError)
            }
          }
          
          // Redirect to payment page with reservation ID
          const paymentUrl = `/payment/${reservation.id}`
          console.log('Redirecting to payment page:', paymentUrl)
          window.location.href = paymentUrl
          return
        } catch (paymentError: any) {
          console.error('Error creating draft reservation:', paymentError)
          toast({ 
            title: 'Error', 
            description: paymentError.message || 'Failed to create reservation. Please try again.', 
            variant: 'destructive' 
          })
          return
        }
      }
      
      // Normal flow - no payment required
      const reservation = await addReservation({
        name,
        phone,
        email,
        party_size: parseInt(partySize, 10),
        date_time: dateTime.toISOString(),
        status: settings.autoConfirm ? 'confirmed' : 'notified',
        special_requests: settings.allowSpecialNotes ? (specialRequests || undefined) : undefined,
        special_occasion_type: specialOccasion && specialOccasion !== 'none' ? specialOccasion : undefined,
        slot_start_time: time24,
        // @ts-ignore - TypeScript cache issue, novacustomer_id is valid in the actual function signature
        novacustomer_id: novaCustomerId,
      })

      // If Nova customer ID wasn't set during creation, update it now
      if (novaCustomerId && !reservation.novacustomer_id) {
        try {
          // Update using Supabase directly to avoid TypeScript cache issues
          const { supabase } = await import('../lib/supabase')
          if (!supabase) throw new Error('Supabase not initialized')
          const { error } = await supabase.from('reservations').update({ novacustomer_id: novaCustomerId }).eq('id', reservation.id)
          if (error) throw error
        } catch (updateError) {
          console.error('Error updating Nova customer ID:', updateError)
        }
      }

      setReservationDetails(reservation)
      setSubmitted(true)
      toast({ title: 'Success', description: 'Reservation confirmed!' })
    } catch (error: any) {
      console.error('Error in handleSubmit:', error)
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to submit reservation', 
        variant: 'destructive' 
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Get user's local timezone
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Format date/time in user's timezone
  const formatInUserTimezone = (date: Date | string, formatStr: string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return formatInTimeZone(dateObj, userTimezone, formatStr)
  }

  if (submitted && reservationDetails) {
    const formattedDate = reservationDetails ? formatInUserTimezone(new Date(reservationDetails.date_time), 'PPP') : ''
    const formattedTime = reservationDetails ? formatInUserTimezone(new Date(reservationDetails.date_time), 'p') : ''
    
    return (
      <>
        <Toaster />
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center py-6 sm:py-12 px-4">
          <div className="text-center space-y-8 animate-in fade-in-50 max-w-lg w-full">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative h-24 w-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50 ring-4 ring-green-500/20">
                  <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold gradient-text">Reservation Confirmed!</h1>
              <p className="text-lg text-muted-foreground">A confirmation has been sent to your email.</p>
            </div>

            {/* Reservation Details Card */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-green-500/20 to-primary/20 rounded-2xl blur opacity-50"></div>
              <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 shadow-2xl">
                <div className="space-y-5 text-left">
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-base font-medium text-muted-foreground">Name</span>
                    <span className="text-lg font-semibold text-foreground">{reservationDetails?.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-base font-medium text-muted-foreground">Date</span>
                    <span className="text-lg font-semibold text-foreground">{formattedDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <span className="text-base font-medium text-muted-foreground">Time</span>
                    <span className="text-lg font-semibold text-foreground">{formattedTime}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-base font-medium text-muted-foreground">Party Size</span>
                    <span className="text-lg font-semibold text-foreground">{reservationDetails?.party_size} {reservationDetails?.party_size === 1 ? 'person' : 'people'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button 
                onClick={() => {
                  setSubmitted(false)
                  setReservationDetails(null)
                  setDate(undefined)
                  setTime('')
                  setName('')
                  setPhone('')
                  setEmail('')
                  setSpecialRequests('')
                  setSpecialOccasion('')
                }} 
                variant="outline" 
                className="w-full sm:w-auto px-8 h-14 text-base font-semibold border-2 hover:bg-card/50 transition-all"
              >
                Make another reservation
              </Button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
      <>
        <Toaster />
        <div className="min-h-screen w-full bg-background text-foreground flex items-start justify-center py-6 sm:py-12 px-4">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 w-full max-w-3xl">
          <div className='space-y-6 sm:space-y-8 animate-in fade-in-0'>
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-2 sm:mb-3">Make a Reservation</h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground">Secure your table for an unforgettable experience</p>
            </div>

            {/* Date, Party Size, and Time Selection */}
            <div className="relative">
              <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
              <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-4 sm:p-6 md:p-8 pt-6 sm:pt-8 md:pt-10">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="relative">
                    <Label htmlFor="date" className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Date</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal h-14 text-base bg-background/50 border-border pt-3",
                            !date && "text-muted-foreground"
                          )}
                          disabled={isLoadingSlots}
                        >
                          <CalendarIcon className="mr-3 h-5 w-5" />
                          {isLoadingSlots ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              <span>Loading slots...</span>
                            </>
                          ) : (
                            (date ? formatInUserTimezone(date, "MMM d") : <span>Pick a date</span>)
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card/80 backdrop-blur-xl">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(selectedDate) => {
                            if (selectedDate) {
                              setDate(selectedDate)
                              setIsCalendarOpen(false)
                            }
                          }}
                          initialFocus
                          disabled={(day) => {
                            const today = new Date()
                            const minDate = addHours(today, settings.leadTimeHours)
                            const maxDate = addDays(today, 60)
                            // Disable past dates and dates before lead time
                            return day < new Date(minDate.toDateString()) || day > maxDate
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="relative">
                    <Label htmlFor="partySizeSelect" className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Party Size</Label>
                    <Select value={partySize} onValueChange={setPartySize}>
                      <SelectTrigger id="partySizeSelect" className="h-14 text-base bg-background/50 border-border pt-3">
                        <SelectValue placeholder="Select party size" />
                      </SelectTrigger>
                      <SelectContent className='bg-card/80 backdrop-blur-xl'>
                        {[...Array(8)].map((_, i) => (
                          <SelectItem key={i + 1} value={`${i + 1}`}>{i + 1} {i + 1 > 1 ? 'people' : 'person'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {date && (
                  <div className='space-y-4 mt-6'>
                    <div className="relative">
                      <Label className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Select an Available Time</Label>
                      <div className="pt-3">
                        <TimeSlotPicker
                          slots={availableSlots}
                          selectedTime={time}
                          onSelectTime={setTime}
                          isLoading={isLoadingSlots}
                          hasFetched={hasFetchedSlots}
                          {...(date && { selectedDate: date })}
                          {...(userTimezone && { userTimezone })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="relative">
              <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
              <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-4 sm:p-6 md:p-8 pt-6 sm:pt-8 md:pt-10 space-y-4 sm:space-y-6">
                <div className="space-y-5">
                  <div className="relative">
                    <Label htmlFor="name" className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="pl-12 h-14 text-base bg-background/50 border-border pt-3" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="relative">
                      <Label htmlFor="phone" className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          name="phone" 
                          type="tel" 
                          value={phone} 
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '') // Remove non-digits
                            if (value.length <= 10) {
                              setPhone(value)
                            }
                          }} 
                          required 
                          maxLength={10}
                          className="pl-12 h-14 text-base bg-background/50 border-border pt-3" 
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <Label htmlFor="email" className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-12 h-14 text-base bg-background/50 border-border pt-3" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Options - Collapsible */}
                {(settings.specialOccasions.length > 0 || settings.allowSpecialNotes) && (
                  <div className="space-y-3 border-t border-border/50 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSpecialOptions(!showSpecialOptions)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <Label className="text-base font-semibold cursor-pointer">Special Options</Label>
                      <ChevronDown className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-200",
                        showSpecialOptions && "transform rotate-180"
                      )} />
                    </button>
                    
                    {showSpecialOptions && (
                      <div className="space-y-4 pt-2">
                        {/* Special Occasion Selection */}
                        {settings.specialOccasions.length > 0 && (
                          <div className="relative">
                            <Label htmlFor="specialOccasion" className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Occasion</Label>
                            <div className="relative">
                              <Star className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                              <Select value={specialOccasion} onValueChange={setSpecialOccasion}>
                                <SelectTrigger id="specialOccasion" className="pl-12 h-14 text-base bg-background/50 border-border pt-3">
                                  <SelectValue placeholder="Select special occasion" />
                                </SelectTrigger>
                                <SelectContent className='bg-card/80 backdrop-blur-xl'>
                                  <SelectItem value="none">None</SelectItem>
                                  {settings.specialOccasions.map((occasion) => (
                                    <SelectItem key={occasion} value={occasion}>{occasion}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {/* Special Notes */}
                        {settings.allowSpecialNotes && (
                          <div className="relative">
                            <Label htmlFor="specialRequests" className="absolute -top-2.5 left-3 px-2 text-xs font-semibold bg-card text-muted-foreground z-10">Requests</Label>
                            <div className="relative">
                              <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                              <Textarea
                                id="specialRequests"
                                name="specialRequests"
                                value={specialRequests}
                                onChange={(e) => setSpecialRequests(e.target.value)}
                                placeholder="Any special dietary requirements, seating preferences, or other requests..."
                                className="pl-12 min-h-[120px] text-base bg-background/50 border-border resize-none pt-3"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={submitting || !date || !time || !name || !phone || !email} 
                  className='w-full h-14 text-base font-semibold'
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    settings.requirePayment ? 'Pay to Confirm' : 'Confirm Reservation'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
