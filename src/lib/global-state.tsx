import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Reservation, Table, WaitlistEntry } from './supabase'
import { getAllReservations, getFullWaitlist, getTables, getWaitlist, isWaitlistPaused, getRestaurant, getRestaurantId } from './supabase-data'
import { setRestaurantTimezone } from './timezone-utils'
import { supabase } from './supabase'

interface GlobalState {
  waitlist: WaitlistEntry[]
  allGuests: WaitlistEntry[]
  tables: Table[]
  waitlistPaused: boolean
  allReservations: Reservation[]
  loading: { waitlist: boolean; tables: boolean; reservations: boolean }
  error: string | null
  refreshWaitlist: () => Promise<void>
  refreshReservations: () => Promise<void>
  refreshTables: () => Promise<void>
  refreshAll: () => Promise<void>
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined)

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [allGuests, setAllGuests] = useState<WaitlistEntry[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [waitlistPaused, setWaitlistPaused] = useState(false)
  const [allReservations, setAllReservations] = useState<Reservation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState({ waitlist: false, tables: false, reservations: false })

  const refreshWaitlist = useCallback(async () => {
    try {
      setLoading((p) => ({ ...p, waitlist: true }))
      const [wl, all, paused] = await Promise.all([getWaitlist(), getFullWaitlist(), isWaitlistPaused()])
      setWaitlist(wl); setAllGuests(all); setWaitlistPaused(paused)
    } catch (e) {
      setError('Failed to refresh waitlist')
    } finally { setLoading((p) => ({ ...p, waitlist: false })) }
  }, [])

  const refreshReservations = useCallback(async () => {
    try {
      setLoading((p) => ({ ...p, reservations: true }))
      const res = await getAllReservations(); setAllReservations(res)
    } catch { setError('Failed to refresh reservations') }
    finally { setLoading((p) => ({ ...p, reservations: false })) }
  }, [])

  const refreshTables = useCallback(async () => {
    try {
      setLoading((p) => ({ ...p, tables: true }))
      const t = await getTables(); setTables(t)
    } catch { setError('Failed to refresh tables') }
    finally { setLoading((p) => ({ ...p, tables: false })) }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshWaitlist(), refreshReservations(), refreshTables()])
  }, [refreshWaitlist, refreshReservations, refreshTables])

  useEffect(() => { 
    refreshAll().catch(() => undefined)
    // Load timezone setting
    getRestaurant().then(restaurant => {
      const timezone = restaurant.settings?.manager_settings?.timezone || 'America/Los_Angeles'
      setRestaurantTimezone(timezone)
    }).catch(() => undefined)
  }, [])

  // Set up real-time subscriptions with polling fallback for auto-refresh
  useEffect(() => {
    if (!supabase) return

    let reservationsChannel: ReturnType<typeof supabase.channel> | null = null
    let waitlistChannel: ReturnType<typeof supabase.channel> | null = null
    let tablesChannel: ReturnType<typeof supabase.channel> | null = null
    let pollingInterval: ReturnType<typeof setInterval> | null = null

    const POLLING_INTERVAL = 600000 // Poll every 10 minutes (600000 ms) as fallback
    let realtimeWorking = false
    let realtimeCheckTimeout: ReturnType<typeof setTimeout> | null = null

    const startPolling = () => {
      // Don't start polling if real-time is working
      if (realtimeWorking) {
        return
      }

      // Clear any existing polling interval
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      
      // Set up polling interval
      pollingInterval = setInterval(() => {
        refreshReservations().catch(() => undefined)
        refreshWaitlist().catch(() => undefined)
        refreshTables().catch(() => undefined)
      }, POLLING_INTERVAL)
      
      console.log(`⚠️ Polling enabled: refreshing every ${POLLING_INTERVAL / 60000} minutes (real-time unavailable)`)
    }

    const stopPolling = () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
        console.log('✅ Polling stopped - real-time is active')
      }
    }

    const setupSubscriptions = async () => {
      try {
        const restaurantId = await getRestaurantId()

        // Try to set up real-time subscriptions
        try {
          let subscriptionsActive = 0
          let subscriptionsFailed = 0
          const totalSubscriptions = 3

          const checkRealtimeStatus = () => {
            if (subscriptionsActive === totalSubscriptions && !realtimeWorking) {
              realtimeWorking = true
              console.log('✅ Real-time subscriptions active - polling disabled')
              stopPolling()
              // Clear the timeout that would start polling
              if (realtimeCheckTimeout) {
                clearTimeout(realtimeCheckTimeout)
                realtimeCheckTimeout = null
              }
            } else if (subscriptionsFailed === totalSubscriptions && !realtimeWorking) {
              // All subscriptions failed, start polling
              console.warn('❌ All real-time subscriptions failed, starting polling fallback')
              if (!pollingInterval) startPolling()
            }
          }

          // Subscribe to reservations changes
          reservationsChannel = supabase
            .channel('reservations-changes')
            .on(
              'postgres_changes',
              {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'reservations',
                filter: `restaurant_id=eq.${restaurantId}`,
              },
              (payload) => {
                console.log('Reservation change detected:', payload.eventType)
                refreshReservations().catch(() => undefined)
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                subscriptionsActive++
                checkRealtimeStatus()
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                subscriptionsFailed++
                console.warn('Reservations real-time subscription failed:', status)
                checkRealtimeStatus()
              }
            })

          // Subscribe to waitlist changes
          waitlistChannel = supabase
            .channel('waitlist-changes')
            .on(
              'postgres_changes',
              {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'waitlist_entries',
                filter: `restaurant_id=eq.${restaurantId}`,
              },
              (payload) => {
                console.log('Waitlist change detected:', payload.eventType)
                refreshWaitlist().catch(() => undefined)
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                subscriptionsActive++
                checkRealtimeStatus()
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                subscriptionsFailed++
                console.warn('Waitlist real-time subscription failed:', status)
                checkRealtimeStatus()
              }
            })

          // Subscribe to tables changes
          tablesChannel = supabase
            .channel('tables-changes')
            .on(
              'postgres_changes',
              {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'tables',
                filter: `restaurant_id=eq.${restaurantId}`,
              },
              (payload) => {
                console.log('Table change detected:', payload.eventType)
                refreshTables().catch(() => undefined)
              }
            )
            .subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                subscriptionsActive++
                checkRealtimeStatus()
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                subscriptionsFailed++
                console.warn('Tables real-time subscription failed:', status)
                checkRealtimeStatus()
              }
            })

          // Set a timeout to check if real-time is working after 5 seconds
          // If not all subscriptions are active by then, start polling
          realtimeCheckTimeout = setTimeout(() => {
            if (!realtimeWorking && !pollingInterval) {
              console.warn('⚠️ Real-time subscriptions did not activate within timeout, starting polling fallback')
              startPolling()
            }
          }, 5000)

        } catch (realtimeError) {
          console.warn('❌ Real-time subscriptions not available, using polling:', realtimeError)
          if (!pollingInterval) startPolling()
        }

        return () => {
          reservationsChannel?.unsubscribe()
          waitlistChannel?.unsubscribe()
          tablesChannel?.unsubscribe()
          if (realtimeCheckTimeout) {
            clearTimeout(realtimeCheckTimeout)
          }
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        }
      } catch (error) {
        console.error('❌ Error setting up subscriptions:', error)
        // Fall back to polling if everything fails
        if (!pollingInterval) startPolling()
      }
    }

    const cleanup = setupSubscriptions()

    return () => {
      cleanup.then(cleanupFn => cleanupFn?.()).catch(() => undefined)
      if (realtimeCheckTimeout) {
        clearTimeout(realtimeCheckTimeout)
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [refreshReservations, refreshWaitlist, refreshTables])

  const value: GlobalState = { waitlist, allGuests, tables, waitlistPaused, allReservations, loading, error, refreshWaitlist, refreshReservations, refreshTables, refreshAll }
  return <GlobalStateContext.Provider value={value}>{children}</GlobalStateContext.Provider>
}

export function useGlobalState() {
  const ctx = useContext(GlobalStateContext)
  if (!ctx) throw new Error('useGlobalState must be used within GlobalStateProvider')
  return ctx
}


