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
    const { gameId, roundNumber, actionCommit, salt } = await req.json()

    // Validate inputs
    if (!gameId || !roundNumber || !actionCommit || !salt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user is part of this game
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

    // Store the commitment
    const updateData = isPlayer1
      ? {
          player1_action_commit: actionCommit,
          player1_salt: salt,
          player1_committed_at: new Date().toISOString(),
        }
      : {
          player2_action_commit: actionCommit,
          player2_salt: salt,
          player2_committed_at: new Date().toISOString(),
        }

    const { error: updateError } = await supabase
      .from('game_rounds')
      .update(updateData)
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to commit action' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if both players have committed
    const { data: round } = await supabase
      .from('game_rounds')
      .select('player1_action_commit, player2_action_commit')
      .eq('game_id', gameId)
      .eq('round_number', roundNumber)
      .single()

    const bothCommitted =
      round?.player1_action_commit && round?.player2_action_commit

    return new Response(
      JSON.stringify({ success: true, bothCommitted }),
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
