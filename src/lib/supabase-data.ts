import { supabase, type Restaurant, type Table, type WaitlistEntry, type Reservation, type TimeSlot, type MessageHistory } from './supabase'
import { getRestaurantSlug } from './subdomain-utils'

/**
 * Gets the current restaurant ID from path-based routing (slug or novaref_id)
 * Uses the same logic as restaurant-context.tsx
 */
export async function getRestaurantId(): Promise<string> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  // Check if URL has novaref_id in path (e.g., /713df1ae.../dashboard/reservations)
  let novaRefId: string | null = null
  if (typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/').filter(Boolean)
    // Check if first part looks like a UUID (novaref_id)
    if (pathParts.length > 0 && pathParts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      novaRefId = pathParts[0]
    }
  }

  // If novaref_id in path, load restaurant by novaref_id
  if (novaRefId) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('novaref_id', novaRefId)
      .single()

    if (error || !data) {
      throw new Error(`Restaurant with ID "${novaRefId}" not found.`)
    }
    return data.id
  }

  const restaurantSlug = getRestaurantSlug()
  
  if (!restaurantSlug) {
    // Fallback to default for development or when no slug
    const defaultSlug = import.meta.env.VITE_DEFAULT_RESTAURANT_SLUG || import.meta.env.VITE_DEFAULT_SUBDOMAIN || 'default'
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', defaultSlug)
      .single()
    if (error) throw new Error(`Failed to get restaurant: ${error.message}`)
    return data.id
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', restaurantSlug)
    .single()
  
  if (error) throw new Error(`Failed to get restaurant for slug "${restaurantSlug}": ${error.message}`)
  return data.id
}

/**
 * Gets the current restaurant by path-based routing (slug or novaref_id)
 */
export async function getRestaurant(): Promise<Restaurant> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  // Check if URL has novaref_id in path (e.g., /713df1ae.../dashboard/reservations)
  let novaRefId: string | null = null
  if (typeof window !== 'undefined') {
    const pathParts = window.location.pathname.split('/').filter(Boolean)
    // Check if first part looks like a UUID (novaref_id)
    if (pathParts.length > 0 && pathParts[0].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      novaRefId = pathParts[0]
    }
  }

  // If novaref_id in path, load restaurant by novaref_id
  if (novaRefId) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('novaref_id', novaRefId)
      .single()

    if (error || !data) {
      throw new Error(`Restaurant with ID "${novaRefId}" not found.`)
    }
    return data
  }

  const restaurantSlug = getRestaurantSlug()
  
  if (!restaurantSlug) {
    // Fallback to default for development
    const defaultSlug = import.meta.env.VITE_DEFAULT_RESTAURANT_SLUG || import.meta.env.VITE_DEFAULT_SUBDOMAIN || 'default'
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', defaultSlug)
      .single()
    if (error) throw new Error(`Failed to get restaurant: ${error.message}`)
    return data
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', restaurantSlug)
    .single()
  
  if (error) throw new Error(`Failed to get restaurant for slug "${restaurantSlug}": ${error.message}`)
  return data
}

export async function updateRestaurantSettings(settings: Record<string, any>): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  
  // Deep merge function for nested objects
  const deepMerge = (target: any, source: any): any => {
    const output = { ...target }
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key]) && !Array.isArray(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] })
          } else {
            output[key] = deepMerge(target[key], source[key])
          }
        } else {
          Object.assign(output, { [key]: source[key] })
        }
      })
    }
    return output
  }
  
  const isObject = (item: any): boolean => {
    return item && typeof item === 'object' && !Array.isArray(item)
  }
  
  // Get current settings to merge properly
  const { data: currentRestaurant } = await supabase
    .from('restaurants')
    .select('settings')
    .eq('id', restaurantId)
    .single()
  
  // Deep merge with existing settings to preserve other data
  const currentSettings = currentRestaurant?.settings || {}
  const mergedSettings = deepMerge(currentSettings, settings)
  
  console.log('Updating settings:', { currentSettings, newSettings: settings, mergedSettings })
  
  const { error } = await supabase
    .from('restaurants')
    .update({ 
      settings: mergedSettings, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', restaurantId)
  
  if (error) {
    console.error('Error updating settings:', error)
    throw new Error(`Failed to update restaurant settings: ${error.message}`)
  }
}

export async function isWaitlistPaused(): Promise<boolean> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurant = await getRestaurant()
  return restaurant.settings?.waitlist_paused || false
}

// Note: getTables and freeTable are no longer needed as we use external tables from Nova API
// Table status is managed by Nova's system via getNovaTableStatus() in nova-api.ts

export async function getWaitlist(): Promise<WaitlistEntry[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('status', ['waiting', 'notified'])
    .order('check_in_time', { ascending: true })
  if (error) throw new Error(`Failed to get waitlist: ${error.message}`)
  return data || []
}

export async function getFullWaitlist(): Promise<WaitlistEntry[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('check_in_time', { ascending: true })
  if (error) throw new Error(`Failed to get full waitlist: ${error.message}`)
  return data || []
}

export async function toggleWaitlistStatus(): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurant = await getRestaurant()
  const currentPaused = restaurant.settings?.waitlist_paused || false
  await updateRestaurantSettings({ ...restaurant.settings, waitlist_paused: !currentPaused })
}

export async function addToWaitlist(data: { name: string; phone: string; email?: string; party_size: number }): Promise<WaitlistEntry> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .insert({
      restaurant_id: restaurantId,
      ...data,
      status: 'waiting',
      check_in_time: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to add to waitlist: ${error.message}`)
  return entry
}

export async function getAllReservations(): Promise<Reservation[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('date_time', { ascending: false })
  if (error) throw new Error(`Failed to get reservations: ${error.message}`)
  // Parse payment_amount from string to number if needed
  return (data || []).map(r => ({
    ...r,
    payment_amount: r.payment_amount ? parseFloat(r.payment_amount.toString()) : undefined
  }))
}

export async function addReservation(data: {
  name: string
  phone: string
  email: string
  party_size: number
  date_time: string
  status: 'draft' | 'confirmed' | 'notified' | 'seated' | 'cancelled' | 'completed'
  special_requests?: string
  special_occasion_type?: string
  slot_start_time?: string
  slot_end_time?: string
  novacustomer_id?: string
}): Promise<Reservation> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      restaurant_id: restaurantId,
      ...data,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to add reservation: ${error.message}`)
  return reservation
}

export async function getReservation(id: string): Promise<Reservation | null> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(`Failed to get reservation: ${error.message}`)
  if (!data) return null
  // Parse payment_amount from string to number if needed
  return {
    ...data,
    payment_amount: data.payment_amount ? parseFloat(data.payment_amount.toString()) : undefined
  }
}

export async function updateReservationStatus(id: string, status: Reservation['status']): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('reservations').update({ status }).eq('id', id)
  if (error) throw new Error(`Failed to update reservation status: ${error.message}`)
}

export async function updateReservationNovaCustomerId(id: string, novacustomer_id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('reservations').update({ novacustomer_id }).eq('id', id)
  if (error) throw new Error(`Failed to update reservation Nova customer ID: ${error.message}`)
}

export async function updateReservationPaymentAmount(id: string, payment_amount: number): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('reservations').update({ payment_amount }).eq('id', id)
  if (error) throw new Error(`Failed to update reservation payment amount: ${error.message}`)
}

export async function updateReservation(id: string, data: {
  name?: string
  phone?: string
  email?: string
  party_size?: number
  date_time?: string
  special_requests?: string
  special_occasion_type?: string
  slot_start_time?: string
  slot_end_time?: string
  novacustomer_id?: string
}): Promise<Reservation> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { data: reservation, error } = await supabase
    .from('reservations')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update reservation: ${error.message}`)
  return reservation
}

export async function seatReservation(id: string, tableId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  // Update reservation status to 'seated' and store external table refId
  // The table booking is already handled by Nova API via bookNovaTable
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'seated', table_id: tableId })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to seat reservation: ${error.message}`)
}

export async function createTimeSlot(data: {
  day_of_week: number
  start_time: string
  end_time: string
  max_reservations: number
  is_default?: boolean
  specific_date?: string
  is_active?: boolean
}): Promise<TimeSlot> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  const { data: slot, error } = await supabase
    .from('time_slots')
    .insert({
      restaurant_id: restaurantId,
      is_default: true,
      is_active: true,
      ...data,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create time slot: ${error.message}`)
  return slot
}

export async function updateTimeSlot(id: string, data: Partial<TimeSlot>): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('time_slots').update(data).eq('id', id)
  if (error) throw new Error(`Failed to update time slot: ${error.message}`)
}

export async function deleteTimeSlot(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('time_slots').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete time slot: ${error.message}`)
}

export async function assignTable(guestId: string, tableId: string): Promise<{ success: boolean; message?: string }> {
  if (!supabase) throw new Error('Supabase client not initialized')
  try {
    await supabase.from('waitlist_entries').update({ status: 'seated', table_id: tableId }).eq('id', guestId)
    await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId)
    return { success: true }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'Failed to assign table' }
  }
}

export async function updateWaitlistStatus(id: string, status: WaitlistEntry['status']): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('waitlist_entries').update({ status }).eq('id', id)
  if (error) throw new Error(`Failed to update waitlist status: ${error.message}`)
}

export async function getTimeSlots(dayOfWeek?: number, specificDate?: string): Promise<TimeSlot[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  let query = supabase
    .from('time_slots')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
  if (specificDate) query = query.eq('specific_date', specificDate)
  else if (dayOfWeek !== undefined) query = query.eq('day_of_week', dayOfWeek)
  else query = query.is('specific_date', null)
  const { data, error } = await query.order('start_time')
  if (error) throw new Error(`Failed to get time slots: ${error.message}`)
  return data || []
}

export async function getAvailableSlotCount(startTime: string, endTime: string, date: string): Promise<number> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  const { data: slots } = await supabase
    .from('time_slots')
    .select('max_reservations, start_time, end_time')
    .eq('restaurant_id', restaurantId)
    .eq('start_time', startTime)
    .eq('end_time', endTime)
    .eq('is_active', true)
    .limit(1)
  if (!slots || slots.length === 0) return 0
  const slot = slots[0]
  const { count } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'confirmed')
    .eq('slot_start_time', startTime)
    .eq('slot_end_time', endTime)
    .gte('date_time', `${date}T00:00:00`)
    .lte('date_time', `${date}T23:59:59`)
  return Math.max(0, slot.max_reservations - (count || 0))
}

/**
 * Save a message to message history
 */
export async function saveMessageHistory(data: {
  reservation_id: string
  phone_number: string
  message: string
  status?: 'sent' | 'failed' | 'pending'
}): Promise<MessageHistory> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const restaurantId = await getRestaurantId()
  
  const { data: messageHistory, error } = await supabase
    .from('message_history')
    .insert({
      reservation_id: data.reservation_id,
      restaurant_id: restaurantId,
      phone_number: data.phone_number,
      message: data.message,
      status: data.status || 'sent',
      sent_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to save message history: ${error.message}`)
  return messageHistory
}

/**
 * Get message history for a reservation
 */
export async function getMessageHistory(reservationId: string): Promise<MessageHistory[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  const { data, error } = await supabase
    .from('message_history')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('sent_at', { ascending: false })
  
  if (error) throw new Error(`Failed to get message history: ${error.message}`)
  return data || []
}

export async function getAvailableSlots(date: Date, _partySize: number): Promise<string[]> {
  try {
    const dayOfWeek = date.getDay()
    const timeSlots = await getTimeSlots(dayOfWeek, undefined)
    
    if (timeSlots.length === 0) {
      return []
    }

    const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const availableSlots: string[] = []
    
    for (const slot of timeSlots) {
      try {
        const availableCount = await getAvailableSlotCount(slot.start_time, slot.end_time, dateString)
        
        if (availableCount > 0) {
          // Convert time to display format (h:mm A)
          const [hours, minutes] = slot.start_time.split(':')
          const hour = parseInt(hours)
          const ampm = hour >= 12 ? 'PM' : 'AM'
          const displayHour = hour % 12 || 12
          availableSlots.push(`${displayHour}:${minutes} ${ampm}`)
        }
      } catch (error) {
        console.error(`Error checking slot ${slot.start_time}-${slot.end_time}:`, error)
      }
    }

    return availableSlots
  } catch (error) {
    console.error('Error in getAvailableSlots:', error)
    return []
  }
}
