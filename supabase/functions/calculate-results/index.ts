import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type Action = 'attack' | 'block' | 'counter' | 'heal'

interface BattleResult {
  player1Damage: number
  player2Damage: number
  player1Heal: number
  player2Heal: number
}

/**
 * Calculate battle outcome based on simultaneous actions
 * Matches the game logic from client/src/lib/gameLogic.ts
 */
function calculateBattle(
  action1: Action,
  action2: Action,
  player1Damage: number,
  player2Damage: number,
  player1MaxHealth: number,
  player2MaxHealth: number
): BattleResult {
  const matrix: Record<
    Action,
    Record<Action, { p1: number; p2: number; h1: number; h2: number }>
  > = {
    attack: {
      attack: { p1: player2Damage, p2: player1Damage, h1: 0, h2: 0 }, // Both hit each other
      block: { p1: 0, p2: Math.floor(player1Damage * 0.3), h1: 0, h2: 0 }, // Block reduces damage to 30%
      counter: { p1: Math.floor(player2Damage * 1.5), p2: Math.floor(player1Damage * 0.5), h1: 0, h2: 0 }, // Counter deals 1.5x, attacker still lands 50%
      heal: { p1: 0, p2: player1Damage, h1: 0, h2: Math.floor(player2MaxHealth * 0.2) }, // Attack interrupts heal (20% heal)
    },
    block: {
      attack: { p1: Math.floor(player2Damage * 0.3), p2: 0, h1: 0, h2: 0 }, // Block reduces damage to 30%
      block: { p1: 0, p2: 0, h1: 10, h2: 10 }, // Both block and heal 10 HP
      counter: { p1: 0, p2: 20, h1: 0, h2: 0 }, // Counter takes recoil damage
      heal: { p1: 0, p2: 0, h1: 10, h2: Math.floor(player2MaxHealth * 0.2) }, // Block heals 10, Heal heals 20%
    },
    counter: {
      attack: { p1: Math.floor(player2Damage * 0.5), p2: Math.floor(player1Damage * 1.5), h1: 0, h2: 0 }, // Counter deals 1.5x, attacker still lands 50%
      block: { p1: 20, p2: 0, h1: 0, h2: 0 }, // Counter takes recoil damage
      counter: { p1: 30, p2: 30, h1: 0, h2: 0 }, // Both counters take recoil
      heal: { p1: 0, p2: 0, h1: 0, h2: Math.floor(player2MaxHealth * 0.2) }, // Heal succeeds (20% heal)
    },
    heal: {
      attack: { p1: player2Damage, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: 0 }, // Interrupted, 20% heal
      block: { p1: 0, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: 10 }, // Heal heals 20%, Block heals 10
      counter: { p1: 0, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: 0 }, // Heal succeeds (20% heal)
      heal: { p1: 0, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: Math.floor(player2MaxHealth * 0.2) }, // Both heal 20%
    },
  }

  const result = matrix[action1]?.[action2] || { p1: 0, p2: 0, h1: 0, h2: 0 }

  return {
    player1Damage: result.p1,
    player2Damage: result.p2,
    player1Heal: result.h1,
    player2Heal: result.h2,
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[calculate-results] Function invoked')

    // First, authenticate the user making the request
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser()

    if (authError || !user) {
      console.error('[calculate-results] Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { gameId, roundNumber } = await req.json()
    console.log('[calculate-results] Request:', { gameId, roundNumber, userId: user.id })

    // Use service role client for all database operations (bypasses RLS)
    console.log('[calculate-results] Creating service role client')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify user is part of the game using service role client
    const { data: gameCheck, error: gameCheckError } = await supabase
      .from('games')
      .select('player1_id, player2_id')
      .eq('id', gameId)
      .single()

    console.log('[calculate-results] Game check result:', { gameCheck, gameCheckError })

    if (gameCheckError || !gameCheck) {
      console.error('[calculate-results] Game not found:', gameCheckError)
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isPlayer = gameCheck.player1_id === user.id || gameCheck.player2_id === user.id
    if (!isPlayer) {
      console.error('[calculate-results] User not part of game:', { userId: user.id, game: gameCheck })
      return new Response(
        JSON.stringify({ error: 'Not part of this game' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!gameId || roundNumber === undefined) {
      console.error('[calculate-results] Missing parameters:', { gameId, roundNumber })
      return new Response(
        JSON.stringify({ error: 'Missing gameId or roundNumber' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get game data
    console.log('[calculate-results] Fetching game with service role client')
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    console.log('[calculate-results] Game fetch result:', { game: !!game, gameError })

    if (gameError || !game) {
      console.error('[calculate-results] Game not found with service role:', gameError)
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get round data
    console.log('[calculate-results] Fetching round data')
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .single()

    console.log('[calculate-results] Round fetch result:', { round: !!round, roundError })

    if (roundError || !round) {
      console.error('[calculate-results] Round not found:', roundError)
      return new Response(JSON.stringify({ error: 'Round not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify both players have revealed
    if (!round.player1_action || !round.player2_action) {
      return new Response(
        JSON.stringify({ error: 'Both players must reveal before calculating' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // IDEMPOTENCY CHECK: If results already calculated, return cached results
    if (round.player1_health_after !== null && round.player2_health_after !== null) {
      console.log('[calculate-results] Results already calculated, returning cached data')

      const cachedBattleResult = {
        player1Damage: round.player2_damage_dealt || 0, // Player1 takes damage FROM player2
        player2Damage: round.player1_damage_dealt || 0, // Player2 takes damage FROM player1
        player1Heal: round.player1_heal_amount || 0,
        player2Heal: round.player2_heal_amount || 0,
      }

      const roundEnded = !!round.round_winner_id

      return new Response(
        JSON.stringify({
          success: true,
          battleResult: cachedBattleResult,
          newPlayer1Health: round.player1_health_after,
          newPlayer2Health: round.player2_health_after,
          roundWinner: round.round_winner_id,
          roundEnded,
          cached: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Use exact character damage stats for deterministic multiplayer gameplay
    // (Variance and critical hits removed to ensure both players see identical results)
    const p1Damage = game.player1_damage || 30
    const p2Damage = game.player2_damage || 30

    // Calculate battle result
    const battleResult = calculateBattle(
      round.player1_action as Action,
      round.player2_action as Action,
      p1Damage,
      p2Damage,
      game.player1_max_health || 200,
      game.player2_max_health || 200
    )

    // Calculate new health values
    const newPlayer1Health = Math.min(
      game.player1_max_health || 200,
      Math.max(
        0,
        (game.player1_health || 200) -
          battleResult.player1Damage +
          battleResult.player1Heal
      )
    )

    const newPlayer2Health = Math.min(
      game.player2_max_health || 200,
      Math.max(
        0,
        (game.player2_health || 200) -
          battleResult.player2Damage +
          battleResult.player2Heal
      )
    )

    // Determine round winner
    let roundWinner = null
    if (newPlayer1Health <= 0 && newPlayer2Health > 0) {
      roundWinner = game.player2_id
    } else if (newPlayer2Health <= 0 && newPlayer1Health > 0) {
      roundWinner = game.player1_id
    }

    // Update round with results
    const { error: updateRoundError } = await supabase
      .from('game_rounds')
      .update({
        player1_damage_dealt: battleResult.player2Damage,
        player2_damage_dealt: battleResult.player1Damage,
        player1_heal_amount: battleResult.player1Heal,
        player2_heal_amount: battleResult.player2Heal,
        player1_health_after: newPlayer1Health,
        player2_health_after: newPlayer2Health,
        round_winner_id: roundWinner,
      })
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)

    if (updateRoundError) {
      console.error('[calculate-results] Update round error:', updateRoundError)
      return new Response(
        JSON.stringify({
          error: 'Failed to update round results',
          details: updateRoundError.message,
          code: updateRoundError.code
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update game health
    const { error: updateGameError } = await supabase
      .from('games')
      .update({
        player1_health: newPlayer1Health,
        player2_health: newPlayer2Health,
      })
      .eq('id', gameId)

    if (updateGameError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update game health' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Clear actions for next turn if round continues (no winner yet)
    if (!roundWinner) {
      console.log('[calculate-results] Clearing actions for next turn')
      const { error: clearActionsError } = await supabase
        .from('game_rounds')
        .update({
          player1_action_commit: null,
          player2_action_commit: null,
          player1_action: null,
          player2_action: null,
          player1_salt: null,
          player2_salt: null,
          player1_committed_at: null,
          player2_committed_at: null,
          player1_revealed_at: null,
          player2_revealed_at: null,
          // Update health baseline for next turn within the same round
          player1_health_before: newPlayer1Health,
          player2_health_before: newPlayer2Health,
          // CRITICAL: Clear health_after to prevent idempotency check from returning stale cached results
          player1_health_after: null,
          player2_health_after: null,
          // Also clear damage/heal amounts so cached results aren't returned
          player1_damage_dealt: null,
          player2_damage_dealt: null,
          player1_heal_amount: null,
          player2_heal_amount: null,
        })
        .eq('game_id', gameId)
        .eq('round_number', roundNumber)

      if (clearActionsError) {
        console.error('[calculate-results] Failed to clear actions:', clearActionsError)
        return new Response(
          JSON.stringify({ error: 'Failed to clear actions for next turn' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // If round ended, update round wins
    if (roundWinner) {
      const player1RoundWins =
        (game.player1_round_wins || 0) + (roundWinner === game.player1_id ? 1 : 0)
      const player2RoundWins =
        (game.player2_round_wins || 0) + (roundWinner === game.player2_id ? 1 : 0)

      // Check if match is over (best of 5 = first to 3)
      let matchWinner = null
      let newStatus = game.status

      if (player1RoundWins >= 3) {
        matchWinner = game.player1_id
        newStatus = 'completed'
      } else if (player2RoundWins >= 3) {
        matchWinner = game.player2_id
        newStatus = 'completed'
      } else {
        // Prepare next round
        newStatus = 'in_progress'
      }

      // Update game with round wins and status
      // Note: current_round is NOT incremented here when round ends
      // It will be incremented by ready-for-next-round function when both players are ready
      const { error: updateWinsError } = await supabase
        .from('games')
        .update({
          player1_round_wins: player1RoundWins,
          player2_round_wins: player2RoundWins,
          winner_id: matchWinner,
          status: newStatus,
          completed_at: matchWinner ? new Date().toISOString() : null,
        })
        .eq('id', gameId)

      if (updateWinsError) {
        return new Response(
          JSON.stringify({ error: 'Failed to update round wins' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Do NOT auto-create next round - wait for both players to be ready
      // The ready-for-next-round Edge Function will handle round creation

      return new Response(
        JSON.stringify({
          success: true,
          battleResult,
          newPlayer1Health,
          newPlayer2Health,
          roundWinner,
          matchWinner,
          roundEnded: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Round continues
    return new Response(
      JSON.stringify({
        success: true,
        battleResult,
        newPlayer1Health,
        newPlayer2Health,
        roundEnded: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Calculate results error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
