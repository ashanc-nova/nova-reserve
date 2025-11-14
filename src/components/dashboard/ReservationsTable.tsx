import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import type { Reservation, Table as TableType } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { Calendar, Clock, Users, Smartphone, User, Hourglass, MessageSquare, Star } from 'lucide-react'
import { ReservationsActions } from './ReservationsActions'
import { formatDateWithTimezone, formatTimeInTimezone } from '../../lib/timezone-utils'

export function ReservationsTable({ reservations, tables }: { reservations: Reservation[]; tables: TableType[] }) {
  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="h-10 w-10 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold gradient-text">No Upcoming Reservations</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          New reservations made by guests will appear here.
        </p>
      </div>
    )
  }
  
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10">
            <TableHead className="min-w-[150px]"><User className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Name</TableHead>
            <TableHead><Users className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Party</TableHead>
            <TableHead className="min-w-[120px]"><Calendar className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Date</TableHead>
            <TableHead><Clock className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="min-w-[120px]">Special</TableHead>
            <TableHead className="text-right min-w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((entry) => (
            <TableRow key={entry.id} className="animate-in fade-in-50 border-white/10">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{entry.name}</span>
                  {entry.phone && (
                    <span className="text-xs text-muted-foreground mt-0.5">{entry.phone}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">{entry.party_size}</TableCell>
              <TableCell>{formatDateWithTimezone(entry.date_time)}</TableCell>
              <TableCell>{formatTimeInTimezone(entry.date_time)}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    'font-semibold whitespace-nowrap',
                    entry.status === 'confirmed' ? 'bg-primary/20 text-primary border border-primary/30' :
                    entry.status === 'notified' ? 'bg-blue-900/50 text-blue-300 border border-blue-500/30' :
                    entry.status === 'seated' ? 'bg-green-900/50 text-green-300 border border-green-500/30' :
                    'bg-gray-700 text-gray-300 border-gray-500/30'
                  )}
                >
                  {entry.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {entry.special_occasion_type && (
                    <Badge variant="outline" className="text-xs bg-yellow-900/20 text-yellow-300 border-yellow-500/30">
                      <Star className="mr-1 h-3 w-3" />
                      {entry.special_occasion_type}
                    </Badge>
                  )}
                  {entry.special_requests && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className="text-xs bg-blue-900/20 text-blue-300 border-blue-500/30 cursor-pointer hover:bg-blue-900/30 transition-colors"
                        >
                          <MessageSquare className="mr-1 h-3 w-3" />
                          Notes
                        </Badge>
                      </DialogTrigger>
                      <DialogContent className="bg-[#0C1020]/95 border-white/10 backdrop-blur-xl">
                        <DialogHeader>
                          <DialogTitle className="gradient-text">Special Requests</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Customer notes for {entry.name}'s reservation
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 p-4 bg-card/50 rounded-lg border border-white/10">
                          <p className="text-sm leading-relaxed">{entry.special_requests}</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <ReservationsActions reservation={entry} tables={tables} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
