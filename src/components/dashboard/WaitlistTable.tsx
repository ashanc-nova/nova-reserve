import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Badge } from '../ui/badge'
import type { WaitlistEntry, Table as TableType } from '../../lib/supabase'
import { WaitlistActions } from './WaitlistActions'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '../../lib/utils'
import { Clock, User, Users, Smartphone, Hourglass } from 'lucide-react'

export function WaitlistTable({ waitlist, tables }: { waitlist: WaitlistEntry[]; tables: TableType[] }) {
  if (waitlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Hourglass className="h-10 w-10 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold gradient-text">The waitlist is empty</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          New guests will appear here after they register.
        </p>
      </div>
    )
  }
  
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10">
            <TableHead className="w-[50px] hidden sm:table-cell">#</TableHead>
            <TableHead className="min-w-[150px]"><User className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Name</TableHead>
            <TableHead><Users className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Party</TableHead>
            <TableHead><Clock className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Wait Time</TableHead>
            <TableHead className="hidden md:table-cell min-w-[150px]"><Smartphone className="inline-block mr-2 h-4 w-4 text-muted-foreground" />Checked In</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right min-w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {waitlist.map((entry, index) => (
            <TableRow key={entry.id} className="animate-in fade-in-50 border-white/10">
              <TableCell className="font-medium hidden sm:table-cell">{index + 1}</TableCell>
              <TableCell className="font-medium">{entry.name}</TableCell>
              <TableCell className="text-center">{entry.party_size}</TableCell>
              <TableCell>{entry.quoted_wait_time}</TableCell>
              <TableCell className="hidden md:table-cell">
                {format(new Date(entry.check_in_time), 'h:mm a')}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    'font-semibold whitespace-nowrap',
                    entry.status === 'notified' ? 'bg-green-900/50 text-green-300 border border-green-500/30' : 'bg-blue-900/50 text-blue-300 border border-blue-500/30',
                  )}
                >
                  {entry.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <WaitlistActions entry={entry} tables={tables} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
