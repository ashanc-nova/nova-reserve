import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export interface Restaurant {
  id: string
  name: string
  slug: string
  subdomain?: string
  description?: string
  address?: string
  phone?: string
  email?: string
  owner_id?: string
  novaref_id?: string
  settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserRestaurant {
  id: string
  user_id: string
  restaurant_id: string
  role: 'owner' | 'manager' | 'staff'
  created_at: string
  updated_at: string
}

export interface Table {
  id: string
  restaurant_id: string
  name: string
  seats: number
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance'
  location?: string
  created_at: string
}

export interface WaitlistEntry {
  id: string
  restaurant_id: string
  name: string
  party_size: number
  phone: string
  email?: string
  check_in_time: string
  quoted_wait_time?: string
  status: 'waiting' | 'notified' | 'seated' | 'cancelled'
  table_id?: string
  estimated_seating_time?: string
  notes?: string
  created_at: string
}

export interface Reservation {
  id: string
  restaurant_id: string
  name: string
  phone: string
  email: string
  party_size: number
  date_time: string
  status: 'draft' | 'confirmed' | 'notified' | 'seated' | 'cancelled' | 'completed'
  table_id?: string
  special_requests?: string
  special_occasion_type?: string
  slot_start_time?: string
  slot_end_time?: string
  novacustomer_id?: string
  payment_amount?: number
  created_at: string
}

export interface TimeSlot {
  id: string
  restaurant_id: string
  day_of_week: number
  start_time: string
  end_time: string
  max_reservations: number
  is_default: boolean
  specific_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MessageHistory {
  id: string
  reservation_id: string
  restaurant_id: string
  phone_number: string
  message: string
  status: 'sent' | 'failed' | 'pending'
  sent_at: string
  created_at: string
}


