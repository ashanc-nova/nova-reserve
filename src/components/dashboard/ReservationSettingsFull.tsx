import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'
import { Plus, Trash2, Save, ArrowLeft, Check, Edit, Clock, Calendar, Settings, Star, MessageSquare, Zap, User, Shield, BarChart, TrendingUp, Users, Globe } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator, SelectGroup } from '../ui/select'
import { useToast } from '../../hooks/use-toast'
import { getRestaurant, updateRestaurantSettings } from '../../lib/supabase-data'
import { getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } from '../../lib/supabase-data'
import { setRestaurantTimezone } from '../../lib/timezone-utils'
import type { TimeSlot } from '../../lib/supabase'

interface ReservationSettingsFullProps {
  isOpen: boolean
  onClose: () => void
}

const SPECIAL_OCCASIONS = [
  'Birthday', 'Anniversary', 'First Date', 'Candlelight Dinner', 
  'Business Meeting', 'Family Gathering', 'Proposal', 'Celebration'
]

export function ReservationSettingsFull({ isOpen, onClose }: ReservationSettingsFullProps) {
  const [mainTab, setMainTab] = useState('guest')
  const [guestTab, setGuestTab] = useState('general')
  const { toast } = useToast()
  
  const [leadTimeHours, setLeadTimeHours] = useState(2)
  const [cutoffTime, setCutoffTime] = useState('21:00')
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [allowSpecialNotes, setAllowSpecialNotes] = useState(false)
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
  
  // Manager settings - KPI visibility (default to false)
  const [showAvgPartySize, setShowAvgPartySize] = useState(false)
  const [showPeakHour, setShowPeakHour] = useState(false)
  const [showCancellationRate, setShowCancellationRate] = useState(false)
  const [showThisWeek, setShowThisWeek] = useState(false)
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  
  const [slots, setSlots] = useState<TimeSlot[]>([])
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
    try {
      const data = await getTimeSlots(selectedDay, undefined)
      setSlots(data)
    } catch (error) {
      console.error('Error loading slots:', error)
    }
  }

  const handleSave = async () => {
    try {
      // Prepare settings to save - backend will merge with existing settings
      const settingsToSave = {
        reservation_settings: {
          lead_time_hours: leadTimeHours,
          cutoff_time: cutoffTime,
          auto_confirm: autoConfirm,
          allow_special_notes: allowSpecialNotes,
          special_occasions: selectedOccasions
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
    try {
      if (editingSlot.id) {
        await updateTimeSlot(editingSlot.id, editingSlot)
        toast({ title: 'Success', description: 'Time slot updated' })
      } else {
        await createTimeSlot({
          day_of_week: selectedDay,
          start_time: editingSlot.start_time || '18:00',
          end_time: editingSlot.end_time || '18:30',
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
    <div className="space-y-6 px-8 md:px-16 lg:px-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="hover:bg-card/50 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold gradient-text">
              Reservation Settings
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">Configure your restaurant's reservation system</p>
          </div>
        </div>
        <Button 
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Settings
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        {/* Main Tabs: Guest and Manager - More Prominent */}
        <div className="flex justify-center h-24">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-card/60 border border-white/10 p-1 rounded-lg h-16">
            <TabsTrigger 
              value="guest" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground py-4 px-3 text-base font-semibold transition-all rounded-md"
            >
              <User className="mr-2 h-5 w-5" />
              Guest
            </TabsTrigger>
            <TabsTrigger 
              value="manager"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg text-muted-foreground hover:text-foreground py-4 px-3 text-base font-semibold transition-all rounded-md"
            >
              <Shield className="mr-2 h-5 w-5" />
              Manager
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Guest Settings */}
        <TabsContent value="guest" className="mt-6">
          <Tabs value={guestTab} onValueChange={setGuestTab} className="flex gap-6">
            {/* Vertical Tabs on Left */}
            <TabsList className="flex flex-col w-64 h-fit bg-card/60 border border-white/10 p-2 rounded-xl">
              <TabsTrigger 
                value="general" 
                className="data-[state=active]:bg-card data-[state=active]:text-white text-muted-foreground hover:text-white justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <Settings className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="time-slots"
                className="data-[state=active]:bg-card data-[state=active]:text-white text-muted-foreground hover:text-white justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <Clock className="mr-2 h-4 w-4" />
                Time Slots
              </TabsTrigger>
              <TabsTrigger 
                value="occasions"
                className="data-[state=active]:bg-card data-[state=active]:text-white text-muted-foreground hover:text-white justify-start py-3 px-4 text-sm font-medium w-full"
              >
                <Star className="mr-2 h-4 w-4" />
                Occasions
              </TabsTrigger>
            </TabsList>

            {/* Content Area on Right */}
            <div className="flex-1">
              <TabsContent value="general" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lead Time & Cutoff */}
                <div className="relative">
                  <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                  <Card className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="lead-time" className="text-sm font-medium">Minimum Lead Time (hours)</Label>
                        <Input
                          id="lead-time"
                          type="number"
                          value={leadTimeHours}
                          onChange={(e) => setLeadTimeHours(parseInt(e.target.value) || 2)}
                          className="bg-card/50 border-white/10 focus:border-primary/50"
                          placeholder="2"
                        />
                        <p className="text-xs text-muted-foreground">Minimum hours before booking is allowed</p>
                      </div>
                      <Separator className="bg-white/10" />
                      <div className="space-y-3">
                        <Label htmlFor="cutoff-time" className="text-sm font-medium">Daily Cutoff Time</Label>
                        <Input
                          id="cutoff-time"
                          type="time"
                          value={cutoffTime}
                          onChange={(e) => setCutoffTime(e.target.value)}
                          className="bg-card/50 border-white/10 focus:border-primary/50"
                        />
                        <p className="text-xs text-muted-foreground">Latest time bookings can be made</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Confirmation Settings */}
                <div className="relative">
                  <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                  <Card className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
                      <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-white/10">
                        <div className="space-y-1">
                          <Label className="font-medium">Auto-Confirm Reservations</Label>
                          <p className="text-sm text-muted-foreground">Automatically confirm bookings without manual approval</p>
                        </div>
                        <Switch 
                          checked={autoConfirm} 
                          onCheckedChange={setAutoConfirm}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Special Notes */}
              <div className="relative">
                <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                <Card className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
                    <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-white/10">
                      <div className="space-y-1">
                        <Label className="font-medium">Enable Special Notes</Label>
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
              </TabsContent>

              <TabsContent value="time-slots" className="space-y-6 mt-0">
              <div className="relative">
                <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                <Card className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
                            onClick={() => setSelectedDay(i)}
                            className={selectedDay === i 
                              ? 'bg-primary text-white' 
                              : 'bg-card/50 border-white/10 text-muted-foreground hover:bg-card hover:text-white'
                            }
                          >
                            {day.slice(0,3)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

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
                      {slots.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No time slots configured for {DAYS_OF_WEEK[selectedDay]}</p>
                        </div>
                      ) : (
                        slots.map(slot => (
                          <div 
                            key={slot.id} 
                            className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-white/10 hover:bg-card transition-all"
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
                                className="bg-card/50 border-white/10 text-muted-foreground hover:bg-card hover:text-white"
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

              <TabsContent value="occasions" className="space-y-6 mt-0">
              <div className="relative">
                <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                <Card className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
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
                              : 'bg-card/50 border-white/10 text-muted-foreground hover:bg-card hover:text-white'
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
            </div>
          </Tabs>
        </TabsContent>

        {/* Manager Settings */}
        <TabsContent value="manager" className="space-y-6">
          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <Card className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  
                  
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* KPI Visibility Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <BarChart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold gradient-text">KPI Visibility</h3>
                      <p className="text-sm text-muted-foreground">Control which metrics are displayed on the dashboard</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pl-12">
                    {/* Avg Party Size */}
                    <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-white/10">
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

                    {/* Peak Hour */}
                    <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-white/10">
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

                    {/* Cancellation Rate */}
                    <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-white/10">
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

                    {/* This Week */}
                    <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-white/10">
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
                  </div>
                </div>

                {/* Timezone Settings */}
                <Separator className="bg-white/10 my-6" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold gradient-text">Timezone</h3>
                      <p className="text-sm text-muted-foreground">Set the timezone for your restaurant location</p>
                    </div>
                  </div>
                  
                  <div className="pl-12">
                    <div className="space-y-3">
                      <Label htmlFor="timezone" className="text-sm font-medium">Restaurant Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger id="timezone" className="bg-card/50 border-white/10 focus:border-primary/50 w-full max-w-md">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0C1020] border-white/10 max-h-[300px]">
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
                          <SelectSeparator className="bg-white/10 my-1" />
                          <SelectGroup>
                            <SelectLabel className="text-xs text-muted-foreground px-2 py-1.5">International</SelectLabel>
                            <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                            <SelectItem value="Europe/London">GMT/UTC - London</SelectItem>
                            <SelectItem value="Asia/Kolkata">IST (Indian Standard Time) - Mumbai</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">All times on the dashboard will be displayed in this timezone</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Slot Dialog */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0C1020] border border-white/10 rounded-lg p-6 w-full max-w-md">
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

