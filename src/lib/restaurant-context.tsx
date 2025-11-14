import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, type Restaurant } from './supabase'
import { getSubdomain, isAdminSubdomain } from './subdomain-utils'

interface RestaurantContextType {
  restaurant: Restaurant | null
  restaurantId: string | null
  loading: boolean
  error: string | null
  refreshRestaurant: () => Promise<void>
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined)

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRestaurant = async () => {
    try {
      setLoading(true)
      setError(null)

      const subdomain = getSubdomain()

      // Admin subdomain doesn't need restaurant context
      if (isAdminSubdomain()) {
        setRestaurant(null)
        setRestaurantId(null)
        setLoading(false)
        return
      }

      // No subdomain - could be default or error
      // For admin panel or when accessing without subdomain, allow it
      if (!subdomain) {
        // Check if we're on admin route - don't need restaurant
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          if (path.startsWith('/admin')) {
            setRestaurant(null)
            setRestaurantId(null)
            setLoading(false)
            return
          }
        }

        // For development, you might want to use a default
        // In production, this should probably show an error
        const defaultSubdomain = import.meta.env.VITE_DEFAULT_SUBDOMAIN || 'default'
        const { data, error: fetchError } = await supabase
          ?.from('restaurants')
          .select('*')
          .eq('subdomain', defaultSubdomain)
          .single() || { data: null, error: new Error('Supabase not initialized') }

        if (fetchError || !data) {
          setError('Restaurant not found. Please check your URL.')
          setRestaurant(null)
          setRestaurantId(null)
          setLoading(false)
          return
        }

        setRestaurant(data)
        setRestaurantId(data.id)
        setLoading(false)
        return
      }

      // Fetch restaurant by subdomain
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('subdomain', subdomain)
        .single()

      if (fetchError || !data) {
        setError(`Restaurant with subdomain "${subdomain}" not found.`)
        setRestaurant(null)
        setRestaurantId(null)
        setLoading(false)
        return
      }

      setRestaurant(data)
      setRestaurantId(data.id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load restaurant'
      setError(errorMessage)
      setRestaurant(null)
      setRestaurantId(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRestaurant()
  }, [])

  // Reload restaurant when subdomain might change (e.g., navigation)
  useEffect(() => {
    const handleFocus = () => {
      // Reload if subdomain might have changed
      loadRestaurant()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  return (
    <RestaurantContext.Provider
      value={{
        restaurant,
        restaurantId,
        loading,
        error,
        refreshRestaurant: loadRestaurant,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  const context = useContext(RestaurantContext)
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider')
  }
  return context
}

