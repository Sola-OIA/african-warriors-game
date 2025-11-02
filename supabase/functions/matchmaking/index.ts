import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const ELO_TOLERANCE = 200 // Match players within ±200 rating
const QUEUE_TIMEOUT_SECONDS = 60 // Remove from queue after 60 seconds

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

    // Get user profile with ELO rating
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, elo_rating, is_anonymous')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only registered users can use matchmaking (prevent abuse)
    if (profile.is_anonymous) {
      return new Response(
        JSON.stringify({
          error: 'Please sign up to play random matches. Guest accounts can only join private games.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { characterId, maxHealth, damage, action } = await req.json()

    // Handle queue actions
    if (action === 'cancel') {
      // Remove from queue
      const { error: deleteError } = await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('player_id', user.id)

      if (deleteError) {
        console.error('Cancel matchmaking error:', deleteError)
      }

      return new Response(JSON.stringify({ success: true, canceled: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate character data for join action
    if (!characterId || !maxHealth || !damage) {
      return new Response(
        JSON.stringify({ error: 'Missing character data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const playerElo = profile.elo_rating || 1200
    const minElo = playerElo - ELO_TOLERANCE
    const maxElo = playerElo + ELO_TOLERANCE

    // Clean up expired queue entries
    const expirationTime = new Date(
      Date.now() - QUEUE_TIMEOUT_SECONDS * 1000
    ).toISOString()
    await supabase
      .from('matchmaking_queue')
      .delete()
      .lt('joined_at', expirationTime)

    // Search for opponent in queue with similar ELO
    const { data: opponents, error: searchError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .neq('player_id', user.id) // Not myself
      .gte('elo_rating', minElo)
      .lte('elo_rating', maxElo)
      .order('joined_at', { ascending: true }) // FIFO
      .limit(1)

    if (searchError) {
      console.error('Search queue error:', searchError)
      return new Response(
        JSON.stringify({ error: 'Failed to search for opponents' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If opponent found, create game
    if (opponents && opponents.length > 0) {
      const opponent = opponents[0]

      // Remove both players from queue
      await supabase
        .from('matchmaking_queue')
        .delete()
        .in('player_id', [user.id, opponent.player_id])

      // Create game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          player1_id: opponent.player_id,
          player1_character_id: opponent.character_id,
          player1_max_health: opponent.max_health,
          player1_health: opponent.max_health,
          player1_damage: opponent.damage,
          player2_id: user.id,
          player2_character_id: characterId,
          player2_max_health: maxHealth,
          player2_health: maxHealth,
          player2_damage: damage,
          game_mode: 'ranked',
          status: 'in_progress',
          current_round: 1,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (gameError || !game) {
        console.error('Create game error:', gameError)
        return new Response(
          JSON.stringify({ error: 'Failed to create game' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Create first round
      const { error: roundError } = await supabase.from('game_rounds').insert({
        game_id: game.id,
        round_number: 1,
        player1_health: opponent.max_health,
        player2_health: maxHealth,
      })

      if (roundError) {
        console.error('Create round error:', roundError)
        // Clean up game if round creation failed
        await supabase.from('games').delete().eq('id', game.id)

        return new Response(
          JSON.stringify({ error: 'Failed to initialize game round' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          matched: true,
          gameId: game.id,
          game,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // No opponent found - add to queue
    const { error: queueError } = await supabase
      .from('matchmaking_queue')
      .upsert(
        {
          player_id: user.id,
          elo_rating: playerElo,
          character_id: characterId,
          max_health: maxHealth,
          damage: damage,
          joined_at: new Date().toISOString(),
        },
        {
          onConflict: 'player_id', // Replace existing entry if player rejoins
        }
      )

    if (queueError) {
      console.error('Join queue error:', queueError)
      return new Response(JSON.stringify({ error: 'Failed to join queue' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        matched: false,
        searching: true,
        eloRange: { min: minElo, max: maxElo },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Matchmaking error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
