import qa03Config from '../config/qa03.json'
import prodConfig from '../config/prod.json'

export interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  openaiApiKey?: string
  apiBaseUrl?: string
  environment: 'qa03' | 'prod' | 'dev'
  unifiedServiceUrl?: string
  smsApiKey?: string
  smsApiBaseUrl?: string
}

/**
 * Gets the current environment from VITE_ENV or defaults to 'dev'
 */
function getEnvironment(): 'qa03' | 'prod' | 'dev' {
  const env = import.meta.env.VITE_ENV as string | undefined
  if (env === 'qa03' || env === 'prod') {
    return env
  }
  return 'dev'
}

/**
 * Loads the configuration for the current environment
 */
export function loadConfig(): AppConfig {
  const env = getEnvironment()
  
  switch (env) {
    case 'qa03':
      return {
        ...qa03Config,
        environment: 'qa03',
        // Allow environment variables to override JSON config
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || qa03Config.supabaseUrl,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || qa03Config.supabaseAnonKey,
        openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || qa03Config.openaiApiKey,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || qa03Config.baseUrl,
        unifiedServiceUrl: import.meta.env.VITE_UNIFIED_SERVICE_URL || qa03Config.unifiedServiceUrl,
        smsApiKey: import.meta.env.VITE_SMS_API_KEY || qa03Config.smsApiKey,
        smsApiBaseUrl: import.meta.env.VITE_SMS_API_BASE_URL || qa03Config.smsApiBaseUrl || qa03Config.baseUrl,
      }
    case 'prod':
      return {
        ...prodConfig,
        environment: 'prod',
        // Allow environment variables to override JSON config
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || prodConfig.supabaseUrl,
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || prodConfig.supabaseAnonKey,
        openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || prodConfig.openaiApiKey,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || prodConfig.baseUrl,
        unifiedServiceUrl: import.meta.env.VITE_UNIFIED_SERVICE_URL || prodConfig.unifiedServiceUrl,
        smsApiKey: import.meta.env.VITE_SMS_API_KEY || prodConfig.smsApiKey,
        smsApiBaseUrl: import.meta.env.VITE_SMS_API_BASE_URL || prodConfig.smsApiBaseUrl || prodConfig.baseUrl,
      }
    default:
      // Development: use environment variables or defaults
      return {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
        supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
        environment: 'dev',
        unifiedServiceUrl: import.meta.env.VITE_UNIFIED_SERVICE_URL || '',
        smsApiKey: import.meta.env.VITE_SMS_API_KEY || '',
        smsApiBaseUrl: import.meta.env.VITE_SMS_API_BASE_URL || '',
      }
  }
}

// Export the loaded config as a singleton
export const config = loadConfig()

