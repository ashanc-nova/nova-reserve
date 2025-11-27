import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Badge } from '../ui/badge'
import type { WaitlistEntry } from '../../lib/supabase'
import { WaitlistActions } from './WaitlistActions'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '../../lib/utils'
import { Clock, User, Users, Smartphone, Hourglass } from 'lucide-react'

export function WaitlistTable({ waitlist }: { waitlist: WaitlistEntry[] }) {
  if (waitlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center h-[300px] sm:h-[400px]">
        <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary/10">
          <Hourglass className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>
        <h3 className="mt-4 text-base sm:text-lg font-semibold gradient-text">The waitlist is empty</h3>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          New guests will appear here after they register.
        </p>
      </div>
    )
  }
  
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
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
            <TableRow key={entry.id} className="animate-in fade-in-50 border-border">
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
                    entry.status === 'notified' ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-500/30' : 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-500/30',
                  )}
                >
                  {entry.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <WaitlistActions entry={entry} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
