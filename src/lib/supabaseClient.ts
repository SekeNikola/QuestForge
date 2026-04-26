import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient {
  if (
    client &&
    (client as unknown as { supabaseUrl: string }).supabaseUrl === url
  ) {
    return client
  }
  client = createClient(url, anonKey)
  return client
}

export function clearSupabaseClient() {
  client = null
}
