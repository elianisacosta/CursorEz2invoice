import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client with fallback empty strings to prevent crashes
// The client will still work but API calls will fail gracefully
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Log warning in development if env vars are missing
if (process.env.NODE_ENV === 'development' && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    '⚠️ Missing Supabase environment variables!\n' +
    'Please ensure your .env.local file contains:\n' +
    'NEXT_PUBLIC_SUPABASE_URL=...\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=...\n' +
    'Then restart your dev server.'
  )
}

// Database types
export interface ContactMessage {
  id?: string
  first_name: string
  last_name: string
  email: string
  company?: string
  subject: string
  message: string
  status?: string
  created_at?: string
}

export interface User {
  id?: string
  email: string
  first_name?: string
  last_name?: string
  company?: string
  plan_type?: string
  created_at?: string
  updated_at?: string
}

export interface TruckShop {
  id?: string
  user_id?: string
  shop_name: string
  address?: string
  phone?: string
  service_bays?: number
  plan_type?: string
  created_at?: string
}
