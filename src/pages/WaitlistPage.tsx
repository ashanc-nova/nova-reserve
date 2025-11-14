import { useGlobalState } from '../lib/global-state'
import { WaitlistTable } from '../components/dashboard/WaitlistTable'
import { FloorPlan } from '../components/dashboard/FloorPlan'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

export default function WaitlistPage() {
  const { waitlist, allGuests, tables, loading, error } = useGlobalState()

  if (loading.waitlist || loading.tables) {
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

  if (error) {
    return <div className="text-red-400">{error}</div>
  }

  return (
    <div className="grid gap-6 px-8 md:px-16 lg:px-24">
      <Tabs defaultValue="waitlist" className="grid gap-6">
        <div className="flex justify-center">
          <TabsList className="grid-cols-2 bg-card/60 border border-white/10">
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="floorplan">Floor Plan</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="waitlist">
          <div className="relative">
            <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
            <div className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl p-6">
              <WaitlistTable waitlist={waitlist} tables={tables} />
            </div>
          </div>
        </TabsContent>
                <TabsContent value="floorplan">
                  <div className="relative">
                    <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
                    <div className="relative rounded-2xl border border-white/10 bg-[#0C1020]/80 shadow-2xl shadow-black/40 backdrop-blur-xl p-6">
                      <FloorPlan tables={tables} allGuests={allGuests} />
                    </div>
                  </div>
                </TabsContent>
      </Tabs>
    </div>
  )
}


