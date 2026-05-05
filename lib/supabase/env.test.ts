import { describe, it, expect, beforeEach } from 'vitest'
import { isAuthRouteProtectionEnabled, isSupabaseConfigured } from './env'

describe('Supabase Env Logic', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key'
    delete process.env.NEXT_PUBLIC_REQUIRE_AUTH
    delete process.env.VERCEL_ENV
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

  it('should allow disabling auth on non-production when flag is false', () => {
    process.env.NEXT_PUBLIC_REQUIRE_AUTH = 'false'
    expect(isAuthRouteProtectionEnabled()).toBe(false)
  })

  it('should keep auth on Vercel Production even if NEXT_PUBLIC_REQUIRE_AUTH=false', () => {
    process.env.VERCEL_ENV = 'production'
    process.env.NEXT_PUBLIC_REQUIRE_AUTH = 'false'
    expect(isAuthRouteProtectionEnabled()).toBe(true)
  })
})
