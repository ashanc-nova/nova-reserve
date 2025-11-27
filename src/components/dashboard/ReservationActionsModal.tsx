import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Loader2, Send, User, Smartphone, Calendar, Clock, History, XCircle, Armchair, ArrowLeft, CheckCircle2, Mail, DollarSign, Star, MessageSquare, X } from 'lucide-react'
import type { Reservation, MessageHistory } from '../../lib/supabase'
import { formatDateWithTimezone, formatTimeInTimezone } from '../../lib/timezone-utils'
import { cn } from '../../lib/utils'
import { getMessageHistory, seatReservation, updateReservationStatus, saveMessageHistory } from '../../lib/supabase-data'
import { sendCustomSMS, getNovaTableStatus, bookNovaTable } from '../../lib/nova-api'
import type { NovaArea, NovaTable } from '../../lib/nova-api'
import { useToast } from '../../hooks/use-toast'
import { useGlobalState } from '../../lib/global-state'
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

type ActionTab = 'seat' | 'sms' | 'cancel'

const MESSAGE_TEMPLATES = [
  {
    id: 'reminder',
    label: 'Reminder',
    text: 'Hi {name}, reminder: your reservation is {date} at {time}. See you soon!'
  },
  {
    id: 'reschedule',
    label: 'Reschedule',
    text: 'Hi {name}, we need to reschedule your reservation for {date} at {time}. Please let us know if another time works.'
  },
  {
    id: 'delay',
    label: 'Running Late',
    text: 'Hi {name}, we\'re running behind. Your reservation for {date} at {time} may be delayed 15-20 min. Thanks!'
  },
  {
    id: 'cancellation',
    label: 'Cancellation Notice',
    text: 'Hi {name}, we need to cancel your reservation for {date} at {time}. We apologize. Please contact us to reschedule.'
  },
  // {
  //   id: 'confirmation',
  //   label: 'Confirmation',
  //   text: 'Hi {name}, your reservation for {date} at {time} is confirmed. See you soon!'
  // },
  {
    id: 'custom',
    label: 'Custom Message',
    text: ''
  }
]

export function ReservationActionsModal({ reservation, open, onOpenChange }: ReservationActionsModalProps) {
  const [activeTab, setActiveTab] = useState<ActionTab>('seat')
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const { toast } = useToast()
  const { refreshReservations } = useGlobalState()

  const canTakeAction = reservation.status === 'confirmed' || reservation.status === 'notified'
  const canSeat = canTakeAction

  // Reset view when modal opens/closes
  useEffect(() => {
    if (open) {
      setActiveTab('seat')
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
  }, [open, activeTab, showHistory, reservation.id])

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
      const history = await getMessageHistory(reservation.id)
      setMessageHistory(history)
    } catch (error) {
      console.error('Failed to load message history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const formatMessage = (template: string): string => {
    const formatted = template
      .replace(/{name}/g, reservation.name)
      .replace(/{date}/g, formatDateWithTimezone(reservation.date_time))
      .replace(/{time}/g, formatTimeInTimezone(reservation.date_time))
      .replace(/{party_size}/g, reservation.party_size.toString())
    
    return formatted.length > 160 ? formatted.substring(0, 160) : formatted
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
      if (!reservation.novacustomer_id) {
        throw new Error('Customer Nova ID is missing.')
      }

      const reservationDate = new Date(reservation.date_time).toISOString()

      await bookNovaTable({
        tableRefId: table.refId,
        customerRefId: reservation.novacustomer_id,
        reservationDate: reservationDate,
        seatsRequired: reservation.party_size
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
      await seatReservation(reservation.id, tableRefId)
      toast({ 
        title: "Guest Seated", 
        description: `${reservation.name} has been assigned to table ${tableName} (${seatingCapacity} seats).` 
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
      const phoneNumber = reservation.phone.replace(/\D/g, '')
      await sendCustomSMS(phoneNumber, '+1', message)
      
      await saveMessageHistory(reservation.id, message, 'sent')
      
      toast({ 
        title: "Message Sent", 
        description: `Message sent to ${reservation.name} at ${reservation.phone}.`
      })
      await refreshReservations()
      setMessage('')
      setSelectedTemplate(null)
      setActionView('actions')
    } catch (error: any) {
      await saveMessageHistory(reservation.id, message, 'failed')
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send message", 
        variant: "destructive" 
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleCancel = async () => {
    setIsCancelLoading(true)
    try {
      await updateReservationStatus(reservation.id, 'cancelled')
      toast({ title: "Reservation Cancelled", description: `Reservation for ${reservation.name} has been cancelled.` })
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
              <div className="flex-1 overflow-y-auto">
                <Tabs defaultValue={areas[0]?.areaName || ''} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 mb-4">
                    {areas.map((area) => (
                      <TabsTrigger key={area.areaName} value={area.areaName} className="text-xs sm:text-sm">
                        {area.areaName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {areas.map((area) => (
                    <TabsContent key={area.areaName} value={area.areaName}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {area.tables
                          .filter(table => table.seatingCapacity >= reservation.party_size)
                          .map((table) => (
                            <Button
                              key={table.refId}
                              variant="outline"
                              className={cn(
                                "h-auto p-4 flex flex-col items-center gap-2 bg-card/50 hover:bg-card border-border",
                                selecting === table.refId && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={selecting === table.refId || isSeatLoading}
                              onClick={() => handleSelectTable(table)}
                            >
                              {selecting === table.refId ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                <Armchair className="h-6 w-6" />
                              )}
                              <div className="text-center">
                                <div className="font-semibold text-sm">{table.tableName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {table.seatingCapacity} seats
                                </div>
                              </div>
                            </Button>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
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
                  Are you sure you want to cancel the reservation for <strong>{reservation.name}</strong>?
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
                    This will cancel the reservation for {reservation.name}. This action cannot be undone.
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
        <div className="absolute -right-3 -top-3 z-50">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-background border-2 border-border shadow-lg opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-2.5 h-10 w-10 flex items-center justify-center"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0 px-6 pt-8 pb-6">
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
                      <p className="font-medium text-sm">{reservation.name}</p>
                    </div>
                  </div>
                  {reservation.email && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-sm truncate">{reservation.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium text-sm">{reservation.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium text-sm">{formatDateWithTimezone(reservation.date_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-medium text-sm">{formatTimeInTimezone(reservation.date_time)}</p>
                    </div>
                  </div>
                  {reservation.payment_amount && reservation.payment_amount > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-medium text-sm text-green-600 dark:text-green-400">
                          ${reservation.payment_amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                  {reservation.special_occasion_type && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <Star className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Occasion</p>
                        <p className="font-medium text-sm">{reservation.special_occasion_type}</p>
                      </div>
                    </div>
                  )}
                  {reservation.special_requests && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="font-medium text-sm line-clamp-3">{reservation.special_requests}</p>
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
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActionTab)} className="flex-1 flex flex-col min-h-0">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <Button
                      variant={activeTab === 'seat' ? 'default' : 'outline'}
                      className={cn(
                        "h-20 flex flex-col items-center justify-center gap-2",
                        activeTab === 'seat' && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => setActiveTab('seat')}
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
                      disabled={!canTakeAction}
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
                      disabled={!canTakeAction}
                    >
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Cancel</span>
                    </Button>
                  </div>
                  <div className="flex-1 overflow-hidden">
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
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

