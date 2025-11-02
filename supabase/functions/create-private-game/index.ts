import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

/**
 * Generate a random 6-character alphanumeric code
 * Example: "A3X9K2"
 */
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar-looking chars (I/1, O/0)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
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
    const { characterId, maxHealth, damage } = await req.json()

    // Validate inputs
    if (!characterId || !maxHealth || !damage) {
      return new Response(
        JSON.stringify({ error: 'Missing character data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate unique game code (try up to 10 times)
    let gameCode = ''
    let codeIsUnique = false
    let attempts = 0

    while (!codeIsUnique && attempts < 10) {
      gameCode = generateGameCode()

      // Check if code already exists
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('private_link', gameCode)
        .single()

      if (!existingGame) {
        codeIsUnique = true
      }
      attempts++
    }

    if (!codeIsUnique) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique game code' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create game record
    console.log('Creating game for user:', user.id, 'with character:', characterId)
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        player1_id: user.id,
        player1_character_id: characterId,
        player1_max_health: maxHealth,
        player1_health: maxHealth,
        player1_damage: damage,
        game_type: 'private',
        status: 'waiting',
        private_link: gameCode,
        current_round: 1,
      })
      .select()
      .single()

    console.log('Game creation result:', { game, gameError })

    if (gameError || !game) {
      console.error('Create game error:', gameError)
      return new Response(JSON.stringify({
        error: 'Failed to create game',
        details: gameError?.message || 'No game returned',
        code: gameError?.code
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create first round
    const { error: roundError } = await supabase.from('game_rounds').insert({
      game_id: game.id,
      round_number: 1,
      player1_health_before: maxHealth,
      player2_health_before: null, // Will be set when player 2 joins
    })

    if (roundError) {
      console.error('Create round error:', roundError)
      // Game was created, but round failed - delete game to maintain consistency
      await supabase.from('games').delete().eq('id', game.id)

      return new Response(
        JSON.stringify({ error: 'Failed to initialize game round' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate shareable URL
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'
    const shareableUrl = `${appUrl}/join/${gameCode}`

    return new Response(
      JSON.stringify({
        success: true,
        gameId: game.id,
        gameCode,
        shareableUrl,
        whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`Join my African Warriors battle! ${shareableUrl}`)}`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Create private game error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
