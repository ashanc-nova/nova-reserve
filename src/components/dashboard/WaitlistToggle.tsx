import { useState } from 'react'
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { useToast } from '../../hooks/use-toast'
import { toggleWaitlistStatus } from '../../lib/supabase-data'
import { Loader2 } from 'lucide-react'
import { useGlobalState } from '../../lib/global-state'

export function WaitlistToggle({ isPaused }: { isPaused: boolean }) {
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()
  const { refreshWaitlist } = useGlobalState()

  const handleToggle = async () => {
    setIsPending(true)
    try {
      await toggleWaitlistStatus()
      toast({
        title: `Waitlist ${isPaused ? 'Resumed' : 'Paused'}`,
        description: `Guests can ${isPaused ? 'now' : 'no longer'} join the waitlist.`,
      })
      await refreshWaitlist()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle waitlist status",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="waitlist-toggle" className={isPaused ? 'text-destructive' : 'text-primary'}>
        {isPaused ? 'Waitlist Paused' : 'Accepting Guests'}
      </Label>
      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Switch id="waitlist-toggle" checked={!isPaused} onCheckedChange={handleToggle} disabled={isPending} />
      )}
    </div>
  )
}
