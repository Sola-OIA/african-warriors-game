import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Hash function to verify commitment
async function hashAction(action: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(action + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { gameId, roundNumber, action } = await req.json()

    // Validate action
    const validActions = ['attack', 'block', 'counter', 'heal']
    if (!validActions.includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get game and verify user is player
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('player1_id, player2_id')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      return new Response(JSON.stringify({ error: 'Game not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    // Get round data
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .single()

    if (roundError || !round) {
      return new Response(JSON.stringify({ error: 'Round not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify the commitment
    const salt = isPlayer1 ? round.player1_salt : round.player2_salt
    const commitment = isPlayer1
      ? round.player1_action_commit
      : round.player2_action_commit

    if (!salt || !commitment) {
      return new Response(JSON.stringify({ error: 'No commitment found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Compute hash and verify
    const computedHash = await hashAction(action, salt)

    if (computedHash !== commitment) {
      return new Response(
        JSON.stringify({ error: 'Action does not match commitment' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Store the revealed action
    const updateData = isPlayer1
      ? {
          player1_action: action,
          player1_revealed_at: new Date().toISOString(),
        }
      : {
          player2_action: action,
          player2_revealed_at: new Date().toISOString(),
        }

    const { error: updateError } = await supabase
      .from('game_rounds')
      .update(updateData)
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to reveal action' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if both players revealed
    const { data: updatedRound } = await supabase
      .from('game_rounds')
      .select('player1_action, player2_action')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .single()

    const bothRevealed =
      updatedRound?.player1_action && updatedRound?.player2_action

    return new Response(
      JSON.stringify({ success: true, bothRevealed }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
