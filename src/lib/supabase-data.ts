import { supabase, type Restaurant, type Table, type WaitlistEntry, type Reservation, type TimeSlot, type MessageHistory } from './supabase'
import { getSubdomain } from './subdomain-utils'
import { config } from './config'

/**
 * Gets the current restaurant ID from subdomain
 * This replaces the old hardcoded restaurant lookup
 */
export async function getRestaurantId(): Promise<string> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  const subdomain = getSubdomain()
  
  if (!subdomain) {
    // Fallback to default for development or when no subdomain
    const defaultSubdomain = import.meta.env.VITE_DEFAULT_SUBDOMAIN || 'default'
    const { data, error } = await supabase
      .from('restaurants')
      .select('id')
      .eq('subdomain', defaultSubdomain)
      .single()

    if (error) throw new Error(`Failed to get restaurant: ${error.message}`)
    return data.id
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('id')
    .eq('subdomain', subdomain)
    .single()
  
  if (error) throw new Error(`Failed to get restaurant for subdomain "${subdomain}": ${error.message}`)
  return data.id
}


export async function getRestaurantRefId(): Promise<string> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  const subdomain = getSubdomain()
  if (!subdomain) {
    // Fallback to default for development or when no subdomain
    const defaultSubdomain = import.meta.env.VITE_DEFAULT_SUBDOMAIN || 'default'
    const { data, error } = await supabase
      .from('restaurants')
      .select('novaref_id')
      .eq('subdomain', defaultSubdomain)
      .single()

    if (error) throw new Error(`Failed to get restaurant: ${error.message}`)
    return data.novaref_id
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('novaref_id')
    .eq('subdomain', subdomain)
    .single()
  
  if (error) throw new Error(`Failed to get restaurant for subdomain "${subdomain}": ${error.message}`)
  return data.novaref_id
}


/**
 * Gets the current restaurant by subdomain
 */
export async function getRestaurant(): Promise<Restaurant> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  const subdomain = getSubdomain()
  
  if (!subdomain) {
    // Fallback to default for development
    const defaultSubdomain = import.meta.env.VITE_DEFAULT_SUBDOMAIN || 'default'
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('subdomain', defaultSubdomain)
      .single()
    if (error) throw new Error(`Failed to get restaurant: ${error.message}`)
    return data
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('subdomain', subdomain)
    .single()
  
  if (error) throw new Error(`Failed to get restaurant for subdomain "${subdomain}": ${error.message}`)
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

export async function getTables(): Promise<Table[]> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  // If unifiedServiceUrl is configured, use the unified service API
  if (config.unifiedServiceUrl) {
    try {
      const restaurantRefId = await getRestaurantRefId()
      
      if (!restaurantRefId) {
        throw new Error(`Restaurant NovaRef ID is not set`)
      }
      
      const url = `${config.unifiedServiceUrl}restaurant-reservations/${restaurantRefId}/table-status`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch table status: ${response.statusText}`)
      }
      
      const data = 
      await response.json()

      const transformedTables: Table[] = []

      if (Array.isArray(data)) {
        data.forEach((area: any) => {
          if (area.tables && Array.isArray(area.tables)) {
            area.tables.forEach((table: any) => {
              transformedTables.push({
                id: table.refId,
                restaurant_id: table.restaurantRefId,
                name: table.tableName,
                seats: table.seatingCapacity,
                status:  table.isTableOccupied ? 'occupied' : 'available',
                location: area.areaName || undefined, // Use area name as location
                created_at: new Date().toISOString(), // Default since API doesn't provide this
              })
            })
          }
        })
      }
      return transformedTables || []
    } catch (error: any) {
      console.error('Error fetching from unified service:', error)
      throw new Error(`Failed to get tables from unified service: ${error.message}`)
    }
  }
  
  // Fallback to Supabase if unifiedServiceUrl is not configured
  const restaurantId = await getRestaurantId()
  const { data, error } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('name')
  if (error) throw new Error(`Failed to get tables: ${error.message}`)
  return data || []
}

export async function freeTable(tableId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  // Set table directly to available (no cleaning status)
  const { error } = await supabase.from('tables').update({ status: 'available' }).eq('id', tableId)
  if (error) throw new Error(`Failed to free table: ${error.message}`)
}

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
  return data || []
}

export async function addReservation(data: {
  name: string
  phone: string
  email: string
  party_size: number
  date_time: string
  status: 'confirmed' | 'notified' | 'seated' | 'cancelled' | 'completed'
  special_requests?: string
  special_occasion_type?: string
  slot_start_time?: string
  slot_end_time?: string
}): Promise<Reservation> {
  if (!supabase) throw new Error('Supabase client not initialized')
  
  const restaurant = await getRestaurant()
  const restaurantRefId = restaurant.novaref_id
  const restaurantId = await getRestaurantId()
  
  // If unifiedServiceUrl is configured, use the unified service API
  if (config.unifiedServiceUrl && restaurantRefId) {
    try {
      // Split name into firstName and lastName
      const nameParts = data.name.trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ' '
      
      let mobileNumber = data.phone.trim()
      let countryCode = '+91' // Default country code
      
      
      
      const url = `${config.unifiedServiceUrl}restaurant-reservations/${restaurantRefId}/customer`
      
      const requestBody = {
        mobileNumber: mobileNumber,
        firstName: firstName,
        lastName: lastName,
        countryCode: countryCode,
        restaurantRefId: restaurantRefId,
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText)
        throw new Error(`Failed to add reservation: ${response.status} ${errorText}`)
      }
      
      const apiData = await response.json()
      
      // Transform the API response to match Reservation format
      // The API might return the created reservation or just a success response
      // Adjust this mapping based on the actual API response structure
      const reservation: Reservation = {
        id: apiData.refId || apiData.id || crypto.randomUUID(),
        restaurant_id: restaurantId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        party_size: data.party_size,
        date_time: data.date_time,
        status: data.status,
        special_requests: data.special_requests,
        special_occasion_type: data.special_occasion_type,
        slot_start_time: data.slot_start_time,
        slot_end_time: data.slot_end_time,
        created_at: apiData.createdDate || apiData.created_at || new Date().toISOString(),
        novacustomer_id: apiData.refId || "",
      }
      
      // Save to Supabase for local tracking
      await supabase
        .from('reservations')
        .insert({
          restaurant_id: restaurantId,
          novacustomer_id: apiData.refId || "",
          ...data,
        })
        .select()
        .single()
    
      return reservation
    } catch (error: any) {
      console.error('Error adding reservation via unified service:', error)
      throw new Error(`Failed to add reservation: ${error.message}`)
    }
  }
  
  // Fallback to Supabase if unifiedServiceUrl is not configured
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

export async function updateReservationStatus(id: string, status: Reservation['status']): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  const { error } = await supabase.from('reservations').update({ status }).eq('id', id)
  if (error) throw new Error(`Failed to update reservation status: ${error.message}`)
}

export async function seatReservation(id: string, tableId: string, reservation: Reservation): Promise<void> {
  if (!supabase) throw new Error('Supabase client not initialized')
  

  const restaurant = await getRestaurant()
  const restaurantRefId = restaurant.novaref_id
  const {novacustomer_id : customerRefId, date_time: reservationDate,  party_size: seatsRequired} = reservation
 
  if (config.unifiedServiceUrl && restaurantRefId) {
    try {
      const url = `${config.unifiedServiceUrl}restaurant-reservations/${restaurantRefId}/table/${tableId}/book-table`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerRefId,
          reservationDate,
          seatsRequired,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to book table: ${response.statusText} - ${errorText}`)
      }
      
    
      const { error } = await supabase.from('reservations').update({ status: 'seated', table_id: tableId }).eq('id', id)
      if (error) throw new Error(`Failed to seat reservation: ${error.message}`)
      await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId)
    } catch (error: any) {
      console.error('Error booking table via unified service:', error)
      throw new Error(`Failed to book table: ${error.message}`)
    }
  }
  
  // Fallback to Supabase if unifiedServiceUrl is not configured
  // const { error } = await supabase.from('reservations').update({ status: 'seated', table_id: tableId }).eq('id', id)
  // if (error) throw new Error(`Failed to seat reservation: ${error.message}`)
  // await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId)
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

/**
 * Send SMS message using the SMS API
 */
export async function sendSMS(data: {mobileNumber: string, countryCode: string, message: string}): Promise<{ success: boolean; message?: string; error?: string }> {
  const { mobileNumber, countryCode, message } = data
  if (!mobileNumber || !countryCode || !message) {
    throw new Error('Mobile number, country code, and message are required')
  }
  try {
    if (!config.smsApiKey || !config.smsApiBaseUrl) {
      throw new Error('SMS API configuration is missing. Please configure smsApiKey and smsApiBaseUrl.')
    }

    const url = `${config.smsApiBaseUrl}/mycustomers/customers/send-custom-sms`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': config.smsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mobileNumber: mobileNumber,
        countryCode: countryCode,
        message: message,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText)
      throw new Error(`Failed to send SMS: ${response.status} ${errorText}`)
    }

    const data = await response.json().catch(() => ({}))
    
    return {
      success: true,
      message: data.message,
    }
  } catch (error: any) {
    console.error('Error sending SMS:', error)
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    }
  }
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
