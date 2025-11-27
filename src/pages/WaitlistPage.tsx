import { useMemo } from 'react'
import { useGlobalState } from '../lib/global-state'
import { WaitlistTable } from '../components/dashboard/WaitlistTable'
import { FloorPlan } from '../components/dashboard/FloorPlan'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

export default function WaitlistPage() {
  const { waitlist, allGuests, loading, error } = useGlobalState()

  // Memoize the loading check - only show loading if we truly have no data
  const shouldShowLoading = useMemo(() => {
    return loading.waitlist && waitlist.length === 0
  }, [loading.waitlist, waitlist.length])

  // Only show loading spinner if we have no data AND are currently loading
  if (shouldShowLoading) {
    return (
      <div className="relative">
        <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
        <div className="relative rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-400">{error}</div>
  }

  return (
    <div className="grid gap-4 sm:gap-6 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24">
      <Tabs defaultValue="waitlist" className="grid gap-4 sm:gap-6">
        <div className="flex justify-center">
          <TabsList className="grid-cols-2 bg-card/60 border border-border w-full sm:w-auto">
            <TabsTrigger value="waitlist" className="text-xs sm:text-sm">Waitlist</TabsTrigger>
            <TabsTrigger value="floorplan" className="text-xs sm:text-sm">Floor Plan</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="waitlist">
          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-3 sm:p-4 md:p-6">
              <WaitlistTable waitlist={waitlist} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="floorplan">
          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <div className="relative rounded-xl sm:rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-xl p-3 sm:p-4 md:p-6">
              {/* FloorPlan temporarily disabled - needs to be updated to use Nova API tables */}
              <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground text-center px-4">
                <p className="text-sm sm:text-base">Floor Plan will be updated to use Nova API tables</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


