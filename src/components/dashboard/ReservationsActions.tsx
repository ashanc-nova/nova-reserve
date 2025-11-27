import { useState } from 'react'
import { Button } from '../ui/button'
import { Loader2, Armchair, XCircle, Send } from 'lucide-react'
import type { Reservation } from '../../lib/supabase'
import { seatReservation, updateReservationStatus, saveMessageHistory } from '../../lib/supabase-data'
import { sendCustomSMS } from '../../lib/nova-api'
import { useGlobalState } from '../../lib/global-state'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { useToast } from '../../hooks/use-toast'
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
import { TableSelectionModal } from './TableSelectionModal'

export function ReservationsActions({ reservation }: { reservation: Reservation }) {
  const [isNotifyLoading, setIsNotifyLoading] = useState(false)
  const [isCancelLoading, setIsCancelLoading] = useState(false)
  const [isSeatLoading, setIsSeatLoading] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [isTableModalOpen, setIsTableModalOpen] = useState(false)
  const { toast } = useToast()
  const { refreshReservations } = useGlobalState()

  // Actions (assign table, cancel, notify) are only available for 'confirmed' and 'notified' states
  const canTakeAction = reservation.status === 'confirmed' || reservation.status === 'notified'
  
  // Can seat if action is allowed (tables are fetched from external Nova API)
  const canSeat = canTakeAction

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
        // Extract mobile number from phone (remove all non-digit characters)
        const mobileNumber = reservation.phone.replace(/\D/g, '')
        
        if (!mobileNumber) {
          throw new Error('Invalid phone number')
        }

        // Send SMS using Nova API
        await sendCustomSMS({
          mobileNumber: mobileNumber,
          countryCode: '+1', // Always use +1 as country code
          message: message,
        })
        
        messageStatus = 'sent'
        
        // Update the status to 'notified' if it's 'confirmed'
        if (reservation.status === 'confirmed') {
          await updateReservationStatus(reservation.id, 'notified')
        }
      } catch (smsError: any) {
        messageStatus = 'failed'
        console.error('SMS sending failed:', smsError)
        // Still save to history even if SMS fails
        throw smsError // Re-throw to show error to user
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

  const handleSeat = async (tableRefId: string, tableName: string, seatingCapacity: number) => {
    setIsSeatLoading(true)
    try {
      // Use the external table refId as the table_id
      // The seatReservation function will update the reservation status to 'seated'
      await seatReservation(reservation.id, tableRefId)
      toast({ 
        title: "Guest Seated", 
        description: `${reservation.name} has been assigned to table ${tableName} (${seatingCapacity} seats).` 
      })
      await refreshReservations()
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to seat reservation", variant: "destructive" })
      throw error // Re-throw so modal can handle it
    } finally {
      setIsSeatLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center justify-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-card/50 hover:bg-card"
              disabled={isSeatLoading || !canSeat}
              onClick={() => setIsTableModalOpen(true)}
              aria-label="Seat Reservation"
            >
              {isSeatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Armchair className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Seat Guest</p>
          </TooltipContent>
        </Tooltip>

        <TableSelectionModal
          open={isTableModalOpen}
          onOpenChange={setIsTableModalOpen}
          reservation={reservation}
          onSelectTable={handleSeat}
        />

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
