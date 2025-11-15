import { useState } from 'react'
import { Button } from '../ui/button'
import { Loader2, Armchair, XCircle, Send } from 'lucide-react'
import type { Reservation, Table } from '../../lib/supabase'
import { seatReservation, updateReservationStatus, saveMessageHistory, sendSMS } from '../../lib/supabase-data'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'
import { SendMessageModal } from './SendMessageModal'

export function ReservationsActions({ reservation, tables }: { reservation: Reservation; tables: Table[] }) {
  const [isNotifyLoading, setIsNotifyLoading] = useState(false)
  const [isCancelLoading, setIsCancelLoading] = useState(false)
  const [isSeatLoading, setIsSeatLoading] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const { toast } = useToast()
  const { refreshReservations, refreshTables } = useGlobalState()

  const availableTables = tables.filter(t => t.status === 'available' && t.seats >= reservation.party_size)
  // Actions (assign table, cancel, notify) are only available for 'confirmed' and 'notified' states
  const canTakeAction = reservation.status === 'confirmed' || reservation.status === 'notified'

  const handleCancel = async () => {
    setIsCancelLoading(true)
    try {
      await updateReservationStatus(reservation.id, 'cancelled')
      toast({ title: "Reservation Cancelled", description: `Reservation for ${reservation.name} has been cancelled.` })
      await refreshReservations()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to cancel reservation", variant: "destructive" })
    } finally {
      setIsCancelLoading(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    setIsNotifyLoading(true)
    try {
      // Save message to history first
      let messageStatus: 'sent' | 'failed' | 'pending' = 'pending'
      
      try {
        // TODO: Integrate SMS sending here
        // For now, just simulate sending
        // Replace this with actual SMS API call
        console.log('Sending SMS to', reservation.phone, ':', message)
        
        // Simulate SMS sending (remove this when integrating real SMS)
        const smsResponse = await sendSMS({
          mobileNumber: reservation.phone,
          countryCode: '+91',
          message,
        })
        // await new Promise(resolve => setTimeout(resolve, 500))
        
        messageStatus = 'sent'
        
        // Update the status to 'notified' if it's 'confirmed'
        if (reservation.status === 'confirmed') {
          await updateReservationStatus(reservation.id, 'notified')
        }
      } catch (smsError) {
        messageStatus = 'failed'
        console.error('SMS sending failed:', smsError)
        // Still save to history even if SMS fails
      }
      
      // Save message to history
      await saveMessageHistory({
        reservation_id: reservation.id,
        phone_number: reservation.phone,
        message,
        status: messageStatus,
      })
      
      toast({ 
        title: messageStatus === 'sent' ? "Message Sent" : messageStatus === 'failed' ? "Message Failed" : "Message Pending", 
        description: messageStatus === 'sent' 
          ? `Message sent to ${reservation.name} at ${reservation.phone}.`
          : messageStatus === 'failed'
          ? `Failed to send message. It has been saved to history.`
          : `Message is being sent to ${reservation.name}.`
      })
      await refreshReservations()
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send message", 
        variant: "destructive" 
      })
      throw error // Re-throw so modal can handle it
    } finally {
      setIsNotifyLoading(false)
    }
  }

  const handleSeat = async (tableId: string, restaurantId: string) => {
    setIsSeatLoading(true)
    try {
      await seatReservation(reservation.id, tableId , reservation)
      const table = tables.find(t => t.id === tableId)
      toast({ title: "Guest Seated", description: `${reservation.name} has been assigned to table ${table?.name || tableId}.` })
      await Promise.all([refreshReservations(), refreshTables()])
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to seat reservation", variant: "destructive" })
    } finally {
      setIsSeatLoading(false)
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
                  disabled={isSeatLoading || availableTables.length === 0 || !canTakeAction}
                  aria-label="Seat Reservation"
                >
                  {isSeatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Armchair className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Seat Guest</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="bg-[#0C1020]/80 backdrop-blur-xl">
            <DropdownMenuLabel>Available Tables</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableTables.map(table => (
              <DropdownMenuItem key={table.id} onClick={() => handleSeat(table.id , table.restaurant_id)}>
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
              onClick={() => setIsMessageModalOpen(true)}
              disabled={isNotifyLoading || !canTakeAction}
              aria-label="Send Message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Send Message</p>
          </TooltipContent>
        </Tooltip>

        <SendMessageModal
          reservation={reservation}
          open={isMessageModalOpen}
          onOpenChange={setIsMessageModalOpen}
          onSend={handleSendMessage}
        />

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  disabled={isCancelLoading || !canTakeAction}
                  aria-label="Cancel Reservation"
                >
                  {isCancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Cancel Reservation</p>
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the reservation for {reservation.name}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Back</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>Cancel Reservation</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
