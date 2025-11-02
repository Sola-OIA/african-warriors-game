import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInAnonymously: () => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  convertGuestToRegistered: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

/**
 * Auth Provider - Single source of truth for authentication
 * Follows Supabase best practices:
 * - ONE onAuthStateChange listener
 * - NO manual getSession() calls (except initial load)
 * - NO timeout patterns
 * - Session stored in context, consumed by components
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[AuthProvider] Initializing auth...')

    // Get initial session ONCE on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] Initial session:', session ? `authenticated (user: ${session.user.id})` : 'no session')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes (sign in, sign out, token refresh)
    // This is the ONLY source of truth for session updates
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthProvider] Auth state changed:', _event, session ? `user: ${session.user.id}` : 'no session')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Empty deps - runs ONCE on mount

  /**
   * Sign in with Google OAuth
   * Redirects to Google, then back to /auth/callback
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('[AuthProvider] Google sign in error:', error)
      throw error
    }
  }

  /**
   * Sign in anonymously as guest
   * Profile will be auto-created by database trigger
   */
  const signInAnonymously = async () => {
    console.log('[AuthProvider] Signing in anonymously...')
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      console.error('[AuthProvider] Anonymous sign in error:', error)
      throw error
    }
    // Profile creation handled by database trigger
    // onAuthStateChange will update state automatically
  }

  /**
   * Sign up with email and password
   * Profile will be auto-created by database trigger
   */
  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('[AuthProvider] Email sign up error:', error)
      throw error
    }
    // Profile creation handled by database trigger
  }

  /**
   * Sign in with email and password
   */
  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[AuthProvider] Email sign in error:', error)
      throw error
    }
  }

  /**
   * Reset password via email
   */
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      console.error('[AuthProvider] Reset password error:', error)
      throw error
    }
  }

  /**
   * Convert guest account to registered account
   * Links Google identity to existing anonymous user
   */
  const convertGuestToRegistered = async () => {
    if (!user?.is_anonymous) {
      throw new Error('User is not a guest')
    }

    // Link Google account to existing anonymous user
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
    })

    if (error) {
      console.error('[AuthProvider] Convert guest error:', error)
      throw error
    }

    // Update profile to mark as registered
    if (user) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_anonymous: false })
        .eq('id', user.id)

      if (updateError) {
        console.error('[AuthProvider] Failed to update profile:', updateError)
        // Don't throw - update is not critical
      }
    }
  }

  /**
   * Sign out current user
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[AuthProvider] Sign out error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signInWithGoogle,
    signInAnonymously,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    signOut,
    convertGuestToRegistered,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
