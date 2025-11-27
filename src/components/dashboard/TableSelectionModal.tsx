import { useState, useEffect } from 'react'
import { Loader2, Armchair } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { getNovaTableStatus, bookNovaTable } from '../../lib/nova-api'
import type { NovaArea, NovaTable } from '../../lib/nova-api'
import { useToast } from '../../hooks/use-toast'
import type { Reservation } from '../../lib/supabase'

interface TableSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservation: Reservation
  onSelectTable: (tableRefId: string, tableName: string, seatingCapacity: number) => Promise<void>
}

export function TableSelectionModal({
  open,
  onOpenChange,
  reservation,
  onSelectTable,
}: TableSelectionModalProps) {
  const [areas, setAreas] = useState<NovaArea[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchTableStatus()
    }
  }, [open])

  const fetchTableStatus = async () => {
    setLoading(true)
    try {
      const data = await getNovaTableStatus()
      setAreas(data)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch table status',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTable = async (table: NovaTable) => {
    setSelecting(table.refId)
    try {
      // Check if reservation has novacustomer_id
      if (!reservation.novacustomer_id) {
        throw new Error('Customer Nova ID is missing. Please ensure the reservation has a customer ID.')
      }

      // Format the reservation date_time to ISO 8601 with timezone
      // The date_time from the database should be in UTC, but we need to ensure it's in the correct format
      const reservationDate = new Date(reservation.date_time).toISOString()

      // Book the table in Nova
      await bookNovaTable({
        tableRefId: table.refId,
        customerRefId: reservation.novacustomer_id,
        reservationDate: reservationDate,
        seatsRequired: reservation.party_size
      })

      // If booking succeeds, call the onSelectTable callback to mark as seated
      await onSelectTable(table.refId, table.tableName, table.seatingCapacity)
      onOpenChange(false)
    } catch (error: any) {
      // Check if it's a table occupied error
      if (error.message === 'TABLE_ALREADY_OCCUPIED') {
        toast({
          title: 'Table Already Occupied',
          description: 'This table is currently occupied. Refreshing available tables...',
          variant: 'destructive',
        })
        // Refresh table status
        await fetchTableStatus()
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to assign table',
          variant: 'destructive',
        })
      }
    } finally {
      setSelecting(null)
    }
  }

  // Filter to get only available tables (not occupied)
  const getAvailableTables = (area: NovaArea): NovaTable[] => {
    return area.tables.filter(table => !table.isTableOccupied && table.seatingCapacity >= reservation.party_size)
  }

  // Get all areas that have available tables
  const areasWithAvailableTables = areas.filter(area => getAvailableTables(area).length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Table for {reservation.name}</DialogTitle>
          <DialogDescription>
            Party size: {reservation.party_size} guests. Select an available table.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : areasWithAvailableTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Armchair className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No available tables found for {reservation.party_size} guests.</p>
            <Button
              variant="outline"
              onClick={fetchTableStatus}
              className="mt-4"
            >
              Refresh
            </Button>
          </div>
        ) : (
          <Tabs defaultValue={areasWithAvailableTables[0]?.refId} className="w-full">
            <TabsList className="grid w-full overflow-x-auto" style={{ gridTemplateColumns: `repeat(${areasWithAvailableTables.length}, minmax(80px, 1fr))` }}>
              {areasWithAvailableTables.map((area) => {
                const availableTables = getAvailableTables(area)
                return (
                  <TabsTrigger
                    key={area.refId}
                    value={area.refId}
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    {area.areaName}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {areasWithAvailableTables.map((area) => {
              const availableTables = getAvailableTables(area)
              return (
                <TabsContent key={area.refId} value={area.refId} className="mt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {availableTables.map((table) => (
                      <Button
                        key={table.refId}
                        variant="outline"
                        className="flex flex-col items-center justify-center h-16 sm:h-20 bg-background/50 hover:bg-background border-border p-2"
                        onClick={() => handleSelectTable(table)}
                        disabled={selecting !== null}
                      >
                        {selecting === table.refId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <span className="font-medium text-xs sm:text-sm">{table.tableName}</span>
                            <span className="text-xs text-muted-foreground">
                              {table.seatingCapacity} seats
                            </span>
                          </>
                        )}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

