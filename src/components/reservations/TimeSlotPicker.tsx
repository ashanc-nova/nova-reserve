import { Button } from "../ui/button"
import { cn } from "../../lib/utils"
import { Clock, Loader2 } from "lucide-react"
import { Skeleton } from "../ui/skeleton"
import { isToday, parse, format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"

interface TimeSlotPickerProps {
  slots: string[]
  selectedTime: string
  onSelectTime: (time: string) => void
  isLoading: boolean
  hasFetched: boolean
  selectedDate?: Date
  userTimezone?: string
}

export function TimeSlotPicker({ slots, selectedTime, onSelectTime, isLoading, hasFetched, selectedDate, userTimezone }: TimeSlotPickerProps) {
  // Filter out past times if selected date is today
  const getFilteredSlots = () => {
    if (!selectedDate || !isToday(selectedDate) || !userTimezone) {
      return slots
    }

    const now = new Date()
    const currentTime = formatInTimeZone(now, userTimezone, 'HH:mm')
    
    return slots.filter(slot => {
      // Parse the slot time (format: "h:mm A" like "2:30 PM")
      try {
        const slotTime = parse(slot, 'h:mm a', new Date())
        const slotTime24 = format(slotTime, 'HH:mm')
        return slotTime24 >= currentTime
      } catch {
        // If parsing fails, include the slot
        return true
      }
    })
  }

  const filteredSlots = getFilteredSlots()
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (hasFetched && filteredSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center h-[120px] bg-background/40 rounded-lg">
        <Clock className="h-10 w-10 text-primary/70" />
        <h3 className="mt-4 text-lg font-semibold gradient-text">No Slots Available</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Please try a different date or party size.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
      {filteredSlots.map(slot => (
        <Button
          key={slot}
          type="button"
          variant={selectedTime === slot ? "default" : "outline"}
          className={cn(
            "h-14 text-base font-medium bg-background/50 border-white/10 hover:bg-primary/20 transition-all",
            selectedTime === slot && "bg-primary text-white hover:bg-primary/90"
          )}
          onClick={() => onSelectTime(slot)}
        >
          {slot}
        </Button>
      ))}
    </div>
  )
}

