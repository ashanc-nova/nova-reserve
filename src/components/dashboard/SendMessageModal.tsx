import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Loader2, Send, User, Smartphone, Calendar, Clock, History, CheckCircle2, XCircle, Clock as ClockIcon } from 'lucide-react'
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
    text: 'Hi {name}, we apologize for the inconvenience, but we need to reschedule your reservation for {date} at {time}. Please let us know if you can make it at a different time. Thank you!'
  },
  {
    id: 'reminder',
    label: 'Reminder',
    text: 'Hi {name}, this is a friendly reminder about your reservation for {date} at {time}. We look forward to seeing you!'
  },
  {
    id: 'delay',
    label: 'Running Late',
    text: 'Hi {name}, we apologize, but we are running a bit behind schedule. Your reservation for {date} at {time} may be delayed by approximately 15-20 minutes. We appreciate your patience!'
  },
  {
    id: 'cancellation',
    label: 'Cancellation Notice',
    text: 'Hi {name}, we regret to inform you that we need to cancel your reservation for {date} at {time} due to unforeseen circumstances. We sincerely apologize for any inconvenience. Please contact us to reschedule.'
  },
  {
    id: 'confirmation',
    label: 'Confirmation',
    text: 'Hi {name}, this is to confirm your reservation for {date} at {time} for {party_size} guests. We look forward to serving you!'
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
    return template
      .replace(/{name}/g, reservation.name)
      .replace(/{date}/g, formatDateWithTimezone(reservation.date_time))
      .replace(/{time}/g, formatTimeInTimezone(reservation.date_time))
      .replace(/{party_size}/g, reservation.party_size.toString())
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
      <DialogContent className="bg-[#0C1020]/95 border-white/10 backdrop-blur-xl max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="gradient-text text-2xl">Send Message to Guest</DialogTitle>
              <DialogDescription className="text-muted-foreground">
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
              className="bg-card/50 hover:bg-card border-white/10"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Message History */}
        {showHistory && (
          <div className="mt-4 p-4 bg-card/50 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Message History</h3>
              <Badge variant="outline" className="bg-card/50">
                {messageHistory.length} {messageHistory.length === 1 ? 'message' : 'messages'}
              </Badge>
            </div>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messageHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {messageHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 bg-background/30 rounded-lg border border-white/5 space-y-2"
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
        )}

        {/* Guest Information */}
        <div className="mt-4 p-4 bg-card/50 rounded-lg border border-white/10 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Guest Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="text-sm font-medium">{reservation.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{reservation.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">{formatDateWithTimezone(reservation.date_time)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium">{formatTimeInTimezone(reservation.date_time)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Templates */}
        <div className="mt-4">
          <Label className="text-sm font-semibold mb-2 block">Message Templates</Label>
          <div className="flex flex-wrap gap-2">
            {MESSAGE_TEMPLATES.map((template) => (
              <Badge
                key={template.id}
                variant={selectedTemplate === template.id ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-colors',
                  selectedTemplate === template.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card/50 hover:bg-card border-white/10'
                )}
                onClick={() => handleTemplateSelect(template.id)}
              >
                {template.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="mt-4">
          <Label htmlFor="message" className="text-sm font-semibold mb-2 block">
            Message
          </Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              if (selectedTemplate && selectedTemplate !== 'custom') {
                setSelectedTemplate('custom')
              }
            }}
            placeholder="Type your message here or select a template above..."
            className="bg-background/50 border-white/10 min-h-[120px] resize-none"
            rows={5}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {message.length} characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
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

