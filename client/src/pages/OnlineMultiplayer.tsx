import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '@/contexts/AuthProvider'
import { characters } from '@/gameData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import PrivateGameLink from '@/components/PrivateGameLink'
import JoinPrivateGame from '@/components/JoinPrivateGame'
import OnlineBattle from '@/components/OnlineBattle'
import Matchmaking from '@/components/Matchmaking'

type GameMode = 'menu' | 'character-select' | 'private-create' | 'private-join' | 'matchmaking' | 'battle'
type OnlineMode = 'private' | 'ranked'

interface OnlineMultiplayerProps {
  joinGameCode?: string
}

export default function OnlineMultiplayer({ joinGameCode }: OnlineMultiplayerProps = {}) {
  const { user, session, loading, signInWithGoogle, signInAnonymously, signUpWithEmail, signInWithEmail, signOut } = useAuth()
  const [, setLocation] = useLocation()
  const [gameMode, setGameMode] = useState<GameMode>('menu')
  const [onlineMode, setOnlineMode] = useState<OnlineMode | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null)
  const [gameId, setGameId] = useState<string | null>(null)
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // If joining via link, skip to character selection
  useEffect(() => {
    if (joinGameCode && user && gameMode === 'menu') {
      setOnlineMode('private')
      setGameMode('character-select')
    }
  }, [joinGameCode, user, gameMode])

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthLoading(true)

    try {
      if (authTab === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        await signUpWithEmail(email, password)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  // Main menu - mode selection
  if (gameMode === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-2 text-white drop-shadow-lg">
            African Warriors
          </h1>
          <p className="text-xl text-center mb-8 text-amber-100">Online Multiplayer</p>

          {!user ? (
            <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Play Online
              </h2>

              {/* Tab Switcher */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setAuthTab('signin')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    authTab === 'signin'
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthTab('signup')}
                  className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                    authTab === 'signup'
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-amber-500"
                  />
                </div>
                {authTab === 'signup' && (
                  <div>
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {authError && (
                  <p className="text-red-300 text-sm text-center">{authError}</p>
                )}

                <Button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  size="lg"
                >
                  {authLoading ? 'Loading...' : authTab === 'signin' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-black/40 text-white/70">OR</span>
                </div>
              </div>

              {/* Social & Guest Options */}
              <div className="space-y-3">
                <Button
                  onClick={signInWithGoogle}
                  className="w-full bg-white hover:bg-gray-100 text-gray-900"
                  size="lg"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </Button>

                <Button
                  onClick={signInAnonymously}
                  variant="outline"
                  className="w-full border-amber-500/50 text-white hover:bg-amber-500/20"
                  size="lg"
                >
                  Continue as Guest
                </Button>
              </div>

              <p className="text-xs text-amber-200/70 mt-4 text-center">
                Guests can only play private games. Sign in for ranked matches and leaderboards.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Choose Game Mode
                  </h2>
                  <button
                    onClick={async () => {
                      await signOut()
                      setGameMode('menu')
                    }}
                    className="text-sm text-amber-200 hover:text-amber-100 underline"
                  >
                    Sign Out
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <button
                    onClick={() => {
                      setOnlineMode('private')
                      setGameMode('character-select')
                    }}
                    className="p-6 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 transition-all transform hover:scale-105"
                  >
                    <h3 className="text-2xl font-bold text-white mb-2">Private Game</h3>
                    <p className="text-blue-100 text-sm mb-4">
                      Create a link to share with friends via WhatsApp, Copy, or QR code
                    </p>
                    <div className="text-xs text-blue-200 space-y-1">
                      <div>✓ Play with friends</div>
                      <div>✓ Share via link/QR</div>
                      <div>✓ No ranking impact</div>
                      <div>✓ Guest-friendly</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      if (user.is_anonymous) {
                        alert('Please sign in with Google to play random matches. Guest accounts can only join private games.')
                        return
                      }
                      setOnlineMode('ranked')
                      setGameMode('character-select')
                    }}
                    className={`p-6 rounded-lg transition-all transform hover:scale-105 ${
                      user.is_anonymous
                        ? 'bg-gray-600/50 cursor-not-allowed'
                        : 'bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700'
                    }`}
                    disabled={user.is_anonymous}
                  >
                    <h3 className="text-2xl font-bold text-white mb-2">Random Match</h3>
                    <p className={`text-sm mb-4 ${user.is_anonymous ? 'text-gray-300' : 'text-red-100'}`}>
                      Battle random opponents online with ELO-based matchmaking
                    </p>
                    <div className={`text-xs space-y-1 ${user.is_anonymous ? 'text-gray-400' : 'text-red-200'}`}>
                      <div>✓ ELO matchmaking</div>
                      <div>✓ Global leaderboard</div>
                      <div>✓ Ranked stats</div>
                      <div>{user.is_anonymous ? '✗ Requires sign-in' : '✓ Competitive play'}</div>
                    </div>
                  </button>
                </div>
              </Card>

              <div className="text-center">
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="border-amber-500/50 text-white hover:bg-amber-500/20"
                >
                  ← Back to Main Menu
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Character selection
  if (gameMode === 'character-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-2 text-white">
            Choose Your Warrior
          </h1>
          <p className="text-center text-amber-100 mb-8">
            {onlineMode === 'private' ? 'Private Game' : 'Ranked Match'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedCharacter(char)}
                className={`relative rounded-lg overflow-hidden transition-all transform hover:scale-105 ${
                  selectedCharacter?.id === char.id
                    ? 'ring-4 ring-yellow-400 shadow-2xl'
                    : 'ring-2 ring-white/20'
                }`}
              >
                <img
                  src={char.image}
                  alt={char.name}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                  style={{ objectPosition: 'center 20%' }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                  <h3 className="font-bold text-white text-lg">{char.name}</h3>
                  <p className="text-xs text-amber-200">{char.country}</p>
                  <div className="flex gap-2 mt-1 text-xs text-white/90">
                    <span>❤️ {char.maxHealth}</span>
                    <span>⚔️ {char.damage}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedCharacter && (
            <Card className="p-6 bg-black/40 backdrop-blur border-amber-500/30 mb-4">
              <h3 className="text-xl font-bold text-white mb-2">
                {selectedCharacter.name} - {selectedCharacter.country}
              </h3>
              <p className="text-amber-100 text-sm mb-3">{selectedCharacter.backstory}</p>
              <div className="flex gap-4 text-sm text-white">
                <div>Health: {selectedCharacter.maxHealth}</div>
                <div>Damage: {selectedCharacter.damage}</div>
                <div>Special: {selectedCharacter.specialAbility}</div>
              </div>
            </Card>
          )}

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => setGameMode('menu')}
              variant="outline"
              className="border-amber-500/50 text-white hover:bg-amber-500/20"
            >
              ← Back
            </Button>
            <Button
              onClick={() => {
                if (!selectedCharacter) {
                  alert('Please select a character first')
                  return
                }
                if (onlineMode === 'private') {
                  // If joining via link, go to join flow, otherwise create new game
                  setGameMode(joinGameCode ? 'private-join' : 'private-create')
                } else {
                  setGameMode('matchmaking')
                }
              }}
              disabled={!selectedCharacter}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
              size="lg"
            >
              Continue →
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Private game creation
  if (gameMode === 'private-create' && selectedCharacter && session) {
    return (
      <PrivateGameLink
        character={selectedCharacter}
        session={session}
        onBack={() => setGameMode('character-select')}
        onGameStart={(id) => {
          setGameId(id)
          setGameMode('battle')
        }}
      />
    )
  }

  // Private game joining
  if (gameMode === 'private-join' && selectedCharacter && session && joinGameCode) {
    return (
      <JoinPrivateGame
        character={selectedCharacter}
        session={session}
        gameCode={joinGameCode}
        onBack={() => setGameMode('character-select')}
        onGameStart={(id) => {
          setGameId(id)
          setGameMode('battle')
        }}
      />
    )
  }

  // Matchmaking
  if (gameMode === 'matchmaking' && selectedCharacter) {
    return (
      <Matchmaking
        character={selectedCharacter}
        onBack={() => setGameMode('character-select')}
        onGameFound={(id) => {
          setGameId(id)
          setGameMode('battle')
        }}
      />
    )
  }

  // Battle
  if (gameMode === 'battle' && gameId && selectedCharacter) {
    return (
      <OnlineBattle
        gameId={gameId}
        myCharacter={selectedCharacter}
        onGameEnd={() => {
          setGameId(null)
          setGameMode('menu')
          setLocation('/online') // Clear URL to prevent rejoining completed game
        }}
      />
    )
  }

  return null
}
