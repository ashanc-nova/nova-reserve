import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Loader2, Send, User, Smartphone, Calendar, Clock, History, CheckCircle2, XCircle, Clock as ClockIcon, ArrowLeft } from 'lucide-react'
import type { Reservation, MessageHistory } from '../../lib/supabase'
import { formatDateWithTimezone, formatTimeInTimezone } from '../../lib/timezone-utils'
import { cn } from '../../lib/utils'
import { getMessageHistory } from '../../lib/supabase-data'
import { format } from 'date-fns'

interface SendMessageModalProps {
  reservation: Reservation
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (message: string) => Promise<void>
}

const MESSAGE_TEMPLATES = [
  {
    id: 'reschedule',
    label: 'Reschedule Request',
    text: 'Hi {name}, we need to reschedule your reservation for {date} at {time}. Please let us know if another time works.'
  },
  {
    id: 'reminder',
    label: 'Reminder',
    text: 'Hi {name}, reminder: your reservation is {date} at {time}. See you soon!'
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
  {
    id: 'confirmation',
    label: 'Confirmation',
    text: 'Hi {name}, confirmed: {date} at {time} for {party_size} guests. See you soon!'
  },
  {
    id: 'custom',
    label: 'Custom Message',
    text: ''
  }
]

export function SendMessageModal({ reservation, open, onOpenChange, onSend }: SendMessageModalProps) {
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const formatMessage = (template: string): string => {
    const formatted = template
      .replace(/{name}/g, reservation.name)
      .replace(/{date}/g, formatDateWithTimezone(reservation.date_time))
      .replace(/{time}/g, formatTimeInTimezone(reservation.date_time))
      .replace(/{party_size}/g, reservation.party_size.toString())
    
    // Truncate to 160 characters max (130 for template content + name)
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

  useEffect(() => {
    if (open && showHistory) {
      loadMessageHistory()
    }
  }, [open, showHistory, reservation.id])

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

  const handleSend = async () => {
    if (!message.trim()) {
      return
    }

    setIsSending(true)
    try {
      await onSend(message.trim())
      setMessage('')
      setSelectedTemplate(null)
      // Refresh history if it's open
      if (showHistory) {
        await loadMessageHistory()
      }
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSending(false)
    }
  }

  const getStatusIcon = (status: MessageHistory['status']) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-400" />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border backdrop-blur-xl max-w-5xl h-[60vh] sm:h-[70vh] md:h-[75vh] flex flex-col overflow-hidden w-[95vw] sm:w-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <DialogTitle className="gradient-text text-xl sm:text-2xl">Send Message to Guest</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Send an SMS message to the guest for this reservation
              </DialogDescription>
            </div>
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
        </DialogHeader>

        {/* Two Column Layout */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0">
          {/* Left Column - Guest Information */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="p-3 sm:p-4 bg-card/50 rounded-lg border border-border space-y-3 sm:space-y-4 flex-1">
              <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground">Guest Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                    <p className="text-sm font-medium">{reservation.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <p className="text-sm font-medium">{reservation.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="text-sm font-medium">{formatDateWithTimezone(reservation.date_time)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Time</p>
                    <p className="text-sm font-medium">{formatTimeInTimezone(reservation.date_time)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Message Templates & Input OR Message History */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {showHistory ? (
              /* Message History View */
              <div className="flex flex-col space-y-4 flex-1 min-h-0">
                <div className="flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowHistory(false)}
                      className="bg-card/50 hover:bg-card border-border"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-sm font-semibold text-muted-foreground">Message History</h3>
                  </div>
                  <Badge variant="outline" className="bg-card/50">
                    {messageHistory.length} {messageHistory.length === 1 ? 'message' : 'messages'}
                  </Badge>
                </div>
                <div className="flex-1 p-4 bg-card/50 rounded-lg border border-border min-h-0 overflow-hidden flex flex-col">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center flex-1">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : messageHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1">
                      <History className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">No messages sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto flex-1">
                      {messageHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3 bg-background/30 rounded-lg border border-border/50 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              {getStatusIcon(msg.status)}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.sent_at), 'MMM d, yyyy h:mm a')}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  msg.status === 'sent' && 'bg-green-900/20 text-green-300 border-green-500/30',
                                  msg.status === 'failed' && 'bg-red-900/20 text-red-300 border-red-500/30',
                                  msg.status === 'pending' && 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30'
                                )}
                              >
                                {msg.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Message Templates & Input View */
              <div className="flex flex-col space-y-4 flex-1 min-h-0">
                {/* Message Templates */}
                <div className="flex-shrink-0">
                  <Label className="text-sm font-semibold mb-3 block">Message Templates</Label>
                  <div className="flex flex-wrap gap-2">
                    {MESSAGE_TEMPLATES.map((template) => (
                      <Badge
                        key={template.id}
                        variant={selectedTemplate === template.id ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selectedTemplate === template.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card/50 hover:bg-card border-border'
                        )}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        {template.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Message Input */}
                <div className="flex-1 flex flex-col min-h-0">
                  <Label htmlFor="message" className="text-sm font-semibold mb-2 block">
                    Message
                  </Label>
                  <Textarea
                    id="message"
                    value={message}
                    maxLength={160}
                    onChange={(e) => {
                      const newValue = e.target.value.slice(0, 160)
                      setMessage(newValue)
                      if (selectedTemplate && selectedTemplate !== 'custom') {
                        setSelectedTemplate('custom')
                      }
                    }}
                    placeholder="Type your message here or select a template above..."
                    className="bg-background/50 border-border min-h-[140px] resize-none flex-1"
                    rows={5}
                  />
                  <p className={cn(
                    "text-xs mt-2 flex-shrink-0",
                    message.length >= 160 ? "text-red-400" : "text-muted-foreground"
                  )}>
                    {message.length} / 160 characters
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setMessage('')
              setSelectedTemplate(null)
            }}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="bg-primary hover:bg-primary/90"
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
      </DialogContent>
    </Dialog>
  )
}

