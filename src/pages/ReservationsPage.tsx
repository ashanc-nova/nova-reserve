import { useState, useEffect } from 'react'
import { useGlobalState } from '../lib/global-state'
import { ReservationsTable } from '../components/dashboard/ReservationsTable'
import { ReservationSettingsFull } from '../components/dashboard/ReservationSettingsFull'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Settings, Calendar, Clock, Users, TrendingUp } from 'lucide-react'
import { addDays } from 'date-fns'
import { getRestaurant } from '../lib/supabase-data'
import { setRestaurantTimezone, getZonedDate, formatTimeInTimezone } from '../lib/timezone-utils'

export default function ReservationsPage() {
  const { allReservations, loading, error, tables } = useGlobalState()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [kpiVisibility, setKpiVisibility] = useState({
    showAvgPartySize: true,
    showPeakHour: true,
    showCancellationRate: true,
    showThisWeek: true
  })

  useEffect(() => {
    const loadKpiSettings = async () => {
      try {
        const restaurant = await getRestaurant()
        const managerSettings = restaurant.settings?.manager_settings || {}
        setKpiVisibility({
          showAvgPartySize: managerSettings.show_avg_party_size !== undefined ? managerSettings.show_avg_party_size : false,
          showPeakHour: managerSettings.show_peak_hour !== undefined ? managerSettings.show_peak_hour : false,
          showCancellationRate: managerSettings.show_cancellation_rate !== undefined ? managerSettings.show_cancellation_rate : false,
          showThisWeek: managerSettings.show_this_week !== undefined ? managerSettings.show_this_week : false
        })
        // Set timezone for date formatting
        if (managerSettings.timezone) {
          setRestaurantTimezone(managerSettings.timezone)
        }
      } catch (error) {
        console.error('Error loading KPI visibility settings:', error)
      }
    }
    loadKpiSettings()
  }, [isSettingsOpen]) // Reload when settings modal closes

  if (loading.reservations) {
    return (
      <div className="relative">
        <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
        <div className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) return <div className="text-red-400">{error}</div>

  // Calculate useful metrics
  const today = new Date()
  const nextWeek = addDays(today, 7)
  
  const thisWeekReservations = allReservations.filter(r => {
    const resDate = getZonedDate(r.date_time)
    const zonedToday = getZonedDate(today)
    const zonedNextWeek = getZonedDate(nextWeek)
    return resDate >= zonedToday && resDate <= zonedNextWeek
  })
  
  const averagePartySize = allReservations.length > 0 
    ? (allReservations.reduce((sum, r) => sum + r.party_size, 0) / allReservations.length).toFixed(1)
    : '0'
  
  const peakHourReservations = allReservations.reduce((acc, r) => {
    const zonedDate = getZonedDate(r.date_time)
    const hour = zonedDate.getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  
  const peakHour = Object.entries(peakHourReservations)
    .sort(([,a], [,b]) => b - a)[0]
  
  // Format peak hour in timezone
  const peakHourFormatted = peakHour ? (() => {
    const date = new Date()
    date.setHours(peakHour[0], 0, 0, 0)
    return formatTimeInTimezone(date)
  })() : 'N/A'
  
  const cancelledCount = allReservations.filter(r => r.status === 'cancelled').length
  
  const cancellationRate = allReservations.length > 0 
    ? ((cancelledCount / allReservations.length) * 100).toFixed(1)
    : '0'

  if (isSettingsOpen) {
    return <ReservationSettingsFull isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
  }

  return (
    <div className="space-y-6 px-8 md:px-16 lg:px-24">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Reservations</h2>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setIsSettingsOpen(true)}
          className="bg-card/50 hover:bg-card border-primary/20"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Dashboard Metrics */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${Object.values(kpiVisibility).filter(Boolean).length <= 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
        {/* Average Party Size */}
        {kpiVisibility.showAvgPartySize && (
        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-400/10 opacity-50 blur-lg"></div>
          <Card className="relative rounded-xl border border-white/10 bg-[#0C1020]/80 shadow-xl backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg gradient-text">Avg Party Size</CardTitle>
                  <CardDescription className="text-muted-foreground">Per Reservation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{averagePartySize}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {allReservations.length} total reservations
              </p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Peak Hour */}
        {kpiVisibility.showPeakHour && (
        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-400/10 opacity-50 blur-lg"></div>
          <Card className="relative rounded-xl border border-white/10 bg-[#0C1020]/80 shadow-xl backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg gradient-text">Peak Hour</CardTitle>
                  <CardDescription className="text-muted-foreground">Most Popular Time</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">
                {peakHourFormatted}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {peakHour ? `${peakHour[1]} reservations` : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Cancellation Rate */}
        {kpiVisibility.showCancellationRate && (
        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-red-600/20 to-red-400/10 opacity-50 blur-lg"></div>
          <Card className="relative rounded-xl border border-white/10 bg-[#0C1020]/80 shadow-xl backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-lg gradient-text">Cancellation Rate</CardTitle>
                  <CardDescription className="text-muted-foreground">Percentage</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{cancellationRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                {cancelledCount} cancelled out of {allReservations.length}
              </p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* This Week */}
        {kpiVisibility.showThisWeek && (
        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-green-600/20 to-green-400/10 opacity-50 blur-lg"></div>
          <Card className="relative rounded-xl border border-white/10 bg-[#0C1020]/80 shadow-xl backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg gradient-text">This Week</CardTitle>
                  <CardDescription className="text-muted-foreground">Upcoming Reservations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{thisWeekReservations.length}</div>
              <p className="text-sm text-muted-foreground mt-1">
                {thisWeekReservations.reduce((sum, r) => sum + r.party_size, 0)} guests expected
              </p>
            </CardContent>
          </Card>
        </div>
        )}
      </div>

      {/* Table Section */}
      <div className="relative">
        <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
        <div className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl p-6">
          <ReservationsTable reservations={allReservations} tables={tables} />
        </div>
      </div>
    </div>
  )
}
