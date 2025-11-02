import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { generateSalt, hashAction } from '@/lib/crypto'
import type { Database } from '@/lib/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Game = Database['public']['Tables']['games']['Row']
type GameRound = Database['public']['Tables']['game_rounds']['Row']

interface UseGameReturn {
  game: Game | null
  currentRound: GameRound | null
  loading: boolean
  error: string | null
  commitAction: (action: string, roundNumber: number) => Promise<void>
  isMyTurn: () => boolean
  amIPlayer1: () => boolean
}

/**
 * Game hook with real-time updates
 * Manages online game state, real-time subscriptions, and commit-reveal pattern
 *
 * @param gameId - UUID of the game to subscribe to
 */
export function useGame(gameId: string | null): UseGameReturn {
  const [game, setGame] = useState<Game | null>(null)
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial game state
  useEffect(() => {
    if (!gameId) {
      setLoading(false)
      return
    }

    let gameChannel: RealtimeChannel | null = null
    let roundChannel: RealtimeChannel | null = null

    async function fetchGame() {
      try {
        console.log('[useGame] Fetching game:', gameId)

        // Fetch game data using Supabase client (handles auth automatically)
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single()

        if (gameError || !gameData) {
          throw new Error(gameError?.message || 'Game not found')
        }

        console.log('[useGame] Game fetched:', gameData)
        setGame(gameData)

        // Fetch current round data with retry logic
        const fetchInitialRoundWithRetry = async (attempts = 0): Promise<void> => {
          const { data: roundData, error: roundError } = await supabase
            .from('game_rounds')
            .select('*')
            .eq('game_id', gameId)
            .eq('round_number', gameData.current_round)
            .maybeSingle()

          if (roundError) {
            throw new Error(roundError.message)
          }

          console.log('[useGame] Round fetched:', roundData, `(attempt ${attempts + 1})`)

          if (roundData) {
            setCurrentRound(roundData)
            setLoading(false)
          } else if (attempts < 5) {
            // Round not found - might be timing issue, retry after delay
            console.log(`[useGame] Round not found, retrying in 500ms... (${attempts + 1}/5)`)
            setTimeout(() => fetchInitialRoundWithRetry(attempts + 1), 500)
          } else {
            console.error('[useGame] Round still not found after 5 attempts')
            setError('Round data not found. Please refresh or try rejoining.')
            setLoading(false)
          }
        }

        await fetchInitialRoundWithRetry()
      } catch (err) {
        console.error('[useGame] Error fetching game:', err)
        setError(err instanceof Error ? err.message : 'Failed to load game')
        setLoading(false)
      }
    }

    fetchGame()

    // Subscribe to game updates
    gameChannel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          console.log('[useGame] ✅ Game real-time update received:', payload)
          const updatedGame = payload.new as Game
          setGame(updatedGame)

          // If round changed, fetch new round data with retry logic
          if (updatedGame.current_round !== game?.current_round) {
            console.log('[useGame] Round changed, fetching new round:', updatedGame.current_round)

            // Retry function to handle race condition where round might not exist yet
            const fetchNewRoundWithRetry = async (attempts = 0): Promise<void> => {
              try {
                const { data: newRound, error: fetchError } = await supabase
                  .from('game_rounds')
                  .select('*')
                  .eq('game_id', gameId)
                  .eq('round_number', updatedGame.current_round)
                  .maybeSingle()

                if (fetchError) {
                  console.error('[useGame] Error fetching new round:', fetchError)
                  return
                }

                if (newRound) {
                  console.log('[useGame] ✅ New round data fetched:', newRound)
                  setCurrentRound(newRound)
                } else if (attempts < 5) {
                  // Round doesn't exist yet, retry after delay
                  console.log(`[useGame] Round ${updatedGame.current_round} not found, retrying (${attempts + 1}/5)...`)
                  setTimeout(() => fetchNewRoundWithRetry(attempts + 1), 500)
                } else {
                  console.error('[useGame] Failed to fetch new round after 5 attempts')
                }
              } catch (err) {
                console.error('[useGame] Failed to fetch new round on game update:', err)
              }
            }

            fetchNewRoundWithRetry()
          }
        }
      )
      .subscribe((status) => {
        console.log('[useGame] Game subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[useGame] ✅ Successfully subscribed to game updates')
          setError(null) // Clear error on successful reconnect
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useGame] ❌ Game subscription error - check if real-time is enabled')
          setError('Real-time connection failed. Trying to reconnect...')

          // Auto-reconnect after 5 seconds
          setTimeout(() => {
            console.log('[useGame] Attempting to reconnect...')
            gameChannel?.unsubscribe()
            fetchGame() // Retry fetching and subscribing
          }, 5000)
        }
      })

    // Subscribe to round updates
    roundChannel = supabase
      .channel(`rounds:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('[useGame] ✅ Round real-time update received:', payload)
          setCurrentRound(payload.new as GameRound)
        }
      )
      .subscribe((status) => {
        console.log('[useGame] Round subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[useGame] ✅ Successfully subscribed to round updates')
          setError(null) // Clear error on successful reconnect
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useGame] ❌ Round subscription error - check if real-time is enabled')
          setError('Real-time connection failed. Trying to reconnect...')

          // Auto-reconnect after 5 seconds
          setTimeout(() => {
            console.log('[useGame] Attempting to reconnect...')
            roundChannel?.unsubscribe()
            fetchGame() // Retry fetching and subscribing
          }, 5000)
        }
      })

    // Cleanup subscriptions
    return () => {
      if (gameChannel) gameChannel.unsubscribe()
      if (roundChannel) roundChannel.unsubscribe()
    }
  }, [gameId])

  /**
   * Commit an action using the commit-reveal pattern
   * Uses Edge Function to store hash in database, keeps salt locally
   */
  const commitAction = useCallback(
    async (action: string, roundNumber: number) => {
      if (!gameId || !game) {
        throw new Error('No active game')
      }

      try {
        console.log(`[useGame] commitAction called with:`, { action, roundNumber, gameId })

        // Generate commitment
        const salt = generateSalt()
        const commitment = hashAction(action, salt)

        // Store salt and action locally for later reveal
        localStorage.setItem(`action_${gameId}_${roundNumber}`, action)
        localStorage.setItem(`salt_${gameId}_${roundNumber}`, salt)

        console.log(`[useGame] Stored in localStorage:`, {
          key: `action_${gameId}_${roundNumber}`,
          action,
          salt: salt.substring(0, 8) + '...'
        })

        // Call commit-action Edge Function (client handles auth automatically)
        const { data, error } = await supabase.functions.invoke('commit-action', {
          body: {
            gameId,
            roundNumber,
            actionCommit: commitment,
            salt,
          },
        })

        if (error) {
          throw new Error(error.message || 'Failed to commit action')
        }

        console.log('[useGame] Action committed successfully')
      } catch (err) {
        console.error('Error committing action:', err)
        setError(err instanceof Error ? err.message : 'Failed to commit action')
        throw err
      }
    },
    [gameId, game]
  )

  /**
   * Check if it's the current user's turn to act
   */
  const isMyTurn = useCallback(() => {
    if (!game || !currentRound) return false

    // In simultaneous selection, both players always have a "turn"
    // until they've committed their action
    return true
  }, [game, currentRound])

  /**
   * Check if current user is player 1
   */
  const amIPlayer1 = useCallback(async () => {
    if (!game) return false

    const { data: { user } } = await supabase.auth.getUser()
    return user?.id === game.player1_id
  }, [game])

  return {
    game,
    currentRound,
    loading,
    error,
    commitAction,
    isMyTurn,
    amIPlayer1,
  }
}

