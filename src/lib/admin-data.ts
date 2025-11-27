import { supabase, type Restaurant, type UserRestaurant } from './supabase'

/**
 * Create default time slots for a restaurant
 * Creates half-hour slots from 6 PM to 10 PM with 6 max reservations per slot for all days of the week
 */
async function createDefaultTimeSlots(restaurantId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  // Generate time slots: 6:00 PM to 10:00 PM in 30-minute intervals
  // That's 6:00-6:30, 6:30-7:00, 7:00-7:30, ..., 9:30-10:00 (8 slots)
  const timeSlots = []
  const startHour = 18 // 6 PM
  const endHour = 22 // 10 PM
  
  // Create slots for all 7 days of the week (0 = Sunday, 6 = Saturday)
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    for (let hour = startHour; hour < endHour; hour++) {
      // Create two slots per hour: :00 and :30
      for (const minute of [0, 30]) {
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
        
        // Calculate end time (30 minutes later)
        let calculatedEndHour = hour
        let calculatedEndMinute = minute + 30
        if (calculatedEndMinute >= 60) {
          calculatedEndHour += 1
          calculatedEndMinute = 0
        }
        
        // Skip if end time exceeds 10 PM (22:00)
        if (calculatedEndHour > endHour || (calculatedEndHour === endHour && calculatedEndMinute > 0)) {
          continue
        }
        
        const endTime = `${String(calculatedEndHour).padStart(2, '0')}:${String(calculatedEndMinute).padStart(2, '0')}:00`
        
        timeSlots.push({
          restaurant_id: restaurantId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          max_reservations: 6,
          is_default: true,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }
  }
  
  // Insert all time slots in a single batch
  if (timeSlots.length > 0) {
    const { error } = await supabase
      .from('time_slots')
      .insert(timeSlots)
    
    if (error) {
      console.error('Error creating default time slots:', error)
      // Don't throw - time slots are optional, restaurant creation should still succeed
    }
  }
}

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
  
  // Create default time slots for the new restaurant
  try {
    await createDefaultTimeSlots(restaurant.id)
  } catch (slotError) {
    console.error('Failed to create default time slots:', slotError)
    // Don't fail restaurant creation if time slots fail
  }
  
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

