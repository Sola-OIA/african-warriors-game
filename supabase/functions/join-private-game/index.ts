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

    // Get authenticated user (can be guest or registered)
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

    // Ensure profile exists (create if missing)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      console.log('Profile not found, creating profile for user:', user.id)
      const isAnonymous = user.is_anonymous || !user.email
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          display_name: isAnonymous ? `Guest${Math.random().toString(36).substring(2, 8)}` : user.email?.split('@')[0] || 'Player',
          is_anonymous: isAnonymous,
        })

      if (profileError) {
        console.error('Failed to create profile:', profileError)
        return new Response(JSON.stringify({
          error: 'Failed to create user profile',
          details: profileError.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Parse request body
    const { gameCode, characterId, maxHealth, damage } = await req.json()

    // Validate inputs
    if (!gameCode || !characterId || !maxHealth || !damage) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Find game by private link
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('private_link', gameCode)
      .single()

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ error: 'Game not found. Check the code and try again.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if game is waiting for a player
    if (game.status !== 'waiting') {
      return new Response(
        JSON.stringify({ error: 'Game has already started or ended' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if player 2 already joined
    if (game.player2_id) {
      return new Response(
        JSON.stringify({ error: 'Game is full' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Prevent joining your own game
    if (game.player1_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot join your own game' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Join game as player 2
    console.log('Attempting to update game:', game.id, 'with player2:', user.id)
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_id: user.id,
        player2_character_id: characterId,
        player2_max_health: maxHealth,
        player2_health: maxHealth,
        player2_damage: damage,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', game.id)
      .select()
      .single()

    console.log('Game update result:', { updatedGame, updateError })

    if (updateError || !updatedGame) {
      console.error('Join game error:', updateError)
      return new Response(
        JSON.stringify({
          error: 'Failed to join game',
          details: updateError?.message || 'No game returned',
          code: updateError?.code
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Update first round with player 2's health
    const { error: roundError } = await supabase
      .from('game_rounds')
      .update({
        player2_health_before: maxHealth,
      })
      .eq('game_id', game.id)
      .eq('round_number', 1)

    if (roundError) {
      console.error('Update round error:', roundError)
      return new Response(
        JSON.stringify({ error: 'Failed to initialize round data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify round was updated successfully
    const { data: verifiedRound, error: verifyError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('game_id', game.id)
      .eq('round_number', 1)
      .single()

    if (verifyError || !verifiedRound) {
      console.error('Round verification failed:', verifyError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify round initialization' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        gameId: updatedGame.id,
        game: updatedGame,
        round: verifiedRound,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Join private game error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
