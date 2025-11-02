import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useGame } from '@/hooks/useGame'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Activity, Sword, Shield, Zap, Heart } from 'lucide-react'
import type { Action } from '@/lib/gameLogic'
import { characters } from '@/gameData'

interface OnlineBattleProps {
  gameId: string
  myCharacter: any
  onGameEnd: () => void
}

type BattlePhase = 'selecting' | 'committed' | 'revealing' | 'results' | 'round-end' | 'game-over'

export default function OnlineBattle({
  gameId,
  myCharacter,
  onGameEnd,
}: OnlineBattleProps) {
  const { game, currentRound, loading, error, commitAction, amIPlayer1 } = useGame(gameId)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [phase, setPhase] = useState<BattlePhase>('selecting')
  const [timeLeft, setTimeLeft] = useState(30)
  const [opponentCharacter, setOpponentCharacter] = useState<any>(null)
  const [battleLog, setBattleLog] = useState<string[]>([])
  const timerRef = useRef<number | null>(null)
  const [isPlayer1, setIsPlayer1] = useState(false)
  const [loadingTooLong, setLoadingTooLong] = useState(false)
  const hasRevealed = useRef(false)
  const hasCalculated = useRef(false)
  const hasContinued = useRef(false)
  const [waitingForOpponent, setWaitingForOpponent] = useState(false)
  const lastProcessedRound = useRef<number>(0)
  const [debouncedRound, setDebouncedRound] = useState(currentRound)

  // Debounce currentRound updates to prevent race conditions
  // When real-time updates come rapidly, wait for them to settle before processing
  // 75ms chosen as balance between responsiveness and race condition prevention
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedRound(currentRound)
    }, 75) // Reduced from 100ms - monitor for race conditions

    return () => clearTimeout(timeout)
  }, [currentRound])

  // Determine if we're player 1
  useEffect(() => {
    const checkPlayer = async () => {
      const result = await amIPlayer1()
      setIsPlayer1(result)
    }
    checkPlayer()
  }, [amIPlayer1])

  // Track if loading is taking too long (>5 seconds)
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoadingTooLong(true)
      }, 5000)
      return () => clearTimeout(timeout)
    } else {
      setLoadingTooLong(false)
    }
  }, [loading])

  // Fetch opponent character data
  useEffect(() => {
    if (!game) return

    const opponentCharacterId = isPlayer1
      ? game.player2_character_id
      : game.player1_character_id

    if (opponentCharacterId) {
      const character = characters.find((c) => c.id === opponentCharacterId)
      if (character) {
        console.log('[OnlineBattle] Opponent character loaded:', character.name)
        setOpponentCharacter(character)
      }
    }
  }, [game, isPlayer1])

  // Timeout recovery: If stuck in committing/revealing for >10s, auto-reset
  useEffect(() => {
    if (phase === 'committing' || phase === 'revealing') {
      const timeout = setTimeout(() => {
        console.error('[OnlineBattle] Phase stuck for 10s, resetting to selecting')
        setPhase('selecting')
        setSelectedAction(null)
        setTimeLeft(30)
        hasRevealed.current = false
        hasCalculated.current = false
        setBattleLog((prev) => [...prev, '⚠️ Connection timeout. Please select action again.'])
      }, 30000) // 30 second timeout (matches turn timer)

      return () => clearTimeout(timeout)
    }
  }, [phase])

  // Timer countdown
  useEffect(() => {
    // Only start timer when we have game data loaded
    if (phase === 'selecting' && !selectedAction && currentRound) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up - auto-select heal
            handleActionSelect('heal')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, selectedAction, currentRound])

  // Helper to add log messages
  const addLog = useCallback((message: string) => {
    setBattleLog((prev) => [...prev, message])
  }, [])

  // Watch for game completion via real-time updates
  useEffect(() => {
    if (game?.status === 'completed' && phase !== 'game-over') {
      console.log('[OnlineBattle] Game completed detected via real-time, transitioning to game-over')
      addLog('Game completed!')
      setPhase('game-over')
      setWaitingForOpponent(false)
    }
  }, [game?.status, phase, addLog])

  // Reveal action after both players commit
  const revealAction = useCallback(async () => {
    try {
      if (!currentRound) return

      const action = localStorage.getItem(
        `action_${gameId}_${currentRound.round_number}`
      )
      const salt = localStorage.getItem(`salt_${gameId}_${currentRound.round_number}`)

      console.log(`[OnlineBattle] Revealing action from localStorage:`, { action, salt: salt?.substring(0, 8) + '...', roundNumber: currentRound.round_number })

      if (!action || !salt) {
        console.error('Missing action or salt for reveal')
        return
      }

      // Call reveal-action Edge Function (client handles auth automatically)
      const { error } = await supabase.functions.invoke('reveal-action', {
        body: {
          gameId,
          roundNumber: currentRound.round_number,
          action,
        },
      })

      if (error) {
        console.error('Reveal error:', error)
      } else {
        console.log(`[OnlineBattle] Action revealed successfully: ${action}`)
        // Note: localStorage will be cleared after calculateResults completes
      }
    } catch (err) {
      console.error('Reveal action error:', err)
    }
  }, [currentRound, gameId])

  // Calculate battle results after both players reveal
  const calculateResults = useCallback(async () => {
    try {
      if (!debouncedRound) return

      // Call calculate-results Edge Function (client handles auth automatically)
      const { data: result, error } = await supabase.functions.invoke('calculate-results', {
        body: {
          gameId,
          roundNumber: debouncedRound.round_number,
        },
      })

      if (error) {
        console.error('Calculate results error:', error)
        addLog('Error calculating results. Retrying...')

        // Reset state to allow retry
        setTimeout(() => {
          setPhase('selecting')
          setSelectedAction(null)
          setTimeLeft(30)
          hasRevealed.current = false
          hasCalculated.current = false
        }, 2000)
        return
      }

      // Show battle results
      const myAction = isPlayer1 ? debouncedRound.player1_action : debouncedRound.player2_action
      const opponentAction = isPlayer1 ? debouncedRound.player2_action : debouncedRound.player1_action

      addLog(`You used ${myAction}!`)
      addLog(`Opponent used ${opponentAction}!`)

      if (result.battleResult) {
        const myDamage = isPlayer1 ? result.battleResult.player1Damage : result.battleResult.player2Damage
        const opponentDamage = isPlayer1 ? result.battleResult.player2Damage : result.battleResult.player1Damage
        const myHeal = isPlayer1 ? result.battleResult.player1Heal : result.battleResult.player2Heal

        if (myDamage > 0) addLog(`You took ${myDamage} damage!`)
        if (opponentDamage > 0) addLog(`Dealt ${opponentDamage} damage!`)
        if (myHeal > 0) addLog(`Healed ${myHeal} HP!`)
      }

      setPhase('results')
      // Display results for 1.5s before next action selection
      // Gives players time to read battle log and see health changes
      // Reduced from 3000ms (50% faster) based on user feedback about lag
      setTimeout(() => {
        if (result.roundEnded) {
          setPhase('round-end')
          // Clear localStorage for completed round
          localStorage.removeItem(`action_${gameId}_${debouncedRound.round_number}`)
          localStorage.removeItem(`salt_${gameId}_${debouncedRound.round_number}`)
        } else {
          // Continue round, reset for next action
          setPhase('selecting')
          setSelectedAction(null)
          setTimeLeft(30)
          hasRevealed.current = false
          hasCalculated.current = false
          // Clear localStorage for next turn
          localStorage.removeItem(`action_${gameId}_${debouncedRound.round_number}`)
          localStorage.removeItem(`salt_${gameId}_${debouncedRound.round_number}`)
        }
      }, 1500)
    } catch (err) {
      console.error('Calculate results error:', err)
      addLog('Error calculating results. Retrying...')

      // Reset state to allow retry
      setTimeout(() => {
        setPhase('selecting')
        setSelectedAction(null)
        setTimeLeft(30)
        hasRevealed.current = false
        hasCalculated.current = false
      }, 2000)
    }
  }, [debouncedRound, gameId, isPlayer1, addLog])

  // Monitor round state changes (DEBOUNCED to prevent race conditions)
  useEffect(() => {
    if (!debouncedRound) {
      // Reset guards when round changes
      hasRevealed.current = false
      hasCalculated.current = false
      return
    }

    const myCommitted = isPlayer1
      ? debouncedRound.player1_action_commit
      : debouncedRound.player2_action_commit
    const opponentCommitted = isPlayer1
      ? debouncedRound.player2_action_commit
      : debouncedRound.player1_action_commit

    const myRevealed = isPlayer1
      ? debouncedRound.player1_action
      : debouncedRound.player2_action
    const opponentRevealed = isPlayer1
      ? debouncedRound.player2_action
      : debouncedRound.player1_action

    // Check if round ended first (highest priority)
    // CRITICAL: Handle round transitions correctly
    if (debouncedRound.round_winner_id) {
      // If this is an old round (already moved to next round), don't show round-end
      if (game && debouncedRound.round_number < game.current_round) {
        console.log('[OnlineBattle] Old round with winner detected, already moved to Round', game.current_round)
        // Don't set phase to round-end, let it fall through to other states
        return
      }
      // This is the current round and it has ended - show round-end screen
      if (game && debouncedRound.round_number === game.current_round) {
        setPhase('round-end')
        return
      }
    }

    // Phase transitions
    if (myCommitted && !myRevealed) {
      setPhase('committed')
    }

    // Only reveal if BOTH players have commits AND neither has revealed yet
    // CRITICAL: Check that commits are NOT null (race condition guard)
    if (myCommitted && opponentCommitted && !myRevealed && !opponentRevealed && !hasRevealed.current) {
      // Both committed, trigger reveal (only once)
      hasRevealed.current = true
      revealAction()
    }

    // Cleanup for player2's delayed calculation
    let player2Timeout: NodeJS.Timeout | null = null

    if (myRevealed && opponentRevealed && !hasCalculated.current) {
      // Both revealed - prevent race condition with staggered calls
      hasCalculated.current = true
      setPhase('revealing')

      // CRITICAL FIX: Stagger calculate-results calls to prevent race condition
      // Player1 calls immediately, Player2 waits to ensure database propagation
      // This prevents 400 error: "Both players must reveal before calculating"
      // Edge function is idempotent, so Player2 gets cached results (no duplicate calculation)
      // 400ms delay provides safe buffer for Supabase propagation (100-400ms under load)
      if (isPlayer1) {
        console.log('[OnlineBattle] Player1 calculating results immediately...')
        calculateResults()
      } else {
        console.log('[OnlineBattle] Player2 will calculate in 400ms (fetches cached results)...')
        player2Timeout = setTimeout(() => {
          calculateResults()
        }, 400) // Increased from 250ms after testing showed race conditions
      }
    }

    // Cleanup function to prevent stale setTimeout calls
    return () => {
      if (player2Timeout) {
        clearTimeout(player2Timeout)
      }
    }
  }, [debouncedRound, isPlayer1, revealAction, calculateResults, game])

  // Check game end
  useEffect(() => {
    if (game?.status === 'completed') {
      setPhase('game-over')
    }
  }, [game?.status])

  // Watch for round transitions (both players ready)
  useEffect(() => {
    if (!game) return

    // When current_round increments, reset for new round
    if (game.current_round > lastProcessedRound.current) {
      console.log('[OnlineBattle] New round detected:', game.current_round)
      lastProcessedRound.current = game.current_round

      // Reset state for new round
      setBattleLog([])
      setPhase('selecting')
      setSelectedAction(null)
      setTimeLeft(30)
      hasRevealed.current = false
      hasCalculated.current = false
      hasContinued.current = false
      setWaitingForOpponent(false)
      addLog(`Round ${game.current_round} started!`)
    }
  }, [game?.current_round])

  const handleActionSelect = async (action: Action) => {
    if (phase !== 'selecting') return

    // CRITICAL: Stop timer immediately before any async operations
    // This prevents timer from expiring during commitAction and auto-selecting 'heal'
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Guard: Don't allow action selection if round data isn't loaded
    if (!currentRound) {
      console.error('[OnlineBattle] Cannot select action - round data not loaded')
      return
    }

    // Guard: Don't allow committing if already committed in this turn
    if (debouncedRound) {
      const myCommit = isPlayer1
        ? debouncedRound.player1_action_commit
        : debouncedRound.player2_action_commit

      if (myCommit) {
        console.log('[OnlineBattle] Already committed in this turn, ignoring duplicate click')
        return
      }
    }

    setSelectedAction(action)
    setPhase('committing')

    try {
      await commitAction(action, currentRound.round_number)
      addLog(`You selected ${action}`)
    } catch (err) {
      console.error('[OnlineBattle] Commit action error:', err)
      // Only reset if we still have round data (otherwise we're in a loading state)
      if (currentRound) {
        setPhase('selecting')
        setSelectedAction(null)
        addLog(`Failed to commit action. Please try again.`)
      }
    }
  }

  const handleContinue = async () => {
    try {
      if (!currentRound || !game) return

      // Guard: prevent duplicate clicks during transition
      if (hasContinued.current) {
        console.log('[OnlineBattle] Already initiated continue, ignoring duplicate click')
        return
      }
      hasContinued.current = true

      setWaitingForOpponent(true)
      addLog('Waiting for opponent to continue...')

      // CRITICAL: Use game.current_round directly - it points to the round that just ended
      // game.current_round only increments AFTER both players mark ready in the Edge Function
      const completedRoundNumber = game.current_round

      // Call ready-for-next-round Edge Function
      const { data: result, error } = await supabase.functions.invoke('ready-for-next-round', {
        body: {
          gameId,
          roundNumber: completedRoundNumber,
        },
      })

      if (error) {
        console.error('Ready for next round error:', error)
        addLog('Error marking ready. Try again.')
        setWaitingForOpponent(false)
        return
      }

      console.log('[OnlineBattle] Ready for next round result:', result)

      if (result.gameOver) {
        // Game is completed, transition to game-over screen
        addLog('Game completed!')
        setPhase('game-over')
        setWaitingForOpponent(false)
      } else if (result.bothReady) {
        // Both players ready, round will transition via useEffect watching game.current_round
        addLog('Both players ready! Starting next round...')
      } else {
        addLog('Waiting for opponent...')
      }
    } catch (err) {
      console.error('Handle continue error:', err)
      addLog('Error continuing. Try refreshing.')
      setWaitingForOpponent(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
          <div className="text-white text-2xl mb-4">Loading battle...</div>
          <div className="text-amber-100 text-sm mb-4">
            {loadingTooLong
              ? 'This is taking longer than expected. Try refreshing or check your connection.'
              : 'This should only take a few seconds...'}
          </div>
          {loadingTooLong && (
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button onClick={onGameEnd} variant="outline">
                Back to Menu
              </Button>
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
          <div className="text-red-300 text-xl mb-4">{error}</div>
          <div className="text-amber-100 text-sm mb-4">
            Try refreshing the page or check your internet connection.
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button onClick={onGameEnd} variant="outline">
              Back to Menu
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
          <div className="text-amber-200 text-xl mb-4">Game not found</div>
          <Button onClick={onGameEnd}>Back to Menu</Button>
        </Card>
      </div>
    )
  }

  if (!currentRound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-red-900 flex items-center justify-center p-8">
        <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30">
          <div className="text-amber-200 text-xl mb-4">Waiting for round data...</div>
          <div className="text-amber-100 text-sm mb-4">
            The game is starting. If this takes more than a few seconds, try refreshing.
          </div>
          <Button onClick={onGameEnd}>Back to Menu</Button>
        </Card>
      </div>
    )
  }

  // Get health from current round (use health_after if available, otherwise health_before)
  const myHealth = isPlayer1
    ? (currentRound?.player1_health_after ?? currentRound?.player1_health_before ?? myCharacter.maxHealth)
    : (currentRound?.player2_health_after ?? currentRound?.player2_health_before ?? myCharacter.maxHealth)
  const opponentHealth = isPlayer1
    ? (currentRound?.player2_health_after ?? currentRound?.player2_health_before ?? 0)
    : (currentRound?.player1_health_after ?? currentRound?.player1_health_before ?? 0)
  const myRoundWins = isPlayer1 ? game.player1_round_wins : game.player2_round_wins
  const opponentRoundWins = isPlayer1 ? game.player2_round_wins : game.player1_round_wins

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Match Info */}
        <div className="flex justify-between items-center mb-4 text-white">
          <div className="text-sm">
            Round {game.current_round} of 5
          </div>
          <div className="text-lg font-bold">
            {myRoundWins} - {opponentRoundWins}
          </div>
          {phase === 'selecting' && (
            <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : ''}`}>
              {timeLeft}s
            </div>
          )}
        </div>

        {/* Battle Area */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Player */}
          <Card className="p-4 bg-blue-900/40 backdrop-blur border-blue-500/50">
            <div className="text-center">
              <img
                src={myCharacter.image}
                alt={myCharacter.name}
                className="w-full h-64 object-cover rounded-lg mb-2"
                style={{ objectPosition: 'center 20%' }}
              />
              <h3 className="text-white font-bold text-lg">{myCharacter.name}</h3>
              <div className="mt-2">
                <div className="flex justify-between text-white text-sm mb-1">
                  <span>HP:</span>
                  <span>{myHealth}/{myCharacter.maxHealth}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all"
                    style={{ width: `${(myHealth / myCharacter.maxHealth) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Opponent */}
          <Card className="p-4 bg-red-900/40 backdrop-blur border-red-500/50">
            <div className="text-center">
              {opponentCharacter ? (
                <>
                  <img
                    src={opponentCharacter.image}
                    alt={opponentCharacter.name}
                    className="w-full h-64 object-cover rounded-lg mb-2"
                    style={{ objectPosition: 'center 20%' }}
                  />
                  <h3 className="text-white font-bold text-lg">{opponentCharacter.name}</h3>
                </>
              ) : (
                <>
                  <div className="w-full h-64 bg-gray-800 rounded-lg mb-2 flex items-center justify-center">
                    <span className="text-4xl">👤</span>
                  </div>
                  <h3 className="text-white font-bold text-lg">Opponent</h3>
                </>
              )}
              <div className="mt-2">
                <div className="flex justify-between text-white text-sm mb-1">
                  <span>HP:</span>
                  <span>
                    {opponentHealth}/{opponentCharacter?.maxHealth ?? '???'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div
                    className="bg-red-500 h-4 rounded-full transition-all"
                    style={{
                      width: opponentCharacter
                        ? `${(opponentHealth / opponentCharacter.maxHealth) * 100}%`
                        : '100%',
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Selection */}
        {phase === 'selecting' && (
          <Card className="p-6 bg-black/40 backdrop-blur border-amber-500/30 mb-4">
            <h2 className="text-2xl font-bold text-white text-center mb-4">
              Choose Your Action!
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                onClick={() => handleActionSelect('attack')}
                className="h-32 text-lg font-bold bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 flex flex-col items-center justify-center gap-2"
              >
                <Sword className="w-8 h-8" />
                <div>ATTACK</div>
                <div className="text-xs font-normal opacity-80">Deal damage</div>
              </Button>
              <Button
                onClick={() => handleActionSelect('block')}
                className="h-32 text-lg font-bold bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 flex flex-col items-center justify-center gap-2"
              >
                <Shield className="w-8 h-8" />
                <div>BLOCK</div>
                <div className="text-xs font-normal opacity-80">Defend yourself</div>
              </Button>
              <Button
                onClick={() => handleActionSelect('counter')}
                className="h-32 text-lg font-bold bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 flex flex-col items-center justify-center gap-2"
              >
                <Zap className="w-8 h-8" />
                <div>COUNTER</div>
                <div className="text-xs font-normal opacity-80">Reverse damage</div>
              </Button>
              <Button
                onClick={() => handleActionSelect('heal')}
                className="h-32 text-lg font-bold bg-gradient-to-br from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 flex flex-col items-center justify-center gap-2"
              >
                <Heart className="w-8 h-8" />
                <div>HEAL</div>
                <div className="text-xs font-normal opacity-80">Restore HP</div>
              </Button>
            </div>
          </Card>
        )}

        {/* Waiting States */}
        {(phase === 'committed' || phase === 'revealing') && (
          <Card className="p-6 bg-black/40 backdrop-blur border-amber-500/30 mb-4 text-center">
            <div className="text-xl text-white mb-2">
              {phase === 'committed' ? 'Waiting for opponent...' : 'Revealing actions...'}
            </div>
            <div className="flex justify-center">
              <div className="animate-pulse w-4 h-4 bg-yellow-400 rounded-full"></div>
            </div>
          </Card>
        )}

        {/* Round End */}
        {phase === 'round-end' && (
          <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30 mb-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              {currentRound.round_winner_id === (isPlayer1 ? game.player1_id : game.player2_id)
                ? '🎉 Round Won!'
                : '😞 Round Lost'}
            </h2>
            <div className="text-xl text-amber-100 mb-6">
              Score: {myRoundWins} - {opponentRoundWins}
            </div>
            {waitingForOpponent ? (
              <div className="text-amber-200 text-lg">
                <div className="mb-2">⏳ Waiting for opponent...</div>
                <div className="flex justify-center">
                  <div className="animate-pulse w-4 h-4 bg-yellow-400 rounded-full"></div>
                </div>
              </div>
            ) : (
              <Button onClick={handleContinue} size="lg">
                Continue →
              </Button>
            )}
          </Card>
        )}

        {/* Game Over */}
        {phase === 'game-over' && (
          <Card className="p-8 bg-black/40 backdrop-blur border-amber-500/30 mb-4 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              {game.winner_id === (isPlayer1 ? game.player1_id : game.player2_id)
                ? '👑 Victory!'
                : '💀 Defeat'}
            </h2>
            <div className="text-2xl text-amber-100 mb-6">
              Final Score: {myRoundWins} - {opponentRoundWins}
            </div>
            <Button onClick={onGameEnd} size="lg">
              Back to Menu
            </Button>
          </Card>
        )}

        {/* Battle Log */}
        {battleLog.length > 0 && (
          <Card className="bg-black/40 backdrop-blur border-amber-500/30 max-h-64 overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5" />
                Battle Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-white">
                {battleLog.slice(-15).map((log, i) => (
                  <div key={i}>→ {log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
