import { format, formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { isToday, isTomorrow } from 'date-fns'

let restaurantTimezone = 'America/Los_Angeles'

export function setRestaurantTimezone(timezone: string) {
  restaurantTimezone = timezone
}

export function getRestaurantTimezone() {
  return restaurantTimezone
}

export function formatDateInTimezone(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(dateObj, restaurantTimezone, formatStr)
}

export function formatTimeInTimezone(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(dateObj, restaurantTimezone, 'p')
}

export function formatDateWithTimezone(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const zonedDate = toZonedTime(dateObj, restaurantTimezone)
  
  if (isToday(zonedDate)) return 'Today'
  if (isTomorrow(zonedDate)) return 'Tomorrow'
  return formatInTimeZone(dateObj, restaurantTimezone, 'MMM d, yyyy')
}

export function getZonedDate(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return toZonedTime(dateObj, restaurantTimezone)
}

