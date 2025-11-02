import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Session } from '@supabase/supabase-js'

interface JoinPrivateGameProps {
  character: any
  session: Session
  gameCode: string
  onBack: () => void
  onGameStart: (gameId: string) => void
}

export default function JoinPrivateGame({
  character,
  session,
  gameCode,
  onBack,
  onGameStart,
}: JoinPrivateGameProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwnGameError, setIsOwnGameError] = useState(false)

  useEffect(() => {
    joinGame()
  }, [])

  const joinGame = async () => {
    try {
      console.log('[JoinPrivateGame] Joining game:', gameCode)
      setLoading(true)
      setError(null)

      // Call join-private-game Edge Function (client handles auth automatically)
      const { data: result, error } = await supabase.functions.invoke('join-private-game', {
        body: {
          gameCode,
          characterId: character.id,
          maxHealth: character.maxHealth,
          damage: character.damage,
        },
      })

      console.log('[JoinPrivateGame] Response data:', result, 'Error:', error)

      if (error) {
        const errorMessage = error.message || 'Failed to join game'
        // Check if this is the "own game" error
        if (errorMessage.toLowerCase().includes('cannot join your own game')) {
          setIsOwnGameError(true)
        }
        throw new Error(errorMessage)
      }

      // Game joined successfully, start battle
      console.log('[JoinPrivateGame] Successfully joined, starting battle with gameId:', result.gameId)
      onGameStart(result.gameId)
    } catch (err) {
      console.error('Join private game error:', err)
      setError(err instanceof Error ? err.message : 'Failed to join game')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
          <div className="text-white text-xl text-center">Joining game...</div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30 max-w-lg">
          <div className="text-red-300 text-xl text-center mb-4">{error}</div>

          {isOwnGameError && (
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-200 text-sm mb-3">
                You're already signed in as the player who created this game. To test joining:
              </p>
              <ul className="text-yellow-100 text-xs space-y-2 list-disc list-inside">
                <li>Open the link in an <strong>incognito/private window</strong>, or</li>
                <li>Open the link in a <strong>different browser</strong>, or</li>
                <li><strong>Sign out</strong> and create a new guest account</li>
              </ul>
              <p className="text-yellow-200 text-sm mt-3">
                In production, you would share this link with another player on a different device.
              </p>
            </div>
          )}

          <Button onClick={onBack} className="w-full">
            Back
          </Button>
        </Card>
      </div>
    )
  }

  return null
}
