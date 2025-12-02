import { useState, useEffect } from 'react'
import * as React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import type { Reservation } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { Calendar, Users, User, MessageSquare, Star, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Checkbox } from '../ui/checkbox'
import { ReservationActionsModal } from './ReservationActionsModal'
import { formatDateWithTimezone, formatTimeInTimezone } from '../../lib/timezone-utils'

type SortColumn = 'name' | 'party' | 'date' | 'paid' | null
type SortDirection = 'asc' | 'desc'
type ReservationView = 'active' | 'past'

interface ReservationsTableProps {
  activeReservations?: Reservation[]
  historyReservations?: Reservation[]
  reservations?: Reservation[]
  hideHeader?: boolean
  isEmbedded?: boolean
  reservationView?: ReservationView
  onReservationViewChange?: (view: ReservationView) => void
  searchQuery?: string
}

export function ReservationsTable({ 
  activeReservations, 
  historyReservations, 
  reservations, 
  hideHeader = false, 
  isEmbedded = false,
  reservationView = 'active',
  onReservationViewChange,
  searchQuery = ''
}: ReservationsTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(7)
  
  // Calculate items per page based on screen height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      const screenHeight = window.innerHeight
      
      if (isEmbedded) {
        // For embedded view (card-based) - calculate based on fixed card height
        const headerHeight = 60 // Table header with filters
        const paginationHeight = 70 // Pagination controls
        const paddingAndMargin = 60 // Top/bottom padding
        const cardHeight = 88 // Fixed card height
        const cardSpacing = 12 // Space between cards (space-y-3)
        
        const availableHeight = screenHeight - headerHeight - paginationHeight - paddingAndMargin
        const rowsCount = Math.floor(availableHeight / (cardHeight + cardSpacing))
        setItemsPerPage(Math.max(4, Math.min(rowsCount, 12))) // Min 4, Max 12
      } else {
        // For regular table view - calculate dynamically with conservative buffer
        const headerHeight = 140 // App header + title + extra buffer
        const tableHeaderHeight = 70 // Table header with filters
        const paginationHeight = 70 // Pagination controls + buffer
        const paddingAndMargin = 100 // Various paddings + safety margin
        const rowHeight = 60 // Each table row + spacing
        
        const availableHeight = screenHeight - headerHeight - tableHeaderHeight - paginationHeight - paddingAndMargin
        const rowsCount = Math.floor(availableHeight / rowHeight)
        setItemsPerPage(Math.max(5, Math.min(rowsCount, 10))) // Min 5, Max 10
      }
    }
    
    calculateItemsPerPage()
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateItemsPerPage)
    return () => window.removeEventListener('resize', calculateItemsPerPage)
  }, [isEmbedded])
  
  // Determine which reservations to display
  // Use activeReservations/historyReservations if provided (for both embedded and desktop views)
  // Otherwise fall back to reservations prop
  const displayReservations = (activeReservations && historyReservations)
    ? (reservationView === 'active' ? activeReservations : historyReservations)
    : (reservations || [])
  
  // Check if any reservation has a payment amount
  const hasPaymentAmount = displayReservations.some(r => r.payment_amount && r.payment_amount > 0)
  
  // Get unique statuses from reservations, excluding 'notified' (treat as 'confirmed' in UI)
  const uniqueStatuses = Array.from(new Set(displayReservations.map(r => r.status)))
    .filter(status => status !== 'notified') // Remove 'notified' from status filters
    .sort()
  
  // Check if filters are applied
  const hasActiveFilters = statusFilters.length > 0
  
  // Sort reservations
  const sortedReservations = [...displayReservations].sort((a, b) => {
    if (!sortColumn) return 0
    
    let comparison = 0
    
    switch (sortColumn) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'party':
        comparison = a.party_size - b.party_size
        break
      case 'date':
        comparison = new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
        break
      case 'paid':
        const aAmount = a.payment_amount || 0
        const bAmount = b.payment_amount || 0
        comparison = aAmount - bAmount
        break
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })
  
  // Filter by status (multi-select)
  // Treat 'notified' as 'confirmed' for filtering purposes
  const statusFilteredReservations = statusFilters.length === 0
    ? sortedReservations 
    : sortedReservations.filter(r => {
        const displayStatus = r.status === 'notified' ? 'confirmed' : r.status
        return statusFilters.includes(displayStatus)
      })
  
  // Filter by search query (name, phone, email)
  const searchTerm = (searchQuery || '').trim()
  const filteredReservations = searchTerm === ''
    ? statusFilteredReservations
    : statusFilteredReservations.filter(r => {
        const query = searchTerm.toLowerCase()
        
        // Search by name
        const nameMatch = (r.name || '').toLowerCase().includes(query)
        
        // Search by phone (remove all non-digits for comparison)
        const phoneDigits = (r.phone || '').replace(/\D/g, '')
        const queryDigits = query.replace(/\D/g, '')
        const phoneMatch = queryDigits.length > 0 && phoneDigits.includes(queryDigits)
        
        // Search by email
        const emailMatch = (r.email || '').toLowerCase().includes(query)
        
        return nameMatch || phoneMatch || emailMatch
      })
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentReservations = filteredReservations.slice(startIndex, endIndex)
  
  // Reset to page 1 when view changes or search query changes
  useEffect(() => {
    setCurrentPage(1)
    setSortColumn(null)
    setStatusFilters([])
  }, [reservationView])
  
  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])
  
  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }
  
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> no sort
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        // Reset to no sort
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      // New column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
    // Reset to first page when sorting changes
    setCurrentPage(1)
  }
  
  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground pointer-events-none" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4 text-primary pointer-events-none" />
      : <ArrowDown className="ml-2 h-4 w-4 text-primary pointer-events-none" />
  }
  
  // Reset to page 1 if current page is out of bounds or when reservations change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages, filteredReservations.length])
  
  if (displayReservations.length === 0) {
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
  
  // Show "No results" message when search returns no results
  if (searchTerm && filteredReservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[400px]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Calendar className="h-10 w-10 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold gradient-text">No Results Found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No reservations match your search query "{searchTerm}".
        </p>
      </div>
    )
  }
  
  return (
    <div className="w-full flex flex-col">
      {/* Table Header - Always show for column labels and filters */}
      {!hideHeader && (
        <div className={cn(
          "overflow-x-auto",
          isEmbedded ? "mx-0 mb-4" : "-mx-3 sm:mx-0"
        )}>
          <div className={cn(
            "inline-block min-w-full align-middle",
            isEmbedded ? "px-0" : "px-3 sm:px-0"
          )}>
            <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead 
                  className="min-w-[120px] sm:min-w-[150px] cursor-pointer select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center text-xs sm:text-sm pointer-events-none">
                    <User className="inline-block mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="hidden sm:inline">Name</span>
                    <span className="sm:hidden">Name</span>
                    {getSortIcon('name')}
                  </div>
                </TableHead>
                <TableHead 
                  className="min-w-[60px] cursor-pointer select-none"
                  onClick={() => handleSort('party')}
                >
                  <div className="flex items-center text-xs sm:text-sm pointer-events-none">
                    <Users className="inline-block mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="hidden sm:inline">Party</span>
                    <span className="sm:hidden">P</span>
                    {getSortIcon('party')}
                  </div>
                </TableHead>
                <TableHead 
                  className="min-w-[130px] sm:min-w-[150px] cursor-pointer select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center text-xs sm:text-sm pointer-events-none">
                    <Calendar className="inline-block mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="hidden md:inline">Date & Time</span>
                    <span className="md:hidden">Date</span>
                    {getSortIcon('date')}
                  </div>
                </TableHead>
                {hasPaymentAmount && (
                  <TableHead 
                    className="min-w-[80px] sm:min-w-[100px] cursor-pointer select-none"
                    onClick={() => handleSort('paid')}
                  >
                    <div className="flex items-center text-xs sm:text-sm pointer-events-none">
                      Paid
                      {getSortIcon('paid')}
                    </div>
                  </TableHead>
                )}
                <TableHead className="min-w-[120px] sm:min-w-[140px] text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-6 w-6 p-0 hover:bg-transparent relative",
                            hasActiveFilters && "text-primary"
                          )}
                        >
                          <Filter className={cn(
                            "h-3 w-3 sm:h-4 sm:w-4",
                            hasActiveFilters && "text-primary"
                          )} />
                          {hasActiveFilters && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3" align="start">
                        <div className="space-y-2">
                          <div className="text-sm font-medium mb-2">Filter by Status</div>
                          {uniqueStatuses.map(status => (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={`status-${status}`}
                                checked={statusFilters.includes(status)}
                                onCheckedChange={() => toggleStatusFilter(status)}
                              />
                              <label
                                htmlFor={`status-${status}`}
                                className="text-sm font-normal cursor-pointer flex-1"
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                              </label>
                            </div>
                          ))}
                          {hasActiveFilters && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-2 text-xs"
                              onClick={() => setStatusFilters([])}
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableHead>
                <TableHead className="min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm">Special</TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>
      </div>
      )}

      {/* Card Layout for Embedded View */}
      {isEmbedded ? (
        <div className="space-y-3">
          {currentReservations.map((entry) => {
            const isSelected = selectedReservationId === entry.id
            return (
              <React.Fragment key={entry.id}>
                <div
                  onClick={() => setSelectedReservationId(entry.id)}
                  className="cursor-pointer transition-all duration-200 border-2 border-border rounded-2xl shadow-md hover:shadow-xl bg-card hover:border-primary/30 p-4 active:scale-[0.99] h-[80px]"
                >
                  <div className="grid grid-cols-6 gap-4 items-center h-full">
                    {/* Name Column */}
                    <div className="col-span-1 min-w-[120px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{entry.name}</span>
                        {entry.phone && (
                          <span className="text-xs text-muted-foreground mt-0.5">{entry.phone}</span>
                        )}
                      </div>
                    </div>

                    {/* Party Column */}
                    <div className="col-span-1 text-center min-w-[60px]">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <span className="font-bold text-sm text-primary">{entry.party_size}</span>
                      </div>
                    </div>

                    {/* Date & Time Column */}
                    <div className="col-span-1 min-w-[130px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{formatDateWithTimezone(entry.date_time)}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{formatTimeInTimezone(entry.date_time)}</span>
                      </div>
                    </div>

                    {/* Paid Column */}
                    {hasPaymentAmount && (
                      <div className="col-span-1 min-w-[80px]">
                        {entry.payment_amount && entry.payment_amount > 0 && (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/20">
                            <span className="font-bold text-sm text-green-600 dark:text-green-400">
                              ${entry.payment_amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Column */}
                    <div className={cn("col-span-1", hasPaymentAmount ? "min-w-[120px]" : "min-w-[140px]")}>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'font-semibold whitespace-nowrap px-4 py-2',
                          (entry.status === 'confirmed' || entry.status === 'notified') ? 'bg-primary/20 text-primary border-2 border-primary/30' :
                          entry.status === 'seated' ? 'bg-green-100 text-green-700 border-2 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-500/30' :
                          'bg-gray-100 text-gray-700 border-2 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500/30'
                        )}
                      >
                        {entry.status === 'notified' ? 'confirmed' : entry.status}
                      </Badge>
                    </div>

                    {/* Special Column */}
                    <div className="col-span-1 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1">
                        {entry.special_occasion_type && (
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-500/30">
                            <Star className="mr-1 h-3 w-3" />
                            {entry.special_occasion_type}
                          </Badge>
                        )}
                        {entry.special_requests && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className="text-xs bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500/30 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                <MessageSquare className="mr-1 h-3 w-3" />
                                Notes
                              </Badge>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border backdrop-blur-xl">
                              <DialogHeader>
                                <DialogTitle className="gradient-text">Special Requests</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                  Customer notes for {entry.name}'s reservation
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-4 p-4 bg-card/50 rounded-lg border border-border">
                                <p className="text-sm leading-relaxed">{entry.special_requests}</p>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <ReservationActionsModal
                  reservation={entry}
                  open={isSelected}
                  onOpenChange={(open) => setSelectedReservationId(open ? entry.id : null)}
                />
              </React.Fragment>
            )
          })}
          {/* Empty placeholder cards to maintain fixed height */}
          {Array.from({ length: Math.max(0, itemsPerPage - currentReservations.length) }).map((_, index) => (
            <div
              key={`empty-card-${index}`}
              className="border-2 border-transparent rounded-2xl h-[80px]"
            />
          ))}
        </div>
      ) : (
        /* Regular Table Layout for Desktop */
        <div className="overflow-x-auto -mx-3 sm:mx-0" style={{ minHeight: `calc(${itemsPerPage} * 3.5rem + 3rem)` }}>
          <div className="inline-block min-w-full align-middle px-3 sm:px-0">
            <Table>
              <TableBody>
                {currentReservations.map((entry) => {
                  const isSelected = selectedReservationId === entry.id
                  return (
                  <React.Fragment key={entry.id}>
                    <TableRow 
                      className="animate-in fade-in-50 border-border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedReservationId(entry.id)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs sm:text-sm">{entry.name}</span>
                          {entry.phone && (
                            <span className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{entry.phone}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs sm:text-sm">{entry.party_size}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs sm:text-sm">{formatDateWithTimezone(entry.date_time)}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{formatTimeInTimezone(entry.date_time)}</span>
                        </div>
                      </TableCell>
                      {hasPaymentAmount && (
                        <TableCell>
                          {entry.payment_amount && entry.payment_amount > 0 && (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              ${entry.payment_amount.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'font-semibold whitespace-nowrap',
                            (entry.status === 'confirmed' || entry.status === 'notified') ? 'bg-primary/20 text-primary border border-primary/30' :
                            entry.status === 'seated' ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-500/30' :
                            'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500/30'
                          )}
                        >
                          {entry.status === 'notified' ? 'confirmed' : entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          {entry.special_occasion_type && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-500/30">
                              <Star className="mr-1 h-3 w-3" />
                              {entry.special_occasion_type}
                            </Badge>
                          )}
                          {entry.special_requests && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-500/30 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                                >
                                  <MessageSquare className="mr-1 h-3 w-3" />
                                  Notes
                                </Badge>
                              </DialogTrigger>
                              <DialogContent className="bg-card border-border backdrop-blur-xl">
                                <DialogHeader>
                                  <DialogTitle className="gradient-text">Special Requests</DialogTitle>
                                  <DialogDescription className="text-muted-foreground">
                                    Customer notes for {entry.name}'s reservation
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4 p-4 bg-card/50 rounded-lg border border-border">
                                  <p className="text-sm leading-relaxed">{entry.special_requests}</p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    <ReservationActionsModal
                      reservation={entry}
                      open={isSelected}
                      onOpenChange={(open) => setSelectedReservationId(open ? entry.id : null)}
                    />
                  </React.Fragment>
                )
                })}
                {/* Empty rows to maintain fixed height - always show 7 rows total */}
                {Array.from({ length: Math.max(0, itemsPerPage - currentReservations.length) }).map((_, index) => (
                  <TableRow key={`empty-${index}`} className="border-border">
                    <TableCell colSpan={hasPaymentAmount ? 6 : 5} className="h-[3.5rem] border-transparent"></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      
      {/* Pagination Controls - Fixed at bottom */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-2 flex-shrink-0 gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            <span className="hidden sm:inline">Showing {startIndex + 1} to {Math.min(endIndex, filteredReservations.length)} of {filteredReservations.length} reservations</span>
            <span className="sm:hidden">{startIndex + 1}-{Math.min(endIndex, filteredReservations.length)} of {filteredReservations.length}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 sm:h-9 sm:w-9 text-xs sm:text-sm"
                    >
                      {page}
                    </Button>
                  )
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span key={page} className="px-1 sm:px-2 text-muted-foreground text-xs sm:text-sm">
                      ...
                    </span>
                  )
                }
                return null
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
