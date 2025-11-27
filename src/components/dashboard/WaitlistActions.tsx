import { useState } from 'react'
import { Button } from '../ui/button'
import { Send, Trash2, Loader2 } from 'lucide-react'
import type { WaitlistEntry } from '../../lib/supabase'
import { updateWaitlistStatus } from '../../lib/supabase-data'
import { useGlobalState } from '../../lib/global-state'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { useToast } from '../../hooks/use-toast'
// DropdownMenu imports removed - table assignment disabled

export function WaitlistActions({ entry }: { entry: WaitlistEntry }) {
  const [isNotifyLoading, setIsNotifyLoading] = useState(false)
  const [isRemoveLoading, setIsRemoveLoading] = useState(false)
  const { toast } = useToast()
  const { refreshWaitlist } = useGlobalState()
  
  // Note: Table assignment for waitlist is disabled - using external tables from Nova API
  // This feature can be re-implemented using Nova API if needed

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

  // Table assignment disabled - would need Nova API integration

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        {/* Table assignment disabled - using external tables from Nova API */}

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
