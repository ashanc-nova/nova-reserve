import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Loader2, Send, User, Smartphone, Calendar, Clock, History, XCircle, Armchair, ArrowLeft, CheckCircle2, Mail, DollarSign, Star, MessageSquare, X, Check } from 'lucide-react'
import type { Reservation, MessageHistory } from '../../lib/supabase'
import { formatDateWithTimezone, formatTimeInTimezone } from '../../lib/timezone-utils'
import { cn } from '../../lib/utils'
import { getMessageHistory, seatReservation, updateReservationStatus, saveMessageHistory } from '../../lib/supabase-data'
import { sendCustomSMS, getNovaTableStatus, bookNovaTable } from '../../lib/nova-api'
import type { NovaArea, NovaTable } from '../../lib/nova-api'
import { useToast } from '../../hooks/use-toast'
import { useGlobalState } from '../../lib/global-state'
import { useRestaurant } from '../../lib/restaurant-context'
import { format } from 'date-fns'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'

interface ReservationActionsModalProps {
  reservation: Reservation
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ActionTab = 'confirm' | 'seat' | 'sms' | 'cancel'

const MESSAGE_TEMPLATES = [
  {
    id: 'reminder',
    label: 'Reminder',
    text: 'Hi {name}, reminder from {restaurant_name}: your reservation is {date} at {time}. See you soon!'
  },
  {
    id: 'reschedule',
    label: 'Reschedule',
    text: 'Hi {name}, {restaurant_name} needs to reschedule your reservation for {date} at {time}. Please let us know if another time works.'
  },
  {
    id: 'delay',
    label: 'Running Late',
    text: 'Hi {name}, {restaurant_name} is running behind. Your reservation for {date} at {time} may be delayed 15-20 min. Thanks!'
  },
  {
    id: 'cancellation',
    label: 'Cancellation Notice',
    text: 'Hi {name}, {restaurant_name} needs to cancel your reservation for {date} at {time}. We apologize. Please contact us to reschedule.'
  },
  {
    id: 'confirmation',
    label: 'Confirmation',
    text: 'Hi {name}, {restaurant_name}: confirmed {date} at {time} for {party_size} guests. See you soon!'
  },
  {
    id: 'custom',
    label: 'Custom Message',
    text: ''
  }
]

export function ReservationActionsModal({ reservation, open, onOpenChange }: ReservationActionsModalProps) {
  const isDraftInitial = reservation.status === 'draft'
  const [activeTab, setActiveTab] = useState<ActionTab>(isDraftInitial ? 'confirm' : 'seat')
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [areas, setAreas] = useState<NovaArea[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [isSeatLoading, setIsSeatLoading] = useState(false)
  const [isCancelLoading, setIsCancelLoading] = useState(false)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [currentReservation, setCurrentReservation] = useState(reservation)
  const [tableName, setTableName] = useState<string | null>(null)
  const [loadingTableName, setLoadingTableName] = useState(false)
  const { toast } = useToast()
  const { refreshReservations } = useGlobalState()
  const { restaurant } = useRestaurant()

  // Update local reservation state when prop changes
  useEffect(() => {
    setCurrentReservation(reservation)
    setTableName(null) // Reset table name when reservation changes
  }, [reservation])

  const canTakeAction = currentReservation.status === 'confirmed' || currentReservation.status === 'notified'
  const canSeat = canTakeAction
  const isDraft = currentReservation.status === 'draft'
  const isCancelled = currentReservation.status === 'cancelled'
  const isSeated = currentReservation.status === 'seated'

  // Reset view when modal opens/closes
  useEffect(() => {
    if (open) {
      // Set default tab based on reservation status
      setActiveTab(currentReservation.status === 'draft' ? 'confirm' : 'seat')
      setMessage('')
      setSelectedTemplate(null)
      setShowHistory(false)
      // Load tables when modal opens (seat tab is default)
      fetchTableStatus()
    }
  }, [open])

  // Load tables when seat tab is selected
  useEffect(() => {
    if (open && activeTab === 'seat') {
      fetchTableStatus()
    }
  }, [open, activeTab])

  // Load message history when SMS history is shown
  useEffect(() => {
    if (open && activeTab === 'sms' && showHistory) {
      loadMessageHistory()
    }
  }, [open, activeTab, showHistory, currentReservation.id])

  // Fetch table name when reservation is seated
  useEffect(() => {
    const fetchTableName = async () => {
      if (isSeated && currentReservation.table_id && open) {
        setLoadingTableName(true)
        try {
          const data = await getNovaTableStatus()
          // Find the table by refId
          for (const area of data) {
            const table = area.tables.find(t => t.refId === currentReservation.table_id)
            if (table) {
              setTableName(table.tableName)
              break
            }
          }
        } catch (error: any) {
          console.error('Failed to fetch table name:', error)
          // Fallback to table_id if we can't fetch
          setTableName(currentReservation.table_id)
        } finally {
          setLoadingTableName(false)
        }
      }
    }
    fetchTableName()
  }, [isSeated, currentReservation.table_id, open])

  const fetchTableStatus = async () => {
    setLoadingTables(true)
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
      setLoadingTables(false)
    }
  }

  const loadMessageHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const history = await getMessageHistory(currentReservation.id)
      setMessageHistory(history)
    } catch (error) {
      console.error('Failed to load message history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const formatMessage = (template: string): string => {
    const restaurantName = restaurant?.name || 'Restaurant'
    const formatted = template
      .replace(/{name}/g, currentReservation.name)
      .replace(/{restaurant_name}/g, restaurantName)
      .replace(/{date}/g, formatDateWithTimezone(currentReservation.date_time))
      .replace(/{time}/g, formatTimeInTimezone(currentReservation.date_time))
      .replace(/{party_size}/g, currentReservation.party_size.toString())
    
    return formatted.length > 160 ? formatted.substring(0, 160) : formatted
  }

  const formatConfirmationMessage = (template: string): string => {
    const restaurantName = restaurant?.name || 'Restaurant'
    let formatted = template
      .replace(/{name}/g, currentReservation.name)
      .replace(/{restaurant_name}/g, restaurantName)
      .replace(/{date}/g, formatDateWithTimezone(currentReservation.date_time))
      .replace(/{time}/g, formatTimeInTimezone(currentReservation.date_time))
      .replace(/{party_size}/g, currentReservation.party_size.toString())
    
    // Remove special characters (keep only alphanumeric, spaces, and basic punctuation)
    formatted = formatted.replace(/[^\w\s.,!?]/g, '')
    
    // Limit to 100 characters
    return formatted.length > 100 ? formatted.substring(0, 100) : formatted
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId)
    if (template && template.id !== 'custom') {
      setMessage(formatMessage(template.text))
    } else {
      setMessage('')
    }
  }

  const handleSelectTable = async (table: NovaTable) => {
    setSelecting(table.refId)
    try {
      if (!currentReservation.novacustomer_id) {
        throw new Error('Customer Nova ID is missing.')
      }

      const reservationDate = new Date(currentReservation.date_time).toISOString()

      await bookNovaTable({
        tableRefId: table.refId,
        customerRefId: currentReservation.novacustomer_id,
        reservationDate: reservationDate,
        seatsRequired: currentReservation.party_size
      })

      await handleSeat(table.refId, table.tableName, table.seatingCapacity)
    } catch (error: any) {
      if (error.message === 'TABLE_ALREADY_OCCUPIED') {
        toast({
          title: 'Table Already Occupied',
          description: 'This table is currently occupied. Refreshing available tables...',
          variant: 'destructive',
        })
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

  const handleSeat = async (tableRefId: string, tableName: string, seatingCapacity: number) => {
    setIsSeatLoading(true)
    try {
      await seatReservation(currentReservation.id, tableRefId)
      toast({ 
        title: "Guest Seated", 
        description: `${currentReservation.name} has been assigned to table ${tableName} (${seatingCapacity} seats).` 
      })
      await refreshReservations()
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to seat reservation", variant: "destructive" })
    } finally {
      setIsSeatLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) {
      return
    }

    setIsSending(true)
    try {
      const phoneNumber = currentReservation.phone.replace(/\D/g, '')
      await sendCustomSMS({
        mobileNumber: phoneNumber,
        countryCode: '+1',
        message: message
      })
      
      await saveMessageHistory({
        reservation_id: currentReservation.id,
        phone_number: currentReservation.phone,
        message: message,
        status: 'sent'
      })
      
      toast({ 
        title: "Message Sent", 
        description: `Message sent to ${currentReservation.name} at ${currentReservation.phone}.`
      })
      await refreshReservations()
      setMessage('')
      setSelectedTemplate(null)
    } catch (error: any) {
      await saveMessageHistory({
        reservation_id: currentReservation.id,
        phone_number: currentReservation.phone,
        message: message,
        status: 'failed'
      })
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send message", 
        variant: "destructive" 
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleConfirm = async () => {
    setIsConfirmLoading(true)
    try {
      // When confirming a draft from manager dashboard (not through payment flow),
      // clear payment_amount since no payment was made
      const { supabase } = await import('../../lib/supabase')
      if (!supabase) throw new Error('Supabase client not initialized')
      
      await supabase
        .from('reservations')
        .update({ 
          status: 'confirmed',
          payment_amount: null  // Clear payment amount when confirming without payment
        })
        .eq('id', currentReservation.id)
      
      setCurrentReservation({ ...currentReservation, status: 'confirmed', payment_amount: null })
      
      // Send confirmation SMS
      try {
        const confirmationTemplate = MESSAGE_TEMPLATES.find(t => t.id === 'confirmation')
        if (confirmationTemplate) {
          const confirmationMessage = formatConfirmationMessage(confirmationTemplate.text)
          const phoneNumber = currentReservation.phone.replace(/\D/g, '')
          
          await sendCustomSMS({
            mobileNumber: phoneNumber,
            countryCode: '+1',
            message: confirmationMessage
          })
          
          // Save message history
          await saveMessageHistory({
            reservation_id: currentReservation.id,
            phone_number: currentReservation.phone,
            message: confirmationMessage,
            status: 'sent'
          })
        }
      } catch (smsError: any) {
        // Log SMS error but don't fail the confirmation
        console.error('Failed to send confirmation SMS:', smsError)
        await saveMessageHistory({
          reservation_id: currentReservation.id,
          phone_number: currentReservation.phone,
          message: MESSAGE_TEMPLATES.find(t => t.id === 'confirmation')?.text || '',
          status: 'failed'
        })
        // Show a warning toast but continue with confirmation
        toast({
          title: "Reservation Confirmed",
          description: `Reservation confirmed, but failed to send SMS notification.`,
          variant: "default"
        })
      }
      
      toast({ title: "Reservation Confirmed", description: `Reservation for ${currentReservation.name} has been confirmed and notification sent.` })
      await refreshReservations()
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to confirm reservation", variant: "destructive" })
    } finally {
      setIsConfirmLoading(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelLoading(true)
    try {
      // Update reservation status first
      await updateReservationStatus(currentReservation.id, 'cancelled')
      
      // Send cancellation SMS
      try {
        const cancellationTemplate = MESSAGE_TEMPLATES.find(t => t.id === 'cancellation')
        if (cancellationTemplate) {
          const cancellationMessage = formatMessage(cancellationTemplate.text)
          const phoneNumber = currentReservation.phone.replace(/\D/g, '')
          
          await sendCustomSMS({
            mobileNumber: phoneNumber,
            countryCode: '+1',
            message: cancellationMessage
          })
          
          // Save message history
          await saveMessageHistory({
            reservation_id: currentReservation.id,
            phone_number: currentReservation.phone,
            message: cancellationMessage,
            status: 'sent'
          })
        }
      } catch (smsError: any) {
        // Log SMS error but don't fail the cancellation
        console.error('Failed to send cancellation SMS:', smsError)
        await saveMessageHistory({
          reservation_id: currentReservation.id,
          phone_number: currentReservation.phone,
          message: MESSAGE_TEMPLATES.find(t => t.id === 'cancellation')?.text || '',
          status: 'failed'
        })
        // Show a warning toast but continue with cancellation
        toast({
          title: "Reservation Cancelled",
          description: `Reservation cancelled, but failed to send SMS notification.`,
          variant: "default"
        })
      }
      
      toast({ title: "Reservation Cancelled", description: `Reservation for ${currentReservation.name} has been cancelled and notification sent.` })
      await refreshReservations()
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to cancel reservation", variant: "destructive" })
    } finally {
      setIsCancelLoading(false)
      setShowCancelConfirm(false)
    }
  }

  const renderRightContent = () => {
    switch (activeTab) {
      case 'confirm':
        return (
          <div className="flex flex-col h-full items-center justify-center gap-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Confirm Reservation?</h3>
                <p className="text-sm text-muted-foreground">
                  
                  This will change the status from draft to confirmed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                variant="default"
                className="flex-1 bg-primary text-primary-foreground"
                onClick={handleConfirm}
                disabled={isConfirmLoading}
              >
                {isConfirmLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm Reservation'
                )}
              </Button>
            </div>
          </div>
        )

      case 'seat':
        return (
          <div className="flex flex-col h-full">
            {loadingTables ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : areas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Armchair className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tables available</p>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <Tabs defaultValue={areas[0]?.areaName || ''} className="w-full h-full flex flex-col min-h-0">
                  <div className="flex-shrink-0 mb-4">
                    <TabsList className="inline-flex w-auto max-w-full overflow-x-auto scrollbar-hide gap-2 bg-transparent p-0">
                      {areas.map((area) => (
                        <TabsTrigger 
                          key={area.areaName} 
                          value={area.areaName} 
                          className={cn(
                            "text-xs sm:text-sm whitespace-nowrap flex-shrink-0",
                            "bg-white dark:bg-card border border-border rounded-md px-4 py-2",
                            "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                            "hover:bg-muted/50 transition-colors"
                          )}
                        >
                          {area.areaName}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {areas.map((area) => {
                      const allTables = area.tables.filter(
                        table => table.seatingCapacity >= currentReservation.party_size
                      )
                      const availableTables = allTables.filter(table => !table.isTableOccupied)
                      const occupiedTables = allTables.filter(table => table.isTableOccupied)
                      const totalTables = availableTables.length + occupiedTables.length
                      
                      // Calculate number of columns needed
                      // First 15 tables fill 3 rows with 5 columns each
                      // After 15 tables, add additional columns (6th column for table 16, etc.)
                      const baseColumns = 5
                      const maxRowsForBaseColumns = 3
                      const maxTablesForBaseColumns = baseColumns * maxRowsForBaseColumns // 15
                      
                      // If we have more than 15 tables, calculate how many additional columns we need
                      let totalColumns = baseColumns
                      if (totalTables > maxTablesForBaseColumns) {
                        const additionalTables = totalTables - maxTablesForBaseColumns
                        // Each additional column can hold 3 tables (one per row)
                        const additionalColumns = Math.ceil(additionalTables / maxRowsForBaseColumns)
                        totalColumns = baseColumns + additionalColumns
                      }
                      
                      return (
                        <TabsContent key={area.areaName} value={area.areaName} className="flex-1 overflow-hidden flex flex-col min-h-0 m-0 data-[state=active]:flex data-[state=inactive]:hidden">
                          {allTables.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                              <Armchair className="h-12 w-12 text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">No tables available in {area.areaName}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Minimum {currentReservation.party_size} seats required
                              </p>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide -mr-2 pr-2">
                              <div className="grid gap-3 pb-2 auto-rows-max" style={{ gridTemplateColumns: `repeat(${totalColumns}, minmax(6rem, 1fr))` }}>
                                {/* Show available tables first */}
                                {availableTables.map((table) => (
                                  <Button
                                    key={table.refId}
                                    variant="outline"
                                    className={cn(
                                      "h-auto w-24 p-4 flex flex-col items-center gap-2 border-2 transition-all",
                                      "bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-400",
                                      selecting === table.refId && "opacity-50 cursor-not-allowed"
                                    )}
                                    disabled={selecting === table.refId || isSeatLoading}
                                    onClick={() => handleSelectTable(table)}
                                  >
                                    {selecting === table.refId ? (
                                      <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                      <Armchair className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    )}
                                    <div className="text-center min-w-0 w-full">
                                      <div className="font-semibold text-sm truncate">{table.tableName}</div>
                                      <div className="text-xs text-green-600/70 dark:text-green-400/70">
                                        {table.seatingCapacity} seats
                                      </div>
                                    </div>
                                  </Button>
                                ))}
                                {/* Show occupied tables after available ones */}
                                {occupiedTables.map((table) => (
                                  <Button
                                    key={table.refId}
                                    variant="outline"
                                    className={cn(
                                      "h-auto w-24 p-4 flex flex-col items-center gap-2 border-2 transition-all",
                                      "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 opacity-75 cursor-not-allowed"
                                    )}
                                    disabled={true}
                                  >
                                    <Armchair className="h-6 w-6 text-red-600 dark:text-red-400" />
                                    <div className="text-center min-w-0 w-full">
                                      <div className="font-semibold text-sm truncate">{table.tableName}</div>
                                      <div className="text-xs text-red-600/70 dark:text-red-400/70">
                                        {table.seatingCapacity} seats
                                      </div>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      )
                    })}
                  </div>
                </Tabs>
              </div>
            )}
          </div>
        )

      case 'sms':
        return (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-end mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setShowHistory(!showHistory)
                  if (!showHistory) {
                    loadMessageHistory()
                  }
                }}
                className="bg-card/50 hover:bg-card border-border"
              >
                <History className="h-4 w-4" />
              </Button>
            </div>
            {showHistory ? (
              <div className="flex-1 overflow-y-auto">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messageHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No message history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messageHistory.map((msg) => (
                      <div key={msg.id} className="p-3 bg-card/50 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          <Badge
                            variant={msg.status === 'sent' ? 'default' : msg.status === 'failed' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4">
                <div>
                  
                  <div className="flex flex-wrap gap-2">
                    {MESSAGE_TEMPLATES.map((template) => (
                      <Button
                        key={template.id}
                        variant={selectedTemplate === template.id ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length <= 160) {
                        setMessage(value)
                      }
                    }}
                    placeholder="Type your message here or select a template above..."
                    className="flex-1 min-h-[140px] resize-none"
                    maxLength={160}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className={cn(
                      "text-xs",
                      message.length >= 160 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {message.length} / 160 characters
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )

      case 'cancel':
        return (
          <div className="flex flex-col h-full items-center justify-center gap-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Cancel Reservation?</h3>
                <p className="text-sm text-muted-foreground">
                  
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowCancelConfirm(true)}
                disabled={isCancelLoading}
              >
                {isCancelLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Reservation'
                )}
              </Button>
            </div>
            <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will cancel the reservation for {currentReservation.name}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setShowCancelConfirm(false)}>Back</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Cancel Reservation</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border backdrop-blur-xl max-w-5xl h-[60vh] sm:h-[70vh] md:h-[75vh] flex flex-col overflow-hidden w-[95vw] sm:w-full [&>button]:hidden p-0">
        <DialogHeader className="px-6 pt-4 pb-0 pr-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <DialogTitle className="gradient-text" style={{ fontSize: '24px' }}>{currentReservation.name}</DialogTitle>
            {/* Status Badge */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className={cn(
                  "absolute -inset-0.5 rounded-full blur-sm opacity-50",
                  currentReservation.status === 'draft' && "bg-gray-400",
                  currentReservation.status === 'confirmed' && "bg-primary",
                  currentReservation.status === 'notified' && "bg-blue-500",
                  currentReservation.status === 'seated' && "bg-green-500",
                  currentReservation.status === 'cancelled' && "bg-red-500"
                )}></div>
                <Badge
                  className={cn(
                    'relative font-semibold px-4 py-2 text-xs uppercase tracking-wider shadow-lg',
                    currentReservation.status === 'draft' 
                      ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-2 border-gray-400 dark:from-gray-800 dark:to-gray-700 dark:text-gray-200 dark:border-gray-600' 
                      : currentReservation.status === 'confirmed' 
                      ? 'bg-gradient-to-r from-primary/30 to-primary/20 text-primary border-2 border-primary/50 shadow-primary/20' 
                      : currentReservation.status === 'notified' 
                      ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-2 border-blue-400 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-300 dark:border-blue-500/50' 
                      : currentReservation.status === 'seated' 
                      ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-2 border-green-400 dark:from-green-900/50 dark:to-green-800/50 dark:text-green-300 dark:border-green-500/50' 
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-2 border-gray-400 dark:from-gray-800 dark:to-gray-700 dark:text-gray-200 dark:border-gray-600'
                  )}
                >
                  {currentReservation.status}
                </Badge>
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-background border-2 border-border shadow-lg opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-2.5 h-10 w-10 flex items-center justify-center flex-shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0 px-6 pb-6">
          {/* Left Side - Guest Info */}
          <div className="lg:col-span-1 flex flex-col mt-4">
            <div className="relative">
              <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
              <div className="relative rounded-xl border border-border bg-card/50 shadow-xl backdrop-blur-xl p-4 sm:p-6 flex-1">
                <h3 className="text-sm font-semibold mb-4 gradient-text">Guest Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium text-sm">{currentReservation.name}</p>
                    </div>
                  </div>
                  {currentReservation.email && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-sm truncate">{currentReservation.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium text-sm">{currentReservation.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium text-sm">{formatDateWithTimezone(currentReservation.date_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-medium text-sm">{formatTimeInTimezone(currentReservation.date_time)}</p>
                    </div>
                  </div>
                  {currentReservation.payment_amount && currentReservation.payment_amount > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-medium text-sm text-green-600 dark:text-green-400">
                          ${currentReservation.payment_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentReservation.special_occasion_type && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Star className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Occasion</p>
                        <p className="font-medium text-sm">{currentReservation.special_occasion_type}</p>
                      </div>
                    </div>
                  )}
                  {currentReservation.special_requests && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="font-medium text-sm line-clamp-3">{currentReservation.special_requests}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Tabs with Dynamic Content */}
          <div className="lg:col-span-2 flex flex-col min-h-0 mt-4">
            <div className="relative flex-1 min-h-0">
              <div className="absolute -inset-0.5 animate-pulse rounded-xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
              <div className="relative rounded-xl border border-border bg-card/50 shadow-xl backdrop-blur-xl p-4 sm:p-6 flex-1 overflow-hidden flex flex-col">
                {isCancelled || isSeated ? (
                  // Show info for cancelled/seated reservations
                  <div className="flex flex-col h-full items-center justify-center gap-6">
                    {isCancelled && (
                      <div className="text-center space-y-4 w-full">
                        <div className="flex justify-center">
                          <div className="h-16 w-16 rounded-full bg-destructive/20 flex items-center justify-center">
                            <XCircle className="h-8 w-8 text-destructive" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Cancellation Information</h3>
                          <div className="space-y-3 mt-4 max-w-md mx-auto">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-destructive/20 rounded-lg flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-destructive" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs text-muted-foreground">Cancellation Date</p>
                                <p className="font-medium text-sm">{formatDateWithTimezone(currentReservation.created_at)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-destructive/20 rounded-lg flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-destructive" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs text-muted-foreground">Cancellation Time</p>
                                <p className="font-medium text-sm">{formatTimeInTimezone(currentReservation.created_at)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isSeated && (
                      <div className="text-center space-y-4 w-full">
                        <div className="flex justify-center">
                          <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold mb-2">Seating Information</h3>
                          <div className="space-y-3 mt-4 max-w-md mx-auto">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-green-500" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs text-muted-foreground">Seated Date</p>
                                <p className="font-medium text-sm">{formatDateWithTimezone(currentReservation.created_at)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-green-500" />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs text-muted-foreground">Seated Time</p>
                                <p className="font-medium text-sm">{formatTimeInTimezone(currentReservation.created_at)}</p>
                              </div>
                            </div>
                            {currentReservation.table_id && (
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0 w-10 h-10 flex items-center justify-center">
                                  <Armchair className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="text-xs text-muted-foreground">Table</p>
                                  <p className="font-medium text-sm">
                                    {loadingTableName ? (
                                      <Loader2 className="h-4 w-4 animate-spin inline" />
                                    ) : (
                                      tableName || currentReservation.table_id
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Show action buttons for active reservations
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActionTab)} className="flex-1 flex flex-col min-h-0">
                    <div className={cn("grid gap-3 mb-4", isDraft ? "grid-cols-4" : "grid-cols-3")}>
                      {isDraft && (
                        <Button
                          variant={activeTab === 'confirm' ? 'default' : 'outline'}
                          className={cn(
                            "h-20 flex flex-col items-center justify-center gap-2",
                            activeTab === 'confirm' && "bg-primary text-primary-foreground"
                          )}
                          onClick={() => setActiveTab('confirm')}
                        >
                          <Check className="h-5 w-5" />
                          <span className="text-sm font-medium">Confirm</span>
                        </Button>
                      )}
                      <Button
                        variant={activeTab === 'seat' ? 'default' : 'outline'}
                        className={cn(
                          "h-20 flex flex-col items-center justify-center gap-2",
                          activeTab === 'seat' && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setActiveTab('seat')}
                        disabled={!isDraft && !canSeat}
                      >
                        <Armchair className="h-5 w-5" />
                        <span className="text-sm font-medium">Seat</span>
                      </Button>
                      <Button
                        variant={activeTab === 'sms' ? 'default' : 'outline'}
                        className={cn(
                          "h-20 flex flex-col items-center justify-center gap-2",
                          activeTab === 'sms' && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setActiveTab('sms')}
                        disabled={!isDraft && !canTakeAction}
                      >
                        <Send className="h-5 w-5" />
                        <span className="text-sm font-medium">Send</span>
                      </Button>
                      <Button
                        variant={activeTab === 'cancel' ? 'destructive' : 'outline'}
                        className={cn(
                          "h-20 flex flex-col items-center justify-center gap-2",
                          activeTab === 'cancel' && "bg-destructive text-destructive-foreground"
                        )}
                        onClick={() => setActiveTab('cancel')}
                        disabled={!isDraft && !canTakeAction}
                      >
                        <XCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Cancel</span>
                      </Button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {isDraft && (
                        <TabsContent value="confirm" className="h-full m-0">
                          {renderRightContent()}
                        </TabsContent>
                      )}
                      <TabsContent value="seat" className="h-full m-0">
                        {renderRightContent()}
                      </TabsContent>
                      <TabsContent value="sms" className="h-full m-0">
                        {renderRightContent()}
                      </TabsContent>
                      <TabsContent value="cancel" className="h-full m-0">
                        {renderRightContent()}
                      </TabsContent>
                    </div>
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

