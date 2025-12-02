import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, type Restaurant } from './supabase'
import { getRestaurantSlug, isAdminSubdomain } from './subdomain-utils'

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

      // Check if URL has novaref_id in path (e.g., /713df1ae.../dashboard/reservations)
      let novaRefId: string | null = null
      if (typeof window !== 'undefined') {
        const pathParts = window.location.pathname.split('/').filter(Boolean)
        console.log('[Restaurant Context] Path parts:', pathParts)
        // Check if first part looks like a UUID (novaref_id)
        if (pathParts.length > 0 && pathParts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          novaRefId = pathParts[0]
          console.log('[Restaurant Context] Detected novaref_id from path:', novaRefId)
        }
      }

      // If novaref_id in path, load restaurant by novaref_id
      if (novaRefId) {
        console.log('[Restaurant Context] Loading restaurant by novaref_id:', novaRefId)
        if (!supabase) {
          throw new Error('Supabase client not initialized')
        }

        const { data, error: fetchError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('novaref_id', novaRefId)
          .single()

        if (fetchError || !data) {
          console.error('[Restaurant Context] Failed to load restaurant by novaref_id:', fetchError)
          setError(`Restaurant with ID "${novaRefId}" not found.`)
          setRestaurant(null)
          setRestaurantId(null)
          setLoading(false)
          return
        }

        console.log('[Restaurant Context] Successfully loaded restaurant:', data.name)
        setRestaurant(data)
        setRestaurantId(data.id)
        setLoading(false)
        return
      }

      // Admin path doesn't need restaurant context
      if (isAdminSubdomain()) {
        console.log('[Restaurant Context] Admin path detected, no restaurant needed')
        setRestaurant(null)
        setRestaurantId(null)
        setLoading(false)
        return
      }

      const restaurantSlug = getRestaurantSlug()
      console.log('[Restaurant Context] No novaref_id in path, checking restaurant slug:', restaurantSlug)

      // No restaurant slug - could be default or error
      if (!restaurantSlug) {
        // Check if we're on a guest route without restaurant slug
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          // Routes that need a restaurant but don't have slug
          if (path.startsWith('/reserve') || path.startsWith('/payment')) {
            // Try to use default restaurant slug from environment if configured
            const defaultSlug = import.meta.env.VITE_DEFAULT_RESTAURANT_SLUG
            if (!defaultSlug) {
              setError('Restaurant slug is required. Please configure VITE_DEFAULT_RESTAURANT_SLUG or use a restaurant slug in the URL.')
              setRestaurant(null)
              setLoading(false)
              return
            }
            console.log('[Restaurant Context] No slug in guest route, trying default:', defaultSlug)
            
            const { data, error: fetchError } = await supabase
              ?.from('restaurants')
              .select('*')
              .eq('slug', defaultSlug)
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
        }

        // No restaurant needed for this route
        console.log('[Restaurant Context] No restaurant slug, route may not require restaurant')
        setRestaurant(null)
        setRestaurantId(null)
        setLoading(false)
        return
      }

      // Fetch restaurant by slug
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      console.log('[Restaurant Context] Loading restaurant by slug:', restaurantSlug)
      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', restaurantSlug)
        .single()

      if (fetchError || !data) {
        console.error('[Restaurant Context] Failed to load restaurant by slug:', fetchError)
        setError(`Restaurant "${restaurantSlug}" not found.`)
        setRestaurant(null)
        setRestaurantId(null)
        setLoading(false)
        return
      }

      console.log('[Restaurant Context] Successfully loaded restaurant:', data.name)
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

  // Only reload restaurant if path actually changes, not on every focus
  // This prevents unnecessary reloads when switching apps/tabs

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

