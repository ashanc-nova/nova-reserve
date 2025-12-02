import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'
import { Plus, Trash2, Save, ArrowLeft, Check, Edit, Clock, Calendar, Settings, Star, MessageSquare, Zap, User, Shield, BarChart, TrendingUp, Users, Globe, CreditCard, XCircle, Loader2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator, SelectGroup } from '../ui/select'
import { useToast } from '../../hooks/use-toast'
import { getRestaurant, updateRestaurantSettings } from '../../lib/supabase-data'
import { getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } from '../../lib/supabase-data'
import { setRestaurantTimezone } from '../../lib/timezone-utils'
import type { TimeSlot } from '../../lib/supabase'

interface ReservationSettingsFullProps {
  isOpen: boolean
  onClose: () => void
  isEmbedded?: boolean
}

const SPECIAL_OCCASIONS = [
  'Birthday', 'Anniversary', 'First Date', 'Candlelight Dinner', 
  'Business Meeting', 'Family Gathering', 'Proposal', 'Celebration'
]

export function ReservationSettingsFull({ isOpen, onClose, isEmbedded = false }: ReservationSettingsFullProps) {
  const [mainTab, setMainTab] = useState('guest')
  const [guestTab, setGuestTab] = useState('general')
  const [managerTab, setManagerTab] = useState('timezone') // Changed from 'kpi-visibility' to 'timezone'
  const { toast } = useToast()
  
  const [leadTimeHours, setLeadTimeHours] = useState<number | ''>(2)
  const [cutoffTime, setCutoffTime] = useState('21:00')
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [allowSpecialNotes, setAllowSpecialNotes] = useState(false)
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
  const [requirePayment, setRequirePayment] = useState(false)
  
  // Payment settings
  const [paymentType, setPaymentType] = useState<'fixed' | 'custom'>('fixed')
  const [basePaymentAmount, setBasePaymentAmount] = useState<number | ''>(0)
  const [minPaymentAmount, setMinPaymentAmount] = useState<number | ''>(0)
  const [maxPaymentAmount, setMaxPaymentAmount] = useState<number | ''>(0)
  const [partySizePricing, setPartySizePricing] = useState<Array<{ minParty: number | ''; maxParty: number | ''; amount: number | '' }>>([])
  const [peakHoursPremium, setPeakHoursPremium] = useState<number | ''>(0)
  const [weekendPremium, setWeekendPremium] = useState<number | ''>(0)
  const [peakHoursStart, setPeakHoursStart] = useState<string>('19:00')
  const [peakHoursEnd, setPeakHoursEnd] = useState<string>('21:00')
  const [refundPolicy, setRefundPolicy] = useState<'refundable' | 'non-refundable' | 'conditional'>('refundable')
  const [refundHoursBefore, setRefundHoursBefore] = useState<number | ''>(24)
  const [chargeNoShow, setChargeNoShow] = useState(false)
  const [noShowChargeType, setNoShowChargeType] = useState<'amount' | 'percentage'>('amount')
  const [noShowChargeValue, setNoShowChargeValue] = useState<number | ''>(0)
  
  // Manager settings - KPI visibility (default to false)
  const [showAvgPartySize, setShowAvgPartySize] = useState(false)
  const [showPeakHour, setShowPeakHour] = useState(false)
  const [showCancellationRate, setShowCancellationRate] = useState(false)
  const [showThisWeek, setShowThisWeek] = useState(false)
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDay, setSelectedDay] = useState(new Date().getDay())
  const [editingSlot, setEditingSlot] = useState<Partial<TimeSlot> | null>(null)

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      loadSlots()
    }
  }, [isOpen, selectedDay])

  const loadSettings = async () => {
    try {
      const restaurant = await getRestaurant()
      const settings = restaurant.settings?.reservation_settings || {}
      const managerSettings = restaurant.settings?.manager_settings || {}
      
      console.log('Loading settings:', { settings, managerSettings })
      
      // Guest settings
      setLeadTimeHours(settings.lead_time_hours ?? 2)
      setCutoffTime(settings.cutoff_time || '21:00')
      setAutoConfirm(settings.auto_confirm !== undefined ? settings.auto_confirm : true)
      setAllowSpecialNotes(settings.allow_special_notes || false)
      setSelectedOccasions(settings.special_occasions || [])
      setRequirePayment(settings.require_payment || false)
      
      // Payment settings
      const paymentSettings = settings.payment_settings || {}
      // Always use 'fixed' payment type (selector is hidden)
      setPaymentType('fixed')
      setBasePaymentAmount(paymentSettings.base_payment_amount || 0)
      setMinPaymentAmount(paymentSettings.min_payment_amount || 0)
      setMaxPaymentAmount(paymentSettings.max_payment_amount || 0)
      setPartySizePricing(paymentSettings.party_size_pricing || [])
      setPeakHoursPremium(paymentSettings.peak_hours_premium || 0)
      setWeekendPremium(paymentSettings.weekend_premium || 0)
      setPeakHoursStart(paymentSettings.peak_hours_start || '19:00')
      setPeakHoursEnd(paymentSettings.peak_hours_end || '21:00')
      setRefundPolicy(paymentSettings.refund_policy || 'refundable')
      setRefundHoursBefore(paymentSettings.refund_hours_before || 24)
      setChargeNoShow(paymentSettings.charge_no_show || false)
      setNoShowChargeType(paymentSettings.no_show_charge_type || 'amount')
      setNoShowChargeValue(paymentSettings.no_show_charge_value || 0)
      
      // Manager settings - KPI visibility (default to false for new restaurants)
      setShowAvgPartySize(managerSettings.show_avg_party_size !== undefined ? managerSettings.show_avg_party_size : false)
      setShowPeakHour(managerSettings.show_peak_hour !== undefined ? managerSettings.show_peak_hour : false)
      setShowCancellationRate(managerSettings.show_cancellation_rate !== undefined ? managerSettings.show_cancellation_rate : false)
      setShowThisWeek(managerSettings.show_this_week !== undefined ? managerSettings.show_this_week : false)
      setTimezone(managerSettings.timezone || 'America/Los_Angeles')
    } catch (error: any) {
      console.error('Error loading settings:', error)
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to load settings', 
        variant: 'destructive' 
      })
    }
  }

  const loadSlots = async () => {
    setLoadingSlots(true)
    try {
      const data = await getTimeSlots(selectedDay, undefined)
      setSlots(data)
    } catch (error) {
      console.error('Error loading slots:', error)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSave = async () => {
    try {
      // Prepare settings to save - backend will merge with existing settings
      const settingsToSave = {
        reservation_settings: {
          lead_time_hours: leadTimeHours === '' ? 2 : leadTimeHours,
          cutoff_time: cutoffTime,
          auto_confirm: autoConfirm,
          allow_special_notes: allowSpecialNotes,
          special_occasions: selectedOccasions,
          require_payment: requirePayment,
          payment_settings: {
            payment_type: paymentType,
            base_payment_amount: basePaymentAmount === '' ? 0 : basePaymentAmount,
            min_payment_amount: minPaymentAmount === '' ? 0 : minPaymentAmount,
            max_payment_amount: maxPaymentAmount === '' ? 0 : maxPaymentAmount,
            party_size_pricing: partySizePricing.map(p => ({
              minParty: p.minParty === '' ? 1 : p.minParty,
              maxParty: p.maxParty === '' ? 1 : p.maxParty,
              amount: p.amount === '' ? 0 : p.amount
            })),
            peak_hours_premium: peakHoursPremium === '' ? 0 : peakHoursPremium,
            weekend_premium: weekendPremium === '' ? 0 : weekendPremium,
            peak_hours_start: peakHoursStart,
            peak_hours_end: peakHoursEnd,
            refund_policy: refundPolicy,
            refund_hours_before: refundHoursBefore === '' ? 24 : refundHoursBefore,
            charge_no_show: chargeNoShow,
            no_show_charge_type: noShowChargeType,
            no_show_charge_value: noShowChargeValue === '' ? 0 : noShowChargeValue
          }
        },
        manager_settings: {
          show_avg_party_size: showAvgPartySize,
          show_peak_hour: showPeakHour,
          show_cancellation_rate: showCancellationRate,
          show_this_week: showThisWeek,
          timezone: timezone
        }
      }
      
      console.log('Saving settings:', settingsToSave)
      await updateRestaurantSettings(settingsToSave)
      // Update timezone immediately
      setRestaurantTimezone(timezone)
      // Clear caches so settings reload on next visit
      sessionStorage.removeItem('reservation_settings')
      sessionStorage.removeItem('kpi_settings')
      toast({ title: 'Success', description: 'Settings saved successfully' })
      // Reload settings to ensure UI is in sync
      await loadSettings()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save settings', 
        variant: 'destructive' 
      })
    }
  }

  const handleSaveSlot = async () => {
    if (!editingSlot) return
    
    const startTime = editingSlot.start_time || '18:00'
    const endTime = editingSlot.end_time || '18:30'
    
    // Check for duplicate time slots (same start and end time) when creating a new slot
    if (!editingSlot.id) {
      const duplicateSlot = slots.find(
        slot => slot.start_time === startTime && slot.end_time === endTime
      )
      
      if (duplicateSlot) {
        toast({ 
          title: 'Duplicate Time Slot', 
          description: `A time slot with start time ${startTime} and end time ${endTime} already exists for ${DAYS_OF_WEEK[selectedDay]}. Please choose different times.`, 
          variant: 'destructive' 
        })
        return
      }
    } else {
      // When editing, check for duplicates excluding the current slot being edited
      const duplicateSlot = slots.find(
        slot => slot.id !== editingSlot.id && slot.start_time === startTime && slot.end_time === endTime
      )
      
      if (duplicateSlot) {
        toast({ 
          title: 'Duplicate Time Slot', 
          description: `A time slot with start time ${startTime} and end time ${endTime} already exists for ${DAYS_OF_WEEK[selectedDay]}. Please choose different times.`, 
          variant: 'destructive' 
        })
        return
      }
    }
    
    try {
      if (editingSlot.id) {
        await updateTimeSlot(editingSlot.id, editingSlot)
        toast({ title: 'Success', description: 'Time slot updated' })
      } else {
        await createTimeSlot({
          day_of_week: selectedDay,
          start_time: startTime,
          end_time: endTime,
          max_reservations: editingSlot.max_reservations || 4,
          is_default: true,
          is_active: true,
        } as TimeSlot)
        toast({ title: 'Success', description: 'Time slot created' })
      }
      setEditingSlot(null)
      loadSlots()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save time slot', variant: 'destructive' })
    }
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time slot?')) return
    try {
      await deleteTimeSlot(id)
      toast({ title: 'Success', description: 'Time slot deleted' })
      loadSlots()
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete time slot', variant: 'destructive' })
    }
  }

  if (!isOpen) return null

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
          {!isEmbedded && (
            <>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose}
                className="hover:bg-card/50 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold gradient-text">
                  Reservation Settings
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">Configure your restaurant's reservation system</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        {/* Main Tabs: Guest and Manager - More Prominent */}
        <div className="sticky top-0 z-50 bg-background py-4 pr-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex justify-center flex-1">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/60 border border-border p-1 rounded-lg h-14 sm:h-16">
              <TabsTrigger 
                value="guest" 
                className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground py-3 sm:py-4 px-2 sm:px-3 text-sm sm:text-base font-semibold transition-all rounded-md"
              >
                <User className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Guest
              </TabsTrigger>
              <TabsTrigger
                value="manager"
                className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground py-3 sm:py-4 px-2 sm:px-3 text-sm sm:text-base font-semibold transition-all rounded-md"
              >
                <Shield className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Manager
              </TabsTrigger>
            </TabsList>
          </div>
          <Button 
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto shrink-0 sm:pr-4"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>

        {/* Guest Settings */}
        <TabsContent value="guest" className="mt-4 sm:mt-6">
          <Tabs value={guestTab} onValueChange={setGuestTab} className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Vertical Tabs on Left */}
            <TabsList className="flex flex-row lg:flex-col w-full lg:w-64 h-fit bg-card/60 border border-border p-2 rounded-xl lg:sticky lg:top-24 lg:self-start">
              <TabsTrigger 
                value="general" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground hover:text-foreground justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="time-slots"
                className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground hover:text-foreground justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <Clock className="mr-2 h-4 w-4" />
                Time Slots
              </TabsTrigger>
              <TabsTrigger 
                value="payments"
                className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground hover:text-foreground justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Payments
              </TabsTrigger>
            </TabsList>

            {/* Content Area on Right */}
            <div className="flex-1 min-w-0">
              <TabsContent value="general" className="space-y-4 sm:space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Lead Time & Cutoff */}
                <div className="relative">
                  <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                  <Card className="relative rounded-2xl border border-border bg-card shadow-2xl  backdrop-blur-xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl gradient-text">Lead Time & Cutoff</CardTitle>
                          <CardDescription className="text-muted-foreground">Configure booking time restrictions</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-10">
                      <div className="space-y-3">
                        <Label htmlFor="lead-time" className="text-sm font-medium">Minimum Lead Time (hours)</Label>
                        <Input
                          id="lead-time"
                          type="number"
                          value={leadTimeHours}
                          onChange={(e) => {
                            const val = e.target.value
                            setLeadTimeHours(val === '' ? '' : (parseInt(val) || 0))
                          }}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              setLeadTimeHours(2)
                            }
                          }}
                          className="bg-card/50 border-border focus:border-primary/50"
                          placeholder="2"
                        />
                        <p className="text-xs text-muted-foreground">Minimum hours before booking is allowed</p>
                      </div>
                      <Separator className="bg-border" />
                      <div className="space-y-3">
                        <Label htmlFor="cutoff-time" className="text-sm font-medium">Daily Cutoff Time</Label>
                        <Input
                          id="cutoff-time"
                          type="time"
                          value={cutoffTime}
                          onChange={(e) => setCutoffTime(e.target.value)}
                          className="bg-card/50 border-border focus:border-primary/50"
                        />
                        <p className="text-xs text-muted-foreground">Latest time bookings can be made</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Column 2: Confirmation and Special Notes stacked */}
                <div className="space-y-6">
                  {/* Confirmation Settings */}
                  <div className="relative">
                    <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                    <Card className="relative rounded-2xl border border-border bg-card shadow-2xl  backdrop-blur-xl">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <Zap className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl gradient-text">Confirmation</CardTitle>
                            <CardDescription className="text-muted-foreground">Auto-confirmation settings</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                          <div className="space-y-1">
                            <Label className="font-medium"></Label>
                            <p className="text-sm text-muted-foreground">Automatically confirm bookings without <br /> manual approval</p>
                          </div>
                          <Switch 
                            checked={autoConfirm} 
                            onCheckedChange={setAutoConfirm}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Special Notes */}
                  <div className="relative">
                    <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                    <Card className="relative rounded-2xl border border-border bg-card shadow-2xl  backdrop-blur-xl">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl gradient-text">Special Notes</CardTitle>
                            <CardDescription className="text-muted-foreground">Allow guests to add special requests</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                          <div className="space-y-1">
                            <Label className="font-medium"></Label>
                            <p className="text-sm text-muted-foreground">Guests can add special requests during reservation</p>
                          </div>
                          <Switch 
                            checked={allowSpecialNotes} 
                            onCheckedChange={setAllowSpecialNotes}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              {/* Special Occasions - Full Width */}
              <div className="relative">
                <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                <Card className="relative rounded-2xl border border-border bg-card shadow-2xl  backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl gradient-text">Special Occasions</CardTitle>
                        <CardDescription className="text-muted-foreground">Select which occasions guests can choose from</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {SPECIAL_OCCASIONS.map(occasion => (
                        <div
                          key={occasion}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            selectedOccasions.includes(occasion)
                              ? 'bg-primary/20 border-primary/50 text-primary'
                              : 'bg-card/50 border-border text-muted-foreground hover:bg-card hover:text-foreground'
                          }`}
                          onClick={() => setSelectedOccasions(prev => 
                            prev.includes(occasion) 
                              ? prev.filter(o => o !== occasion)
                              : [...prev, occasion]
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {selectedOccasions.includes(occasion) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                            <span className="font-medium text-sm">{occasion}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              <TabsContent value="time-slots" className="space-y-6 mt-0">
              <div className="relative">
                <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                <Card className="relative rounded-2xl border border-border bg-card shadow-2xl  backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl gradient-text">Time Slot Management</CardTitle>
                        <CardDescription className="text-muted-foreground">Configure available time slots for each day</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Day Selector */}
                    <div className="space-y-4">
                      <Label className="font-medium">Select Day</Label>
                      <div className="flex gap-2 flex-wrap">
                        {DAYS_OF_WEEK.map((day, i) => (
                          <Button 
                            key={day} 
                            variant={selectedDay === i ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => {
                              setSelectedDay(i)
                              setSlots([]) // Clear previous slots immediately
                            }}
                            className={selectedDay === i 
                              ? 'bg-primary text-white' 
                              : 'bg-card/50 border-border text-muted-foreground hover:bg-card hover:text-foreground'
                            }
                          >
                            {day.slice(0,3)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Add Slot Button */}
                    <Button 
                      onClick={() => setEditingSlot({
                        day_of_week: selectedDay,
                        start_time: '18:00',
                        end_time: '18:30',
                        max_reservations: 4,
                      })}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Time Slot
                    </Button>

                    {/* Slots List */}
                    <div className="space-y-3">
                      {loadingSlots ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                          <p>Loading time slots...</p>
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No time slots configured for {DAYS_OF_WEEK[selectedDay]}</p>
                        </div>
                      ) : (
                        slots.map(slot => (
                          <div 
                            key={slot.id} 
                            className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border hover:bg-card transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-primary/20 rounded-lg">
                                <Clock className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{slot.start_time} - {slot.end_time}</p>
                                <p className="text-sm text-muted-foreground">Max: {slot.max_reservations} reservations</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingSlot(slot)}
                                className="bg-card/50 border-border text-muted-foreground hover:bg-card hover:text-foreground"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDeleteSlot(slot.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              </TabsContent>

              <TabsContent value="payments" className="space-y-4 sm:space-y-6 mt-0">
                {/* Payment Type & Basic Amount */}
                <div className="relative">
                  <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                  <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg sm:text-xl gradient-text">Payment Type & Amount</CardTitle>
                          <CardDescription className="text-xs sm:text-sm text-muted-foreground">Configure how payment amounts are determined</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                        <div className="space-y-1">
                          <Label className="font-medium text-sm sm:text-base">Require Payment to Confirm</Label>
                          <p className="text-xs sm:text-sm text-muted-foreground">Guests must pay before their reservation is confirmed</p>
                        </div>
                        <Switch 
                          checked={requirePayment} 
                          onCheckedChange={setRequirePayment}
                        />
                      </div>
                      
                      {requirePayment && (
                        <>
                          <Separator className="bg-border" />
                          
                          {/* Payment Type Selector - Commented out, always using 'fixed' */}
                          {/* <div className="space-y-3">
                            <Label className="text-sm font-medium">Payment Type</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                type="button"
                                variant={paymentType === 'fixed' ? 'default' : 'outline'}
                                onClick={() => setPaymentType('fixed')}
                                className={paymentType === 'fixed' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-card/50 border-border hover:bg-card'
                                }
                              >
                                Fixed Amount
                              </Button>
                              <Button
                                type="button"
                                variant={paymentType === 'custom' ? 'default' : 'outline'}
                                onClick={() => setPaymentType('custom')}
                                className={paymentType === 'custom' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-card/50 border-border hover:bg-card'
                                }
                              >
                                Custom Amount
                              </Button>
                            </div>
                          </div> */}

                          {/* Always use 'fixed' payment type */}
                          {paymentType === 'fixed' && (
                            <div className="space-y-3">
                              <Label htmlFor="base-amount" className="text-sm font-medium">Base Payment Amount ($)</Label>
                              <Input
                                id="base-amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={basePaymentAmount}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setBasePaymentAmount(val === '' ? '' : (parseFloat(val) || 0))
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    setBasePaymentAmount(0)
                                  }
                                }}
                                className="bg-card/50 border-border focus:border-primary/50"
                                placeholder="0.00"
                              />
                              <p className="text-xs text-muted-foreground">Fixed amount guests must pay</p>
                            </div>
                          )}

                          {paymentType === 'custom' && (
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <Label htmlFor="min-amount" className="text-sm font-medium">Minimum Payment Amount ($)</Label>
                                <Input
                                  id="min-amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={minPaymentAmount}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setMinPaymentAmount(val === '' ? '' : (parseFloat(val) || 0))
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      setMinPaymentAmount(0)
                                    }
                                  }}
                                  className="bg-card/50 border-border focus:border-primary/50"
                                  placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground">Minimum amount guests can pay</p>
                              </div>
                              <div className="space-y-3">
                                <Label htmlFor="max-amount" className="text-sm font-medium">Maximum Payment Amount ($)</Label>
                                <Input
                                  id="max-amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={maxPaymentAmount}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setMaxPaymentAmount(val === '' ? '' : (parseFloat(val) || 0))
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      setMaxPaymentAmount(0)
                                    }
                                  }}
                                  className="bg-card/50 border-border focus:border-primary/50"
                                  placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground">Maximum amount guests can pay (0 = no limit)</p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Party Size-Based Pricing */}
                {requirePayment && paymentType === 'fixed' && (
                  <div className="relative">
                    <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                    <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg sm:text-xl gradient-text">Party Size-Based Pricing</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-muted-foreground">Set different payment amounts based on party size</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {partySizePricing.length === 0 ? (
                          <div className="text-center py-6 px-4 bg-muted/30 rounded-lg border border-dashed border-border">
                            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium text-foreground">No party size pricing configured</p>
                            <p className="text-xs mt-1 text-muted-foreground">Base payment amount will be used for all party sizes</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-xs text-muted-foreground mb-2 px-1">
                              Configure pricing rules for different party sizes. Guests will pay the amount specified for their party size range.
                            </div>
                            {partySizePricing.map((pricing, index) => (
                              <div key={index} className="p-4 bg-card/50 rounded-lg border border-border">
                                <div className="flex items-end gap-3">
                                  <div className="flex-1 grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                      <Label htmlFor={`min-party-${index}`} className="text-xs font-medium text-foreground">
                                        Party Size (From)
                                      </Label>
                                      <Input
                                        id={`min-party-${index}`}
                                        type="number"
                                        min="1"
                                        value={pricing.minParty}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          const newPricing = [...partySizePricing]
                                          newPricing[index].minParty = val === '' ? '' : (parseInt(val) || 1)
                                          setPartySizePricing(newPricing)
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === '') {
                                            const newPricing = [...partySizePricing]
                                            newPricing[index].minParty = 1
                                            setPartySizePricing(newPricing)
                                          }
                                        }}
                                        className="bg-background/50 border-border text-sm"
                                        placeholder="1"
                                      />
                                      <p className="text-xs text-muted-foreground">Min party size</p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label htmlFor={`max-party-${index}`} className="text-xs font-medium text-foreground">
                                        Party Size (To)
                                      </Label>
                                      <Input
                                        id={`max-party-${index}`}
                                        type="number"
                                        min="1"
                                        value={pricing.maxParty}
                                        onChange={(e) => {
                                          const val = e.target.value
                                          const newPricing = [...partySizePricing]
                                          newPricing[index].maxParty = val === '' ? '' : (parseInt(val) || 1)
                                          setPartySizePricing(newPricing)
                                        }}
                                        onBlur={(e) => {
                                          if (e.target.value === '') {
                                            const newPricing = [...partySizePricing]
                                            newPricing[index].maxParty = 1
                                            setPartySizePricing(newPricing)
                                          }
                                        }}
                                        className="bg-background/50 border-border text-sm"
                                        placeholder="2"
                                      />
                                      <p className="text-xs text-muted-foreground">Max party size</p>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label htmlFor={`amount-${index}`} className="text-xs font-medium text-foreground">
                                        Payment Amount ($)
                                      </Label>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">$</span>
                                        <Input
                                          id={`amount-${index}`}
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={pricing.amount}
                                          onChange={(e) => {
                                            const val = e.target.value
                                            const newPricing = [...partySizePricing]
                                            newPricing[index].amount = val === '' ? '' : (parseFloat(val) || 0)
                                            setPartySizePricing(newPricing)
                                          }}
                                          onBlur={(e) => {
                                            if (e.target.value === '') {
                                              const newPricing = [...partySizePricing]
                                              newPricing[index].amount = 0
                                              setPartySizePricing(newPricing)
                                            }
                                          }}
                                          className="bg-background/50 border-border text-sm flex-1"
                                          placeholder="0.00"
                                        />
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        For {pricing.minParty}-{pricing.maxParty} guests
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setPartySizePricing(partySizePricing.filter((_, i) => i !== index))}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0 mb-1.5"
                                    title="Remove this pricing rule"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPartySizePricing([...partySizePricing, { minParty: 1, maxParty: 2, amount: 0 }])}
                          className="w-full border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Party Size Pricing
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Dynamic Pricing */}
                {requirePayment && paymentType === 'fixed' && (
                  <>
                    {/* Peak Hours Premium Card */}
                    <div className="relative">
                      <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                      <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg">
                              <Clock className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg sm:text-xl gradient-text">Peak Hours Premium</CardTitle>
                              <CardDescription className="text-xs sm:text-sm text-muted-foreground">Add premium for peak hours</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="peak-start" className="text-xs font-medium text-foreground">Start Time</Label>
                              <Input
                                id="peak-start"
                                type="time"
                                value={peakHoursStart}
                                onChange={(e) => setPeakHoursStart(e.target.value)}
                                className="bg-card/50 border-border focus:border-primary/50 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="peak-end" className="text-xs font-medium text-foreground">End Time</Label>
                              <Input
                                id="peak-end"
                                type="time"
                                value={peakHoursEnd}
                                onChange={(e) => setPeakHoursEnd(e.target.value)}
                                className="bg-card/50 border-border focus:border-primary/50 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="peak-premium" className="text-xs font-medium text-foreground">Premium Amount ($)</Label>
                              <Input
                                id="peak-premium"
                                type="number"
                                step="0.01"
                                min="0"
                                value={peakHoursPremium}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setPeakHoursPremium(val === '' ? '' : (parseFloat(val) || 0))
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === '') {
                                    setPeakHoursPremium(0)
                                  }
                                }}
                                className="bg-card/50 border-border focus:border-primary/50 text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">Additional amount charged during peak hours</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Weekend Premium Card */}
                    <div className="relative">
                      <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                      <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-lg">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg sm:text-xl gradient-text">Weekend Premium</CardTitle>
                              <CardDescription className="text-xs sm:text-sm text-muted-foreground">Add premium for weekends</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="weekend-premium" className="text-sm font-medium">Premium Amount ($)</Label>
                            <Input
                              id="weekend-premium"
                              type="number"
                              step="0.01"
                              min="0"
                              value={weekendPremium}
                              onChange={(e) => {
                                const val = e.target.value
                                setWeekendPremium(val === '' ? '' : (parseFloat(val) || 0))
                              }}
                              onBlur={(e) => {
                                if (e.target.value === '') {
                                  setWeekendPremium(0)
                                }
                              }}
                              className="bg-card/50 border-border focus:border-primary/50"
                              placeholder="0.00"
                            />
                            <p className="text-xs text-muted-foreground">Additional amount charged on weekends (Saturday & Sunday)</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Refund Policy */}
                {requirePayment && (
                  <div className="relative">
                    <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                    <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg sm:text-xl gradient-text">Refund Policy</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-muted-foreground">Configure refund rules for cancellations</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 sm:space-y-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Refund Policy Type</Label>
                          <Select value={refundPolicy} onValueChange={(value: 'refundable' | 'non-refundable' | 'conditional') => setRefundPolicy(value)}>
                            <SelectTrigger className="bg-card/50 border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="refundable">Fully Refundable</SelectItem>
                              <SelectItem value="non-refundable">Non-Refundable</SelectItem>
                              <SelectItem value="conditional">Conditional (Refundable if cancelled X hours before)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {refundPolicy === 'conditional' && (
                          <div className="space-y-3">
                            <Label htmlFor="refund-hours" className="text-sm font-medium">Hours Before Reservation</Label>
                            <Input
                              id="refund-hours"
                              type="number"
                              min="1"
                              value={refundHoursBefore}
                              onChange={(e) => {
                                const val = e.target.value
                                setRefundHoursBefore(val === '' ? '' : (parseInt(val) || 24))
                              }}
                              onBlur={(e) => {
                                if (e.target.value === '') {
                                  setRefundHoursBefore(24)
                                }
                              }}
                              className="bg-card/50 border-border focus:border-primary/50"
                              placeholder="24"
                            />
                            <p className="text-xs text-muted-foreground">Payment is refundable if cancelled this many hours before the reservation</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* No-Show Policy - Commented out, can be restored later */}
                {/* {requirePayment && (
                  <div className="relative">
                    <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                    <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/20 rounded-lg">
                            <XCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg sm:text-xl gradient-text">No-Show Policy</CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-muted-foreground">Configure charges for no-shows</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 sm:space-y-6">
                        <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                          <div className="space-y-1">
                            <Label className="font-medium text-sm sm:text-base">Charge for No-Shows</Label>
                            <p className="text-xs sm:text-sm text-muted-foreground">Automatically charge guests who don't show up</p>
                          </div>
                          <Switch 
                            checked={chargeNoShow} 
                            onCheckedChange={setChargeNoShow}
                          />
                        </div>
                        {chargeNoShow && (
                          <>
                            <Separator className="bg-border" />
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Charge Type</Label>
                                <div className="grid grid-cols-2 gap-3">
                                  <Button
                                    type="button"
                                    variant={noShowChargeType === 'amount' ? 'default' : 'outline'}
                                    onClick={() => setNoShowChargeType('amount')}
                                    className={noShowChargeType === 'amount' 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-card/50 border-border hover:bg-card'
                                    }
                                  >
                                    Fixed Amount
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={noShowChargeType === 'percentage' ? 'default' : 'outline'}
                                    onClick={() => setNoShowChargeType('percentage')}
                                    className={noShowChargeType === 'percentage' 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-card/50 border-border hover:bg-card'
                                    }
                                  >
                                    Percentage
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <Label htmlFor="no-show-value" className="text-sm font-medium">
                                  {noShowChargeType === 'amount' ? 'Charge Amount ($)' : 'Charge Percentage (%)'}
                                </Label>
                                <Input
                                  id="no-show-value"
                                  type="number"
                                  step={noShowChargeType === 'amount' ? '0.01' : '1'}
                                  min="0"
                                  max={noShowChargeType === 'percentage' ? '100' : undefined}
                                  value={noShowChargeValue}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setNoShowChargeValue(val === '' ? '' : (parseFloat(val) || 0))
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      setNoShowChargeValue(0)
                                    }
                                  }}
                                  className="bg-card/50 border-border focus:border-primary/50"
                                  placeholder={noShowChargeType === 'amount' ? '0.00' : '0'}
                                />
                                <p className="text-xs text-muted-foreground">
                                  {noShowChargeType === 'amount' 
                                    ? 'Fixed amount to charge for no-shows' 
                                    : 'Percentage of payment amount to charge for no-shows'}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )} */}
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>

        {/* Manager Settings */}
        <TabsContent value="manager" className="mt-4 sm:mt-6">
          <Tabs value={managerTab} onValueChange={setManagerTab} className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Vertical Tabs on Left */}
            <TabsList className="flex flex-row lg:flex-col w-full lg:w-64 h-fit bg-card/60 border border-border p-2 rounded-xl lg:sticky lg:top-24 lg:self-start">
              {/* HIDDEN: KPI Visibility Tab - Uncomment to restore */}
              {/* <TabsTrigger 
                value="kpi-visibility" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground hover:text-foreground justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <BarChart className="mr-2 h-4 w-4" />
                KPI Visibility
              </TabsTrigger> */}
              <TabsTrigger 
                value="timezone"
                className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground hover:text-foreground justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <Globe className="mr-2 h-4 w-4" />
                Timezone
              </TabsTrigger>
            </TabsList>

            {/* Content Area on Right */}
            <div className="flex-1 min-w-0">
              {/* HIDDEN: KPI Visibility Tab Content - Uncomment to restore */}
              {/* <TabsContent value="kpi-visibility" className="space-y-4 sm:space-y-6 mt-0">
                <div className="relative">
                  <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                  <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <BarChart className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl gradient-text">KPI Visibility</CardTitle>
                          <CardDescription className="text-muted-foreground">Control which metrics are displayed on the dashboard</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-blue-400" />
                          <div className="space-y-1">
                            <Label className="font-medium">Average Party Size</Label>
                            <p className="text-sm text-muted-foreground">Show average party size per reservation</p>
                          </div>
                        </div>
                        <Switch 
                          checked={showAvgPartySize} 
                          onCheckedChange={setShowAvgPartySize}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-purple-400" />
                          <div className="space-y-1">
                            <Label className="font-medium">Peak Hour</Label>
                            <p className="text-sm text-muted-foreground">Show most popular reservation time</p>
                          </div>
                        </div>
                        <Switch 
                          checked={showPeakHour} 
                          onCheckedChange={setShowPeakHour}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-4 w-4 text-red-400" />
                          <div className="space-y-1">
                            <Label className="font-medium">Cancellation Rate</Label>
                            <p className="text-sm text-muted-foreground">Show reservation cancellation percentage</p>
                          </div>
                        </div>
                        <Switch 
                          checked={showCancellationRate} 
                          onCheckedChange={setShowCancellationRate}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-green-400" />
                          <div className="space-y-1">
                            <Label className="font-medium">This Week</Label>
                            <p className="text-sm text-muted-foreground">Show upcoming reservations for this week</p>
                          </div>
                        </div>
                        <Switch 
                          checked={showThisWeek} 
                          onCheckedChange={setShowThisWeek}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent> */}

              {/* Timezone Tab */}
              <TabsContent value="timezone" className="space-y-4 sm:space-y-6 mt-0">
                <div className="relative">
                  <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                  <Card className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Globe className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl gradient-text">Timezone</CardTitle>
                          <CardDescription className="text-muted-foreground">Set the timezone for your restaurant location</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <Label htmlFor="timezone" className="text-sm font-medium">Restaurant Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                          <SelectTrigger id="timezone" className="bg-card/50 border-border focus:border-primary/50">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border max-h-[300px]">
                            <SelectGroup>
                              <SelectLabel className="text-xs text-muted-foreground px-2 py-1.5">US Timezones</SelectLabel>
                              <SelectItem value="America/Los_Angeles">Pacific Time (PT) - Los Angeles</SelectItem>
                              <SelectItem value="America/Denver">Mountain Time (MT) - Denver</SelectItem>
                              <SelectItem value="America/Phoenix">Mountain Time (MST) - Phoenix (No DST)</SelectItem>
                              <SelectItem value="America/Chicago">Central Time (CT) - Chicago</SelectItem>
                              <SelectItem value="America/New_York">Eastern Time (ET) - New York</SelectItem>
                              <SelectItem value="America/Anchorage">Alaska Time (AKT) - Anchorage</SelectItem>
                              <SelectItem value="Pacific/Honolulu">Hawaii Time (HST) - Honolulu</SelectItem>
                            </SelectGroup>
                            <SelectSeparator className="bg-border my-1" />
                            <SelectGroup>
                              <SelectLabel className="text-xs text-muted-foreground px-2 py-1.5">International</SelectLabel>
                              <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                              <SelectItem value="Europe/London">GMT/UTC - London</SelectItem>
                              <SelectItem value="Asia/Kolkata">IST (Indian Standard Time) - Mumbai</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">All times on the dashboard will be displayed in this timezone</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Edit Slot Dialog */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingSlot.id ? 'Edit' : 'Add'} Time Slot
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingSlot(null)}>
                ×
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editingSlot.start_time || ''}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, start_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editingSlot.end_time || ''}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, end_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Max Reservations</Label>
                <Input
                  type="number"
                  min="1"
                  value={editingSlot.max_reservations || 4}
                  onChange={(e) =>
                    setEditingSlot({
                      ...editingSlot,
                      max_reservations: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingSlot(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSlot}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

