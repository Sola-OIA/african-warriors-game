import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import QRCode from 'qrcode'
import type { Session } from '@supabase/supabase-js'

interface PrivateGameLinkProps {
  character: any
  session: Session
  onBack: () => void
  onGameStart: (gameId: string) => void
}

export default function PrivateGameLink({
  character,
  session,
  onBack,
  onGameStart,
}: PrivateGameLinkProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState<string>('')
  const [shareableUrl, setShareableUrl] = useState<string>('')
  const [whatsappUrl, setWhatsappUrl] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [gameId, setGameId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    createPrivateGame()
  }, [])

  useEffect(() => {
    if (!gameId) return

    // Polling fallback - check every 2 seconds if player 2 joined
    // This ensures Player 1 transitions even if real-time has issues
    const pollInterval = setInterval(async () => {
      try {
        // Check if player 2 joined using Supabase client
        const { data: game } = await supabase
          .from('games')
          .select('status, player2_id')
          .eq('id', gameId)
          .maybeSingle()

        if (game && game.status === 'in_progress' && game.player2_id) {
          console.log('[PrivateGameLink] Polling detected player 2 joined')
          clearInterval(pollInterval)
          onGameStart(gameId)
        }
      } catch (err) {
        console.error('[PrivateGameLink] Polling error:', err)
      }
    }, 2000)

    // Subscribe to game updates to detect when player 2 joins
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload: any) => {
          const game = payload.new
          if (game.status === 'in_progress' && game.player2_id) {
            // Player 2 joined via real-time!
            console.log('[PrivateGameLink] Real-time detected player 2 joined')
            clearInterval(pollInterval)
            onGameStart(gameId)
          }
        }
      )
      .subscribe((status) => {
        console.log('[PrivateGameLink] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[PrivateGameLink] ✅ Subscribed to game updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[PrivateGameLink] ❌ Subscription failed, relying on polling')
        }
      })

    return () => {
      clearInterval(pollInterval)
      channel.unsubscribe()
    }
  }, [gameId, onGameStart])

  const createPrivateGame = async () => {
    try {
      console.log('[PrivateGameLink] Starting game creation...')
      setLoading(true)
      setError(null)

      console.log('[PrivateGameLink] Creating private game...')
      console.log('[PrivateGameLink] Character data:', {
        characterId: character.id,
        maxHealth: character.maxHealth,
        damage: character.damage,
      })

      // Call create-private-game Edge Function (client handles auth automatically)
      const { data: result, error } = await supabase.functions.invoke('create-private-game', {
        body: {
          characterId: character.id,
          maxHealth: character.maxHealth,
          damage: character.damage,
        },
      })

      console.log('[PrivateGameLink] Response data:', result, 'Error:', error)

      if (error) {
        throw new Error(error.message || 'Failed to create game')
      }

      setGameId(result.gameId)
      setGameCode(result.gameCode)
      setShareableUrl(result.shareableUrl)
      setWhatsappUrl(result.whatsappUrl)

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(result.shareableUrl, {
        width: 256,
        margin: 2,
      })
      setQrCodeUrl(qrUrl)

      setLoading(false)
    } catch (err) {
      console.error('Create private game error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create game')
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
          <div className="text-white text-xl text-center">Creating private game...</div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
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
            Waiting for Opponent...
          </h1>

          <div className="mb-6 text-center">
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

          <div className="bg-blue-900/40 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold text-white mb-4 text-center">
              Share Game Link
            </h2>

            <div className="space-y-4">
              {/* Game Code */}
              <div className="text-center">
                <p className="text-amber-200 text-sm mb-2">Game Code:</p>
                <div className="text-4xl font-mono font-bold text-white tracking-widest bg-black/40 py-3 rounded-lg">
                  {gameCode}
                </div>
              </div>

              {/* Copy Link Button */}
              <Button
                onClick={copyToClipboard}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </Button>

              {/* WhatsApp Button */}
              <Button
                onClick={() => window.open(whatsappUrl, '_blank')}
                className="w-full bg-green-500 hover:bg-green-600"
                size="lg"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Share on WhatsApp
              </Button>

              {/* QR Code */}
              {qrCodeUrl && (
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-gray-800 text-center mb-2 font-medium">
                    Scan QR Code
                  </p>
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="mx-auto"
                    width={256}
                    height={256}
                  />
                </div>
              )}

              {/* URL Display */}
              <div className="bg-black/40 p-3 rounded-lg">
                <p className="text-amber-200 text-xs text-center break-all">
                  {shareableUrl}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse w-3 h-3 bg-yellow-400 rounded-full"></div>
              <p className="text-amber-100">Waiting for opponent to join...</p>
            </div>

            <Button onClick={onBack} variant="outline" className="border-amber-500/50 text-white hover:bg-amber-500/20">
              Cancel Game
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
