import { useState } from 'react'
import { Button } from '../ui/button'
import { Send, Trash2, Loader2, Armchair } from 'lucide-react'
import type { WaitlistEntry, Table } from '../../lib/supabase'
import { updateWaitlistStatus, assignTable } from '../../lib/supabase-data'
import { useGlobalState } from '../../lib/global-state'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { useToast } from '../../hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

export function WaitlistActions({ entry, tables }: { entry: WaitlistEntry; tables: Table[] }) {
  const [isNotifyLoading, setIsNotifyLoading] = useState(false)
  const [isRemoveLoading, setIsRemoveLoading] = useState(false)
  const [isAssignLoading, setIsAssignLoading] = useState(false)
  const { toast } = useToast()
  const { refreshWaitlist, refreshTables } = useGlobalState()
  
  // Calculate available tables
  const availableTables = tables.filter(t => t.status === 'available' && t.seats >= entry.party_size)

  const handleNotify = async () => {
    setIsNotifyLoading(true)
    try {
      await updateWaitlistStatus(entry.id, 'notified')
      toast({ title: "Success", description: "Guest has been notified." })
      await refreshWaitlist()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to notify guest", variant: "destructive" })
    } finally {
      setIsNotifyLoading(false)
    }
  }

  const handleRemove = async () => {
    setIsRemoveLoading(true)
    try {
      await updateWaitlistStatus(entry.id, 'cancelled')
      toast({ title: "Guest Removed", description: `${entry.name} has been removed from the waitlist.` })
      await refreshWaitlist()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove guest", variant: "destructive" })
    } finally {
      setIsRemoveLoading(false)
    }
  }

  const handleAssignTable = async (tableId: string) => {
    setIsAssignLoading(true)
    try {
      const result = await assignTable(entry.id, tableId)
      if (result.success) {
        const table = tables.find(t => t.id === tableId)
        toast({ title: "Guest Seated", description: `${entry.name} has been assigned to table ${table?.name || tableId}.` })
        await Promise.all([refreshWaitlist(), refreshTables()])
      } else {
        toast({ title: "Error", description: result.message || "Failed to assign table", variant: "destructive" })
      }
    } finally {
      setIsAssignLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-card/50 hover:bg-card"
                  disabled={isAssignLoading || availableTables.length === 0}
                  aria-label="Assign Table"
                >
                  {isAssignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Armchair className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Assign to Table</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="bg-[#0C1020]/80 backdrop-blur-xl">
            <DropdownMenuLabel>Available Tables</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableTables.map(table => (
              <DropdownMenuItem key={table.id} onClick={() => handleAssignTable(table.id)}>
                Table {table.name} (Seats: {table.seats})
              </DropdownMenuItem>
            ))}
            {availableTables.length === 0 && <DropdownMenuItem disabled>No suitable tables</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-card/50 hover:bg-card"
              onClick={handleNotify}
              disabled={isNotifyLoading || entry.status === 'notified'}
              aria-label="Notify Guest"
            >
              {isNotifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Notify Guest</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleRemove}
              disabled={isRemoveLoading}
              aria-label="Remove Guest"
            >
              {isRemoveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove Guest</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
