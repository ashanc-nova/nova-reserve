import { getRestaurant } from './supabase-data'

const NOVA_API_BASE_URL = import.meta.env.VITE_NOVA_API_BASE_URL
if (!NOVA_API_BASE_URL) {
  throw new Error('VITE_NOVA_API_BASE_URL is not configured. Please set it in your environment variables.')
}

interface NovaCustomerResponse {
  mobileNumber: string
  firstName: string
  lastName: string
  countryCode: string
  refId: string
}

interface CreateCustomerParams {
  restaurantRefId: string
  name: string
  mobileNumber: string
  countryCode: string
}

/**
 * Parses phone number to extract country code and mobile number
 * Handles formats like "+11234567890", "1234567890", "(123) 456-7890", etc.
 */
function parsePhoneNumber(phone: string): { countryCode: string; mobileNumber: string } {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // If it starts with +, try to extract country code
  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.slice(1)
    
    // US/Canada: +1XXXXXXXXXX (12 digits total with +)
    if (cleaned.startsWith('+1') && cleaned.length === 12) {
      return {
        countryCode: '+1',
        mobileNumber: cleaned.slice(2)
      }
    }
    // India: +91XXXXXXXXXX (13 digits total with +)
    else if (cleaned.startsWith('+91') && cleaned.length === 13) {
      return {
        countryCode: '+91',
        mobileNumber: cleaned.slice(3)
      }
    }
    // Try common 2-digit country codes (UK, France, Germany, etc.)
    else if (withoutPlus.length >= 11) {
      // Try 2-digit country code (e.g., +44, +33, +49)
      const twoDigitCode = withoutPlus.slice(0, 2)
      const remaining = withoutPlus.slice(2)
      if (remaining.length >= 9) {
        return {
          countryCode: '+' + twoDigitCode,
          mobileNumber: remaining
        }
      }
    }
    // Try 3-digit country code
    else if (withoutPlus.length >= 12) {
      const threeDigitCode = withoutPlus.slice(0, 3)
      const remaining = withoutPlus.slice(3)
      if (remaining.length >= 9) {
        return {
          countryCode: '+' + threeDigitCode,
          mobileNumber: remaining
        }
      }
    }
  }
  
  // No + prefix - try to infer
  // 10 digits: assume US/Canada
  if (cleaned.length === 10) {
    return {
      countryCode: '+1',
      mobileNumber: cleaned
    }
  }
  // 11 digits starting with 1: US/Canada
  else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return {
      countryCode: '+1',
      mobileNumber: cleaned.slice(1)
    }
  }
  // 12 digits: might be India without +
  else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return {
      countryCode: '+91',
      mobileNumber: cleaned.slice(2)
    }
  }
  
  // Fallback: use +1 as default and use the cleaned number
  return {
    countryCode: '+1',
    mobileNumber: cleaned.replace(/^1/, '') || cleaned
  }
}

/**
 * Creates or gets a customer from Nova API
 * Returns the customer refId
 */
export async function createNovaCustomer(
  name: string,
  phone: string
): Promise<string> {
  try {
    // Get restaurant to get novaref_id
    const restaurant = await getRestaurant()
    
    if (!restaurant.novaref_id) {
      throw new Error('Restaurant Nova Ref ID is not configured. Please set it in restaurant settings.')
    }
    
    // Parse phone number
    const { countryCode, mobileNumber } = parsePhoneNumber(phone)
    
    // Prepare request body
    const requestBody: CreateCustomerParams = {
      restaurantRefId: restaurant.novaref_id,
      name: name,
      mobileNumber: mobileNumber,
      countryCode: countryCode
    }
    
    // Call Nova API
    const url = `${NOVA_API_BASE_URL}/unified/internal-service/api/restaurant-reservations/${restaurant.novaref_id}/customer`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nova API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data: NovaCustomerResponse = await response.json()
    
    if (!data.refId) {
      throw new Error('Nova API did not return a customer refId')
    }
    
    return data.refId
  } catch (error: any) {
    console.error('Error creating Nova customer:', error)
    throw new Error(`Failed to create Nova customer: ${error.message || 'Unknown error'}`)
  }
}

export interface NovaTable {
  refId: string
  tableName: string
  isTableOccupied: boolean
  displayOrder: number
  seatingCapacity: number
  restaurantRefId: string
}

export interface NovaArea {
  refId: string
  areaName: string
  restaurantRefId: string
  isPublished: boolean
  displayOrder: number
  tables: NovaTable[]
}

/**
 * Fetches table status from Nova API
 * Returns available tables (not occupied) grouped by area
 */
export async function getNovaTableStatus(): Promise<NovaArea[]> {
  try {
    // Get restaurant to get novaref_id
    const restaurant = await getRestaurant()
    
    if (!restaurant.novaref_id) {
      throw new Error('Restaurant Nova Ref ID is not configured. Please set it in restaurant settings.')
    }
    
    // Call Nova API
    const url = `${NOVA_API_BASE_URL}/unified/internal-service/api/restaurant-reservations/${restaurant.novaref_id}/table-status`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nova API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data: NovaArea[] = await response.json()
    
    return data
  } catch (error: any) {
    console.error('Error fetching Nova table status:', error)
    throw new Error(`Failed to fetch table status: ${error.message || 'Unknown error'}`)
  }
}

interface BookTableParams {
  tableRefId: string
  customerRefId: string
  reservationDate: string // ISO 8601 format with timezone
  seatsRequired: number
}

interface BookTableResponse {
  tableRefId: string
  reservationDetails: {
    restaurantRefId: string
    tableRefId: string
    customerId: string
    customerInfo: {
      name: string
      countryCode: string
      mobileNumber: string
    }
    seatsRequired: number
    reservationDate: string
    status: string
    refId: string
  }
}

interface NovaError {
  errorCode: string
  title: string
  message: string
  property: string
  posMessage: string | null
}

/**
 * Books a table for a customer in Nova API
 * Returns the booking response
 * Throws an error if the table is already occupied
 */
export async function bookNovaTable(params: BookTableParams): Promise<BookTableResponse> {
  try {
    // Get restaurant to get novaref_id
    const restaurant = await getRestaurant()
    
    if (!restaurant.novaref_id) {
      throw new Error('Restaurant Nova Ref ID is not configured. Please set it in restaurant settings.')
    }
    
    if (!params.customerRefId) {
      throw new Error('Customer Nova Ref ID is required to book a table.')
    }
    
    // Call Nova API
    const url = `${NOVA_API_BASE_URL}/unified/internal-service/api/restaurant-reservations/${restaurant.novaref_id}/table/${params.tableRefId}/book-table`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerRefId: params.customerRefId,
        reservationDate: params.reservationDate,
        seatsRequired: params.seatsRequired
      })
    })
    
    if (!response.ok) {
      // Check if it's a table occupied error
      const errorData = await response.json()
      
      // Check if it's an array of errors (Nova error format)
      if (Array.isArray(errorData)) {
        const tableOccupiedError = errorData.find((err: NovaError) => err.errorCode === 'TableAlreadyOccupied')
        if (tableOccupiedError) {
          throw new Error('TABLE_ALREADY_OCCUPIED')
        }
      }
      
      const errorText = typeof errorData === 'string' ? errorData : JSON.stringify(errorData)
      throw new Error(`Nova API error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const data: BookTableResponse = await response.json()
    
    return data
  } catch (error: any) {
    console.error('Error booking Nova table:', error)
    // Re-throw the special error code as-is
    if (error.message === 'TABLE_ALREADY_OCCUPIED') {
      throw error
    }
    throw new Error(`Failed to book table: ${error.message || 'Unknown error'}`)
  }
}

interface SendSMSParams {
  mobileNumber: string
  countryCode: string
  message: string
}

interface SendSMSResponse {
  message: string
  data: {
    message: string
  }
  success: boolean
}

/**
 * Sends a custom SMS message to a customer
 */
export async function sendCustomSMS(params: SendSMSParams): Promise<SendSMSResponse> {
  const API_KEY = import.meta.env.VITE_NOVA_API_KEY
  if (!API_KEY) {
    throw new Error('Nova API key is not configured. Please set VITE_NOVA_API_KEY in your environment variables.')
  }

  const SMS_API_URL = `${NOVA_API_BASE_URL}/mycustomers/customers/send-custom-sms`

  try {
    const response = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        mobileNumber: params.mobileNumber,
        countryCode: params.countryCode,
        message: params.message,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SMS API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data: SendSMSResponse = await response.json()
    return data
  } catch (error: any) {
    throw new Error(`Failed to send SMS: ${error.message || 'Unknown error'}`)
  }
}

// Payment API interfaces
interface MerchantConfigResponse {
  config: {
    locationIds: string[]
  }
  _id: string
  refId: string
  gatewayId: string
  merchantId: string
  additionalInfo: string
  credentials: string
  businessRefId: string
  businessType: string
  status: string
  createdDate: string
  __v: number
}

interface CreateCheckoutParams {
  amount: string // in cents
  currency: string
  metadata: {
    orderRefId: string
    applicationName: string
  }
  amount_details: {
    tips: string
    surcharge: string
  }
  successUrl: string
  failureUrl: string
  wallets_only: boolean
}

interface CreateCheckoutResponse {
  url: string
  response: {
    merchant_id: string
    amount: string
    currency: string
    metadata: {
      orderRefId: string
      applicationName: string
    }
    success_url: string
    cancel_url: string
    status: string
    provider: string
    account_id: string
    amount_details: {
      tips: string
      surcharge: string
    }
    wallets_only: boolean
    payment_mode: string
    _id: string
    id: string
    createdAt: string
    updatedAt: string
    __v: number
  }
}

/**
 * Get merchant configuration for payment gateway
 */
export async function getMerchantConfig(novarefId: string): Promise<MerchantConfigResponse> {
  const url = `${NOVA_API_BASE_URL}/unified/payments/${novarefId}/stripe/merchant`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Merchant config API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data: MerchantConfigResponse = await response.json()
    return data
  } catch (error: any) {
    throw new Error(`Failed to get merchant config: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Create payment checkout session
 */
export async function createCheckoutSession(
  gatewayId: string,
  merchantId: string,
  params: CreateCheckoutParams
): Promise<CreateCheckoutResponse> {
  // Determine endpoint based on gateway
  let endpoint = ''
  if (gatewayId.toLowerCase() === 'stripe') {
    endpoint = `${NOVA_API_BASE_URL}/payments/stripe/checkout/V3`
  } else if (gatewayId.toLowerCase() === 'payrix' || gatewayId.toLowerCase() === 'worldpay') {
    endpoint = `${NOVA_API_BASE_URL}/payments/payrix/checkout/V3`
  } else {
    throw new Error(`Unsupported payment gateway: ${gatewayId}`)
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'merchant_id': merchantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Checkout API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data: CreateCheckoutResponse = await response.json()
    return data
  } catch (error: any) {
    throw new Error(`Failed to create checkout session: ${error.message || 'Unknown error'}`)
  }
}

