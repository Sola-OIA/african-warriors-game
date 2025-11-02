import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[ready-for-next-round] Function invoked')

    // Authenticate the user
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser()

    if (authError || !user) {
      console.error('[ready-for-next-round] Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { gameId, roundNumber } = await req.json()
    console.log('[ready-for-next-round] Request:', { gameId, roundNumber, userId: user.id })

    if (!gameId || roundNumber === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing gameId or roundNumber' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Use service role client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get game data and verify user is a player
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      console.error('[ready-for-next-round] Game not found:', gameError)
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify user is part of the game
    const isPlayer1 = game.player1_id === user.id
    const isPlayer2 = game.player2_id === user.id

    if (!isPlayer1 && !isPlayer2) {
      return new Response(
        JSON.stringify({ error: 'Not part of this game' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get current round
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .single()

    if (roundError || !round) {
      console.error('[ready-for-next-round] Round not found:', roundError)
      return new Response(JSON.stringify({ error: 'Round not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify round has ended (has a winner) OR already transitioned
    if (!round.round_winner_id) {
      // Idempotency check: if both players already marked ready, round transitioned
      if (round.player1_ready_for_next_round && round.player2_ready_for_next_round) {
        console.log('[ready-for-next-round] Round already transitioned, returning success')
        return new Response(
          JSON.stringify({
            success: true,
            bothReady: true,
            nextRound: roundNumber + 1,
            message: 'Round already transitioned',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Round has no winner and hasn't transitioned yet - this is an error
      return new Response(
        JSON.stringify({ error: 'Round has not ended yet' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Set the ready flag for the calling player
    const readyField = isPlayer1 ? 'player1_ready_for_next_round' : 'player2_ready_for_next_round'

    const { error: updateReadyError } = await supabase
      .from('game_rounds')
      .update({ [readyField]: true })
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)

    if (updateReadyError) {
      console.error('[ready-for-next-round] Failed to set ready flag:', updateReadyError)
      return new Response(
        JSON.stringify({ error: 'Failed to set ready status' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch the round again to get the updated ready flags
    const { data: updatedRound, error: fetchUpdatedError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .single()

    if (fetchUpdatedError || !updatedRound) {
      console.error('[ready-for-next-round] Failed to fetch updated round:', fetchUpdatedError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify ready status' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if both players are ready
    const bothReady = updatedRound.player1_ready_for_next_round && updatedRound.player2_ready_for_next_round

    if (bothReady) {
      console.log('[ready-for-next-round] Both players ready, creating next round')

      // Check if game is already completed - don't create new round
      if (game.status === 'completed') {
        console.log('[ready-for-next-round] Game completed, not creating next round')
        return new Response(
          JSON.stringify({
            success: true,
            bothReady: true,
            gameOver: true,
            message: 'Game completed',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Increment current_round
      const nextRoundNumber = roundNumber + 1

      const { error: updateGameError } = await supabase
        .from('games')
        .update({ current_round: nextRoundNumber })
        .eq('id', gameId)

      if (updateGameError) {
        console.error('[ready-for-next-round] Failed to increment round:', updateGameError)
        return new Response(
          JSON.stringify({ error: 'Failed to advance to next round' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Create next round with health reset and ready flags reset
      const { error: createRoundError } = await supabase
        .from('game_rounds')
        .insert({
          game_id: gameId,
          round_number: nextRoundNumber,
          player1_health_before: game.player1_max_health || 200,
          player2_health_before: game.player2_max_health || 200,
          player1_ready_for_next_round: false,
          player2_ready_for_next_round: false,
        })

      if (createRoundError) {
        console.error('[ready-for-next-round] Failed to create round:', createRoundError)
        return new Response(
          JSON.stringify({ error: 'Failed to create next round' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Reset health in game record
      const { error: resetHealthError } = await supabase
        .from('games')
        .update({
          player1_health: game.player1_max_health || 200,
          player2_health: game.player2_max_health || 200,
        })
        .eq('id', gameId)

      if (resetHealthError) {
        console.error('[ready-for-next-round] Failed to reset health:', resetHealthError)
        // Non-fatal error, continue
      }

      return new Response(
        JSON.stringify({
          success: true,
          bothReady: true,
          nextRound: nextRoundNumber,
          message: 'Next round started',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Only this player is ready, waiting for other player
    return new Response(
      JSON.stringify({
        success: true,
        bothReady: false,
        message: 'Waiting for other player',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('[ready-for-next-round] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
