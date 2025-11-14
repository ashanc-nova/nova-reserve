import { supabase, type Restaurant, type UserRestaurant } from './supabase'

/**
 * Admin functions for restaurant management
 * These should be protected by admin role checks
 */

/**
 * Get all restaurants (admin only)
 */
export async function getAllRestaurants(): Promise<Restaurant[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to get restaurants: ${error.message}`)
  return data || []
}

/**
 * Get restaurant by ID
 */
export async function getRestaurantById(id: string): Promise<Restaurant> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(`Failed to get restaurant: ${error.message}`)
  return data
}

/**
 * Create a new restaurant
 */
export async function createRestaurant(data: {
  name: string
  subdomain: string
  slug?: string
  description?: string
  address?: string
  phone?: string
  email?: string
  owner_id?: string
  novaref_id?: string
  settings?: Record<string, any>
}): Promise<Restaurant> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  // Normalize subdomain
  const normalizedSubdomain = data.subdomain.toLowerCase().trim()
  
  // Default settings with KPI visibility turned off
  const defaultSettings = {
    manager_settings: {
      show_avg_party_size: false,
      show_peak_hour: false,
      show_cancellation_rate: false,
      show_this_week: false,
      timezone: 'America/Los_Angeles'
    },
    reservation_settings: {
      cutoff_time: '21:00',
      auto_confirm: true,
      lead_time_hours: 2,
      max_advance_days: 60,
      min_advance_hours: 24,
      special_occasions: [],
      allow_special_notes: false
    }
  }
  
  // Merge provided settings with defaults (provided settings take precedence)
  const finalSettings = {
    ...defaultSettings,
    ...data.settings,
    manager_settings: {
      ...defaultSettings.manager_settings,
      ...(data.settings?.manager_settings || {})
    },
    reservation_settings: {
      ...defaultSettings.reservation_settings,
      ...(data.settings?.reservation_settings || {})
    }
  }
  
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .insert({
      name: data.name,
      subdomain: normalizedSubdomain,
      slug: data.slug || normalizedSubdomain,
      description: data.description,
      address: data.address,
      phone: data.phone,
      email: data.email,
      owner_id: data.owner_id,
      novaref_id: data.novaref_id,
      settings: finalSettings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create restaurant: ${error.message}`)
  return restaurant
}

/**
 * Update restaurant
 */
export async function updateRestaurant(
  id: string,
  updates: Partial<Omit<Restaurant, 'id' | 'created_at'>>
): Promise<Restaurant> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  // Normalize subdomain if provided
  if (updates.subdomain) {
    updates.subdomain = updates.subdomain.toLowerCase().trim()
  }
  
  const { data, error } = await supabase
    .from('restaurants')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update restaurant: ${error.message}`)
  return data
}

/**
 * Delete restaurant
 */
export async function deleteRestaurant(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('restaurants').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete restaurant: ${error.message}`)
}

/**
 * Get user's restaurant associations
 */
export async function getUserRestaurants(userId: string): Promise<UserRestaurant[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('user_restaurants')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to get user restaurants: ${error.message}`)
  return data || []
}

/**
 * Get restaurant's user associations
 */
export async function getRestaurantUsers(restaurantId: string): Promise<UserRestaurant[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('user_restaurants')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to get restaurant users: ${error.message}`)
  return data || []
}

/**
 * Add user to restaurant
 */
export async function addUserToRestaurant(
  userId: string,
  restaurantId: string,
  role: 'owner' | 'manager' | 'staff' = 'manager'
): Promise<UserRestaurant> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('user_restaurants')
    .insert({
      user_id: userId,
      restaurant_id: restaurantId,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to add user to restaurant: ${error.message}`)
  return data
}

/**
 * Update user's role in restaurant
 */
export async function updateUserRestaurantRole(
  userId: string,
  restaurantId: string,
  role: 'owner' | 'manager' | 'staff'
): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase
    .from('user_restaurants')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
  if (error) throw new Error(`Failed to update user role: ${error.message}`)
}

/**
 * Remove user from restaurant
 */
export async function removeUserFromRestaurant(userId: string, restaurantId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase
    .from('user_restaurants')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
  if (error) throw new Error(`Failed to remove user from restaurant: ${error.message}`)
}

