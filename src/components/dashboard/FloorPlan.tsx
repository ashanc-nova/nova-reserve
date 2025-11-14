import { useState } from 'react'
import type { Table, WaitlistEntry, Reservation } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { Users, Armchair } from 'lucide-react'
import { Button } from '../ui/button'
import { freeTable } from '../../lib/supabase-data'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"
import { Badge } from '../ui/badge'
import { useGlobalState } from '../../lib/global-state'
import { useToast } from '../../hooks/use-toast'

export function FloorPlan({ tables, allGuests }: { tables: Table[]; allGuests: WaitlistEntry[] }) {
  const [isPending, setIsPending] = useState<string | null>(null)
  const { toast } = useToast()
  const { refreshTables, allReservations } = useGlobalState()

  const getGuestName = (tableId: string): string => {
    // Check waitlist entries first
    const waitlistGuest = allGuests.find(g => g.table_id === tableId && g.status === 'seated')
    if (waitlistGuest) return waitlistGuest.name
    
    // Check reservations
    const reservation = allReservations.find(r => r.table_id === tableId && r.status === 'seated')
    if (reservation) return reservation.name
    
    return 'Unknown Guest'
  }

  const handleFreeTable = async (tableId: string) => {
    setIsPending(tableId)
    try {
      await freeTable(tableId)
      await refreshTables()
      toast({ title: "Table Freed", description: `Table is now available.` })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || 'Failed to free table', variant: "destructive" })
    } finally {
      setIsPending(null)
    }
  }

  const getStatusBadge = (status: Table['status']) => {
    switch(status) {
      case 'available': 
        return <Badge variant="secondary" className="bg-green-900/50 text-green-300 border border-green-500/30">Available</Badge>
      case 'occupied': 
        return <Badge variant="secondary" className="bg-red-900/50 text-red-300 border border-red-500/30">Occupied</Badge>
      default: 
        return null
    }
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {tables.map((table) => {
          // Only show available or occupied tables
          if (table.status !== 'available' && table.status !== 'occupied') {
            return null
          }

          return (
            <div
              key={table.id}
              className={cn(
                'relative rounded-xl border-2 p-4 flex flex-col items-center justify-center aspect-square transition-all duration-300 shadow-lg',
                {
                  'bg-card border-border shadow-black/40': table.status === 'available',
                  'bg-card border-primary/50 shadow-primary/20': table.status === 'occupied',
                }
              )}
            >
              <div className="absolute top-3 left-3">{getStatusBadge(table.status)}</div>
              
              {/* Main content - centered */}
              <div className="flex flex-col items-center gap-2 flex-1 justify-center">
                <Armchair className="h-8 w-8 text-muted-foreground" />
                <p className="font-bold text-lg">{table.name}</p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{table.seats} Seats</span>
                </div>
              </div>

              {/* Occupied table info - at the bottom */}
              {table.status === 'occupied' && (
                <div className="absolute bottom-4 left-0 right-0 px-2 flex flex-col items-center gap-2">
                  <p className="text-sm font-semibold truncate text-primary w-full text-center" title={getGuestName(table.id)}>
                    {getGuestName(table.id)}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs w-full" 
                    onClick={() => handleFreeTable(table.id)} 
                    disabled={isPending === table.id}
                  >
                    Free up
                  </Button>
                </div>
              )}

              {/* Available indicator */}
              {table.status === 'available' && (
                <div className="absolute top-2 right-2">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Available</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
