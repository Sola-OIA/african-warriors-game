import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface MatchmakingProps {
  character: any
  onBack: () => void
  onGameFound: (gameId: string) => void
}

export default function Matchmaking({
  character,
  onBack,
  onGameFound,
}: MatchmakingProps) {
  const [searching, setSearching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [eloRange, setEloRange] = useState<{ min: number; max: number } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const pollIntervalRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    startMatchmaking()
    return () => {
      cancelMatchmaking()
    }
  }, [])

  useEffect(() => {
    if (searching) {
      // Start timer
      timerRef.current = window.setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)

      // Poll for match every 3 seconds
      pollIntervalRef.current = window.setInterval(() => {
        checkForMatch()
      }, 3000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [searching])

  const startMatchmaking = async () => {
    try {
      setSearching(true)
      setError(null)

      // Call matchmaking Edge Function (client handles auth automatically)
      const { data: result, error } = await supabase.functions.invoke('matchmaking', {
        body: {
          characterId: character.id,
          maxHealth: character.maxHealth,
          damage: character.damage,
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to start matchmaking')
      }

      if (result.matched) {
        // Immediately found a match
        onGameFound(result.gameId)
      } else {
        // Added to queue, start polling
        setEloRange(result.eloRange)
      }
    } catch (err) {
      console.error('Matchmaking error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start matchmaking')
      setSearching(false)
    }
  }

  const checkForMatch = async () => {
    try {
      // Check if a game was created with us as a player using Supabase client
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: games } = await supabase
        .from('games')
        .select('id')
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)

      if (games && games.length > 0) {
        // Found a match!
        setSearching(false)
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
        if (timerRef.current) clearInterval(timerRef.current)
        onGameFound(games[0].id)
      }
    } catch (err) {
      console.error('Check match error:', err)
    }
  }

  const cancelMatchmaking = async () => {
    try {
      setSearching(false)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (timerRef.current) clearInterval(timerRef.current)

      // Call matchmaking cancel (client handles auth automatically)
      await supabase.functions.invoke('matchmaking', {
        body: {
          action: 'cancel',
        },
      })

      onBack()
    } catch (err) {
      console.error('Cancel matchmaking error:', err)
      onBack()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30 max-w-md">
          <div className="text-red-300 text-xl text-center mb-4">{error}</div>
          <Button onClick={onBack} className="w-full">
            Back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Finding Opponent...
          </h1>

          <div className="mb-8 text-center">
            <div className="inline-block relative">
              <img
                src={character.image}
                alt={character.name}
                className="w-32 h-32 object-cover rounded-lg"
                style={{ objectPosition: 'center 20%' }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 rounded-b-lg">
                <p className="text-white font-bold">{character.name}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-6 rounded-lg mb-6">
            {/* Searching Animation */}
            <div className="flex justify-center items-center mb-6">
              <div className="relative">
                <div className="w-24 h-24 border-4 border-amber-500/30 rounded-full"></div>
                <div className="w-24 h-24 border-4 border-t-amber-500 rounded-full animate-spin absolute top-0"></div>
              </div>
            </div>

            {/* Status */}
            <div className="text-center space-y-3">
              <p className="text-2xl font-bold text-white">
                Searching for opponent...
              </p>
              <p className="text-amber-200">
                Time: {formatTime(elapsedTime)}
              </p>

              {eloRange && (
                <div className="bg-black/30 p-4 rounded-lg">
                  <p className="text-sm text-amber-200 mb-1">
                    Matchmaking Range
                  </p>
                  <p className="text-white font-mono">
                    ELO {eloRange.min} - {eloRange.max}
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm text-amber-100">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Searching worldwide</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-blue-400 rounded-full animation-delay-150"></div>
                  <span>Matching skill levels</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-pulse w-2 h-2 bg-purple-400 rounded-full animation-delay-300"></div>
                  <span>Finding the perfect match</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={cancelMatchmaking}
              variant="outline"
              className="border-red-500/50 text-white hover:bg-red-500/20"
              size="lg"
            >
              Cancel Search
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-amber-200/70">
            <p>Tip: Can't find a match? Try inviting friends with a private game instead!</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
