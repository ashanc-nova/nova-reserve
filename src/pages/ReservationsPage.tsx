import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGlobalState } from '../lib/global-state'
import { ReservationsTable } from '../components/dashboard/ReservationsTable'
import { ReservationSettingsFull } from '../components/dashboard/ReservationSettingsFull'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Settings, Calendar, Clock, Users, TrendingUp, History, ChevronLeft, RefreshCw, Search } from 'lucide-react'
import { addDays, subDays } from 'date-fns'
import { getRestaurant } from '../lib/supabase-data'
import { setRestaurantTimezone, getZonedDate, formatTimeInTimezone } from '../lib/timezone-utils'
import { cn } from '../lib/utils'

export default function ReservationsPage() {
  const [searchParams] = useSearchParams()
  const isEmbedded = searchParams.get('embed') === 'true'
  const { allReservations, loading, error, refreshReservations } = useGlobalState()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [activeView, setActiveView] = useState<'reservations' | 'settings'>('reservations')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [reservationView, setReservationView] = useState<'active' | 'past'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [kpiVisibility, setKpiVisibility] = useState({
    showAvgPartySize: false,
    showPeakHour: false,
    showCancellationRate: false,
    showThisWeek: false
  })
  const [kpiSettingsLoaded, setKpiSettingsLoaded] = useState(false)
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null)

  useEffect(() => {
    // Check if KPI settings are cached
    const cachedKpiSettings = sessionStorage.getItem('kpi_settings')
    if (cachedKpiSettings && !isSettingsOpen) {
      try {
        const settings = JSON.parse(cachedKpiSettings)
        setKpiVisibility(settings.visibility)
        if (settings.timezone) {
          setRestaurantTimezone(settings.timezone)
        }
        setKpiSettingsLoaded(true)
        return // Use cached settings
      } catch (e) {
        // If cache is invalid, continue to fetch
      }
    }
    
    const loadKpiSettings = async () => {
      try {
        const restaurant = await getRestaurant()
        const managerSettings = restaurant.settings?.manager_settings || {}
        const reservationSettings = restaurant.settings?.reservation_settings || {}
        const visibility = {
          showAvgPartySize: managerSettings.show_avg_party_size !== undefined ? managerSettings.show_avg_party_size : false,
          showPeakHour: managerSettings.show_peak_hour !== undefined ? managerSettings.show_peak_hour : false,
          showCancellationRate: managerSettings.show_cancellation_rate !== undefined ? managerSettings.show_cancellation_rate : false,
          showThisWeek: managerSettings.show_this_week !== undefined ? managerSettings.show_this_week : false
        }
        setKpiVisibility(visibility)
        setRestaurantSettings(reservationSettings)
        // Set timezone for date formatting
        if (managerSettings.timezone) {
          setRestaurantTimezone(managerSettings.timezone)
        }
        // Cache settings
        sessionStorage.setItem('kpi_settings', JSON.stringify({ visibility, timezone: managerSettings.timezone }))
        setKpiSettingsLoaded(true)
      } catch (error) {
        console.error('Error loading KPI visibility settings:', error)
        setKpiSettingsLoaded(true) // Still mark as loaded even on error to prevent infinite loading
      }
    }
    loadKpiSettings()
  }, [isSettingsOpen]) // Reload when settings modal closes to refresh after changes

  // Memoize the loading check - only show loading if we truly have no data
  const shouldShowLoading = useMemo(() => {
    return loading.reservations && allReservations.length === 0
  }, [loading.reservations, allReservations.length])

  // Filter out seated and cancelled reservations from main table (Active tab - all active reservations)
  // This needs to be calculated before early returns to maintain hook order
  const activeReservations = useMemo(() => {
    return allReservations.filter(
      r => r.status !== 'seated' && r.status !== 'cancelled'
    )
  }, [allReservations])
  
  // Calculate total drafts (both pending payment and pending approval show as "draft" in manager UI)
  // This must be before early returns to maintain hook order
  const draftsNeedingApproval = useMemo(() => {
    // Count all drafts - both pending payment and pending approval
    return activeReservations.filter(r => r.status === 'draft').length
  }, [activeReservations])

  // Only show loading spinner if we have no data AND are currently loading
  // Don't show loading if we already have data (even if loading state is true)
  if (shouldShowLoading) {
    return (
      <div className="relative">
        <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
        <div className="relative rounded-2xl border border-border bg-card/80 shadow-2xl backdrop-blur-xl p-6">
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
    date.setHours(Number(peakHour[0]), 0, 0, 0)
    return formatTimeInTimezone(date)
  })() : 'N/A'
  
  const cancelledCount = allReservations.filter(r => r.status === 'cancelled').length
  
  const cancellationRate = allReservations.length > 0 
    ? ((cancelledCount / allReservations.length) * 100).toFixed(1)
    : '0'
  
  // Get seated and cancelled reservations for history (Past tab)
  const thirtyDaysAgo = subDays(new Date(), 30)
  const historyReservations = allReservations.filter(
    r => {
      const isSeatedOrCancelled = r.status === 'seated' || r.status === 'cancelled'
      if (!isSeatedOrCancelled) return false
      
      // For cancelled reservations, show them immediately regardless of date
      if (r.status === 'cancelled') {
        return true
      }
      
      // For seated reservations, filter to only include reservations from the past 30 days
      const reservationDate = new Date(r.date_time)
      return reservationDate >= thirtyDaysAgo
    }
  )

  // In embed mode, use activeView state instead of separate flags
  const currentView = isEmbedded ? activeView : (isSettingsOpen ? 'settings' : (isHistoryOpen ? 'history' : 'reservations'))

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshReservations()
    } finally {
      setTimeout(() => setIsRefreshing(false), 500) // Keep spinner for at least 500ms for visual feedback
    }
  }

  // Floating Buttons Component - Always visible in embed mode
  const FloatingButtons = isEmbedded ? (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
      <Button
        variant={activeView === 'reservations' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setActiveView('reservations')}
        className={`h-12 w-12 rounded-full shadow-lg ${
          activeView === 'reservations' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card/80 backdrop-blur-sm border-border hover:bg-card'
        }`}
        title="Reservations"
      >
        <Calendar className="h-5 w-5" />
      </Button>
      <Button
        variant={activeView === 'settings' ? 'default' : 'outline'}
        size="icon"
        onClick={() => setActiveView('settings')}
        className={`h-12 w-12 rounded-full shadow-lg ${
          activeView === 'settings' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card/80 backdrop-blur-sm border-border hover:bg-card'
        }`}
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </Button>
    </div>
  ) : null

  if (currentView === 'settings') {
    return (
      <>
        {FloatingButtons}
        <ReservationSettingsFull isOpen={true} onClose={() => isEmbedded ? setActiveView('reservations') : setIsSettingsOpen(false)} isEmbedded={isEmbedded} />
      </>
    )
  }

  // Show History as full page (only for non-embedded view)
  if (currentView === 'history' && !isEmbedded) {
    return (
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsHistoryOpen(false)}
              className="hover:bg-card/50 flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold gradient-text truncate">Reservation History</h2>
            </div>
          </div>
        </div>

        {/* History Table Section */}
        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
          <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-3 sm:p-4 md:p-6">
            {historyReservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center h-[300px] sm:h-[400px]">
                <History className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mb-4" />
                <h3 className="text-base sm:text-lg font-semibold gradient-text">No History</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  No seated or cancelled reservations found.
                </p>
              </div>
            ) : (
              <ReservationsTable reservations={historyReservations} isEmbedded={false} restaurantSettings={restaurantSettings} />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {FloatingButtons}
      <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24 relative">

      {/* Header Section - Hidden in embed mode */}
      {!isEmbedded && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-bold gradient-text">Reservations</h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-card/50 hover:bg-card border-primary/20"
                title="Refresh"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsHistoryOpen(true)}
                className="bg-card/50 hover:bg-card border-primary/20"
                title="View History"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsSettingsOpen(true)}
                className="bg-card/50 hover:bg-card border-primary/20"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Active/Past Tabs and Search - Desktop view */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-border bg-muted p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReservationView('active')
                  setSearchQuery('')
                }}
                className={cn(
                  "px-6 py-2 text-sm font-medium transition-all rounded-md relative",
                  reservationView === 'active' 
                    ? 'bg-primary !text-white hover:bg-primary/90 shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                )}
              >
                Active
                {draftsNeedingApproval > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {draftsNeedingApproval > 9 ? '9+' : draftsNeedingApproval}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReservationView('past')
                  setSearchQuery('')
                }}
                className={cn(
                  "px-6 py-2 text-sm font-medium transition-all rounded-md",
                  reservationView === 'past' 
                    ? 'bg-primary !text-white hover:bg-primary/90 shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                )}
              >
                Past
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm bg-card/50 border-primary/20"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dashboard Metrics - Only render if settings are loaded and at least one KPI is visible */}
      {kpiSettingsLoaded && Object.values(kpiVisibility).some(Boolean) && (
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${Object.values(kpiVisibility).filter(Boolean).length <= 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-3 sm:gap-4`}>
        {/* Average Party Size */}
        {kpiVisibility.showAvgPartySize && (
        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-400/10 opacity-50 blur-lg dark:opacity-50"></div>
          <Card className="relative rounded-xl border border-border bg-card shadow-xl backdrop-blur-xl">
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
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-400/10 opacity-50 blur-lg dark:opacity-50"></div>
          <Card className="relative rounded-xl border border-border bg-card shadow-xl backdrop-blur-xl">
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
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-red-600/20 to-red-400/10 opacity-50 blur-lg dark:opacity-50"></div>
          <Card className="relative rounded-xl border border-border bg-card shadow-xl backdrop-blur-xl">
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
          <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-green-600/20 to-green-400/10 opacity-50 blur-lg dark:opacity-50"></div>
          <Card className="relative rounded-xl border border-border bg-card shadow-xl backdrop-blur-xl">
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
      )}

      {/* Active/Past Tabs and Search - Embedded view */}
      {isEmbedded && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReservationView('active')
                setSearchQuery('')
              }}
              className={cn(
                "px-6 py-2 text-sm font-medium transition-all rounded-md relative",
                reservationView === 'active' 
                  ? 'bg-primary !text-white hover:bg-primary/90 shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
              )}
            >
              Active
              {draftsNeedingApproval > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                  {draftsNeedingApproval > 9 ? '9+' : draftsNeedingApproval}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReservationView('past')
                setSearchQuery('')
              }}
              className={cn(
                "px-6 py-2 text-sm font-medium transition-all rounded-md",
                reservationView === 'past' 
                  ? 'bg-primary !text-white hover:bg-primary/90 shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
              )}
            >
              Past
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-sm bg-card/50 border-primary/20"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-card/50 hover:bg-card border-primary/20 flex-shrink-0"
              title="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="relative">
        <div className="absolute -inset-0.5 animate-pulse rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
        <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-3 sm:p-4 md:p-6 overflow-hidden">
          <ReservationsTable 
            reservations={activeReservations}
            activeReservations={activeReservations} 
            historyReservations={historyReservations}
            isEmbedded={isEmbedded}
            reservationView={reservationView}
            onReservationViewChange={setReservationView}
            searchQuery={searchQuery}
            restaurantSettings={restaurantSettings}
          />
        </div>
      </div>

    </div>
    </>
  )
}
