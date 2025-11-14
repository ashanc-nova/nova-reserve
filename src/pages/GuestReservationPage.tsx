import { useEffect, useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { useToast } from '../hooks/use-toast'
import { Loader2, User, Phone, PartyPopper, Calendar as CalendarIcon, Mail, MessageSquare, Star } from 'lucide-react'
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
import { Toaster } from '../components/ui/toaster'

export default function GuestReservationPage() {
  const [step, setStep] = useState(1)
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
  
  // Settings
  const [settings, setSettings] = useState({
    allowSpecialNotes: false,
    specialOccasions: [] as string[],
    leadTimeHours: 2,
    cutoffTime: '21:00',
    autoConfirm: true
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
          autoConfirm: reservationSettings.auto_confirm !== undefined ? reservationSettings.auto_confirm : true
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
      })

      setReservationDetails(reservation)
      setSubmitted(true)
      toast({ title: 'Success', description: 'Reservation confirmed!' })
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to submit reservation', variant: 'destructive' })
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
    return (
      <>
        <Toaster />
        <div className="min-h-screen w-full bg-[#050816] text-white flex items-center justify-center py-12 px-4">
          <div className="text-center space-y-4 animate-in fade-in-50 max-w-md w-full">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-green-900/50 rounded-full flex items-center justify-center ring-2 ring-green-500/30">
                <PartyPopper className="h-10 w-10 text-green-400" />
              </div>
            </div>
            <h3 className="text-2xl font-semibold gradient-text">Reservation Confirmed!</h3>
            <p className="text-muted-foreground">A confirmation has been sent to your email.</p>
            <div className="text-left bg-background/50 rounded-lg p-4 border border-white/10 space-y-2 max-w-sm mx-auto">
              <p><strong className='text-muted-foreground'>Name:</strong> {reservationDetails?.name}</p>
              <p><strong className='text-muted-foreground'>Date:</strong> {reservationDetails ? formatInUserTimezone(new Date(reservationDetails.date_time), 'PPP') : ''}</p>
              <p><strong className='text-muted-foreground'>Time:</strong> {reservationDetails ? formatInUserTimezone(new Date(reservationDetails.date_time), 'p') : ''}</p>
              <p><strong className='text-muted-foreground'>Party Size:</strong> {reservationDetails?.party_size}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()} className='mt-6'>Make another reservation</Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen w-full bg-[#050816] text-white flex items-center justify-center py-12 px-4">
        <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-3xl">
        {step === 1 && (
          <div className='space-y-8 animate-in fade-in-0'>
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">Make a Reservation</h1>
              <p className="text-lg text-muted-foreground">Secure your table for an unforgettable experience</p>
            </div>
          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <div className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="date" className="text-base font-semibold">Date</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-14 text-base bg-background/50 border-white/10",
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
                          (date ? formatInUserTimezone(date, "PPP") : <span>Pick a date</span>)
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
                <div className="space-y-3">
                  <Label htmlFor="partySizeSelect" className="text-base font-semibold">Party Size</Label>
                  <Select value={partySize} onValueChange={setPartySize}>
                    <SelectTrigger id="partySizeSelect" className="h-14 text-base bg-background/50 border-white/10">
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
            </div>
          </div>

          {date && (
            <div className='space-y-4'>
              <Label className="text-base font-semibold">Select an Available Time</Label>
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
          )}

          <Button
            type="button"
            onClick={() => setStep(2)}
            disabled={!date || !time}
            className="w-full h-14 text-base font-semibold"
          >
            Next
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className='space-y-8 animate-in fade-in-0'>
          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <div className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl p-6 text-center">
              <p className='text-muted-foreground text-base mb-2'>Your reservation details:</p>
              <p className='font-semibold text-xl'>{date ? formatInUserTimezone(date, "PPP") : ''} at {time} for {partySize} {parseInt(partySize, 10) > 1 ? 'people' : 'person'}</p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <div className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl p-8 space-y-6">
              <div className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-base font-semibold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="pl-12 h-14 text-base bg-background/50 border-white/10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-base font-semibold">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="pl-12 h-14 text-base bg-background/50 border-white/10" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-base font-semibold">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-12 h-14 text-base bg-background/50 border-white/10" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Occasion Selection */}
              {settings.specialOccasions.length > 0 && (
                <div className="space-y-3">
                  <Label htmlFor="specialOccasion" className="text-base font-semibold">Special Occasion (Optional)</Label>
                  <div className="relative">
                    <Star className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                    <Select value={specialOccasion} onValueChange={setSpecialOccasion}>
                      <SelectTrigger id="specialOccasion" className="pl-12 h-14 text-base bg-background/50 border-white/10">
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
                <div className="space-y-3">
                  <Label htmlFor="specialRequests" className="text-base font-semibold">Special Requests (Optional)</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                    <Textarea
                      id="specialRequests"
                      name="specialRequests"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="Any special dietary requirements, seating preferences, or other requests..."
                      className="pl-12 min-h-[120px] text-base bg-background/50 border-white/10 resize-none"
                    />
                  </div>
                </div>
              )}

              <div className='flex gap-4 pt-4'>
                <Button type="button" variant='outline' onClick={() => setStep(1)} className='w-full h-14 text-base font-semibold'>Back</Button>
                <Button type="submit" disabled={submitting || !time || !name || !phone || !email} className='w-full h-14 text-base font-semibold'>
                  {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Confirm Reservation
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
        </form>
      </div>
    </>
  )
}
