import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isAuthRouteProtectionEnabled, isSupabaseConfigured } from './env'

describe('Supabase Env Logic', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key'
  })

  it('should enable auth protection when supabase is configured', () => {
    expect(isSupabaseConfigured()).toBe(true)
    expect(isAuthRouteProtectionEnabled()).toBe(true)
  })

  it('should disable auth protection when supabase is not configured', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
    expect(isSupabaseConfigured()).toBe(false)
    expect(isAuthRouteProtectionEnabled()).toBe(false)
  })
})
