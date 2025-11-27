import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Reservation, WaitlistEntry } from './supabase'
import { getAllReservations, getFullWaitlist, getWaitlist, isWaitlistPaused, getRestaurant, getRestaurantId } from './supabase-data'
import { setRestaurantTimezone } from './timezone-utils'
import { supabase } from './supabase'

interface GlobalState {
  waitlist: WaitlistEntry[]
  allGuests: WaitlistEntry[]
  waitlistPaused: boolean
  allReservations: Reservation[]
  loading: { waitlist: boolean; reservations: boolean }
  error: string | null
  refreshWaitlist: () => Promise<void>
  refreshReservations: () => Promise<void>
  refreshAll: () => Promise<void>
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined)

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [allGuests, setAllGuests] = useState<WaitlistEntry[]>([])
  const [waitlistPaused, setWaitlistPaused] = useState(false)
  const [allReservations, setAllReservations] = useState<Reservation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState({ waitlist: false, reservations: false })

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

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshWaitlist(), refreshReservations()])
  }, [refreshWaitlist, refreshReservations])

  useEffect(() => { 
    refreshAll().catch(() => undefined)
    // Load timezone setting
    getRestaurant().then(restaurant => {
      const timezone = restaurant.settings?.manager_settings?.timezone || 'America/Los_Angeles'
      setRestaurantTimezone(timezone)
    }).catch(() => undefined)
  }, [])

  // Set up Supabase real-time subscriptions for automatic updates
  useEffect(() => {
    if (!supabase) return

    let reservationsChannel: ReturnType<typeof supabase.channel> | null = null
    let waitlistChannel: ReturnType<typeof supabase.channel> | null = null

    const setupSubscriptions = async () => {
      try {
        const restaurantId = await getRestaurantId()

        // Subscribe to reservations changes
        reservationsChannel = supabase
          .channel(`reservations:${restaurantId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'reservations',
            },
            (payload) => {
              console.log('✅ New reservation detected (INSERT)')
              const record = payload.new as any
              if (record && record.restaurant_id === restaurantId) {
                refreshReservations().catch(() => undefined)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'reservations',
            },
            (payload) => {
              console.log('✅ Reservation updated (UPDATE)')
              const record = payload.new as any
              if (record && record.restaurant_id === restaurantId) {
                refreshReservations().catch(() => undefined)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'reservations',
            },
            (payload) => {
              console.log('✅ Reservation deleted (DELETE)')
              const record = payload.old as any
              if (record && record.restaurant_id === restaurantId) {
                refreshReservations().catch(() => undefined)
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time active - new reservations will appear automatically')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Real-time CHANNEL_ERROR:', err)
              console.log('📋 Run FIX_REALTIME.sql in Supabase SQL Editor')
            } else if (status === 'TIMED_OUT') {
              console.error('❌ Real-time TIMED_OUT')
            } else if (status === 'CLOSED') {
              console.error('❌ Real-time CLOSED')
            }
          })

        // Subscribe to waitlist changes
        waitlistChannel = supabase
          .channel(`waitlist:${restaurantId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'waitlist_entries',
            },
            (payload) => {
              console.log('✅ Waitlist entry added (INSERT)')
              const record = payload.new as any
              if (record && record.restaurant_id === restaurantId) {
                refreshWaitlist().catch(() => undefined)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'waitlist_entries',
            },
            (payload) => {
              console.log('✅ Waitlist entry updated (UPDATE)')
              const record = payload.new as any
              if (record && record.restaurant_id === restaurantId) {
                refreshWaitlist().catch(() => undefined)
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'waitlist_entries',
            },
            (payload) => {
              console.log('✅ Waitlist entry deleted (DELETE)')
              const record = payload.old as any
              if (record && record.restaurant_id === restaurantId) {
                refreshWaitlist().catch(() => undefined)
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Waitlist real-time active')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Waitlist CHANNEL_ERROR:', err)
            } else if (status === 'TIMED_OUT') {
              console.error('❌ Waitlist TIMED_OUT')
            } else if (status === 'CLOSED') {
              console.error('❌ Waitlist CLOSED')
            }
          })

      } catch (error) {
        console.error('❌ Error setting up real-time:', error)
      }
    }

    setupSubscriptions()

    return () => {
      reservationsChannel?.unsubscribe()
      waitlistChannel?.unsubscribe()
    }
  }, [refreshReservations, refreshWaitlist])

  const value: GlobalState = { waitlist, allGuests, waitlistPaused, allReservations, loading, error, refreshWaitlist, refreshReservations, refreshAll }
  return <GlobalStateContext.Provider value={value}>{children}</GlobalStateContext.Provider>
}

export function useGlobalState() {
  const ctx = useContext(GlobalStateContext)
  if (!ctx) throw new Error('useGlobalState must be used within GlobalStateProvider')
  return ctx
}


