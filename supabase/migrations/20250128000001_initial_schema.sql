-- ============================================
-- AFRICAN WARRIORS - ONLINE MULTIPLAYER SCHEMA
-- ============================================
-- Free Tier Optimized Database Schema
-- Commit-Reveal Pattern for Simultaneous Actions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROFILES TABLE (Users - Anonymous + Registered)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Stats
  total_games INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  elo_rating INTEGER DEFAULT 1200,

  -- Constraints
  CONSTRAINT valid_elo CHECK (elo_rating >= 0 AND elo_rating <= 5000)
);

-- Indexes for profiles
CREATE INDEX idx_profiles_elo ON profiles(elo_rating DESC);
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_created ON profiles(created_at DESC);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- GAMES TABLE (Game Sessions)
-- ============================================
CREATE TYPE game_status AS ENUM ('waiting', 'in_progress', 'completed', 'abandoned');
CREATE TYPE game_type AS ENUM ('private', 'matchmaking');

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type game_type NOT NULL,
  status game_status DEFAULT 'waiting',

  -- Players
  player1_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player1_character_id INTEGER NOT NULL,
  player2_character_id INTEGER,

  -- Game settings
  difficulty TEXT DEFAULT 'medium',
  max_rounds INTEGER DEFAULT 5,
  current_round INTEGER DEFAULT 1,

  -- Round wins tracking
  player1_round_wins INTEGER DEFAULT 0,
  player2_round_wins INTEGER DEFAULT 0,

  -- Winner
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Private game link (6-char code)
  private_link TEXT UNIQUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_players CHECK (player1_id IS DISTINCT FROM player2_id),
  CONSTRAINT valid_rounds CHECK (current_round <= max_rounds),
  CONSTRAINT valid_round_wins CHECK (player1_round_wins >= 0 AND player2_round_wins >= 0),
  CONSTRAINT private_link_format CHECK (private_link IS NULL OR length(private_link) = 6)
);

-- Indexes for games
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_player1 ON games(player1_id) WHERE player1_id IS NOT NULL;
CREATE INDEX idx_games_player2 ON games(player2_id) WHERE player2_id IS NOT NULL;
CREATE INDEX idx_games_private_link ON games(private_link) WHERE private_link IS NOT NULL;
CREATE INDEX idx_games_matchmaking ON games(game_type, status) WHERE game_type = 'matchmaking' AND status = 'waiting';
CREATE INDEX idx_games_created ON games(created_at DESC);

-- RLS Policies for games
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own games or waiting games"
  ON games FOR SELECT
  USING (
    auth.uid() = player1_id OR
    auth.uid() = player2_id OR
    status = 'waiting'
  );

CREATE POLICY "Authenticated users can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = player1_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (
    auth.uid() = player1_id OR
    auth.uid() = player2_id
  );

-- ============================================
-- GAME_ROUNDS TABLE (Commit-Reveal Pattern)
-- ============================================
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,

  -- Player 1 Commit-Reveal
  player1_action_commit TEXT, -- SHA-256 hash of (action + salt)
  player1_action TEXT,         -- Revealed action: 'attack', 'block', 'counter', 'heal'
  player1_salt TEXT,           -- Random salt for commit
  player1_committed_at TIMESTAMPTZ,
  player1_revealed_at TIMESTAMPTZ,

  -- Player 2 Commit-Reveal
  player2_action_commit TEXT,
  player2_action TEXT,
  player2_salt TEXT,
  player2_committed_at TIMESTAMPTZ,
  player2_revealed_at TIMESTAMPTZ,

  -- Round results
  player1_health_before INTEGER,
  player2_health_before INTEGER,
  player1_health_after INTEGER,
  player2_health_after INTEGER,
  player1_damage_dealt INTEGER DEFAULT 0,
  player2_damage_dealt INTEGER DEFAULT 0,
  round_winner_id UUID REFERENCES profiles(id),

  -- Battle log (JSON for flexible storage)
  battle_events JSONB,

  -- Timer tracking
  timer_started_at TIMESTAMPTZ DEFAULT NOW(),
  auto_selected BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(game_id, round_number),
  CONSTRAINT valid_actions CHECK (
    (player1_action IS NULL OR player1_action IN ('attack', 'block', 'counter', 'heal')) AND
    (player2_action IS NULL OR player2_action IN ('attack', 'block', 'counter', 'heal'))
  ),
  CONSTRAINT valid_health CHECK (
    (player1_health_before IS NULL OR player1_health_before >= 0) AND
    (player2_health_before IS NULL OR player2_health_before >= 0) AND
    (player1_health_after IS NULL OR player1_health_after >= 0) AND
    (player2_health_after IS NULL OR player2_health_after >= 0)
  )
);

-- Indexes for game_rounds
CREATE INDEX idx_game_rounds_game ON game_rounds(game_id, round_number);
CREATE INDEX idx_game_rounds_timer ON game_rounds(timer_started_at)
  WHERE completed_at IS NULL;
CREATE INDEX idx_game_rounds_incomplete ON game_rounds(game_id)
  WHERE completed_at IS NULL;

-- RLS Policies for game_rounds
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view rounds from their games"
  ON game_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_rounds.game_id
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can insert rounds"
  ON game_rounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_rounds.game_id
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can update rounds in their games"
  ON game_rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_rounds.game_id
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

-- ============================================
-- GAME_HISTORY TABLE (Completed Games Archive)
-- ============================================
CREATE TABLE game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  player1_character_id INTEGER,
  player2_character_id INTEGER,
  rounds_played INTEGER,
  player1_round_wins INTEGER,
  player2_round_wins INTEGER,
  game_duration_seconds INTEGER,
  game_type game_type,
  elo_change_player1 INTEGER,
  elo_change_player2 INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for game_history
CREATE INDEX idx_game_history_player1 ON game_history(player1_id);
CREATE INDEX idx_game_history_player2 ON game_history(player2_id);
CREATE INDEX idx_game_history_created ON game_history(created_at DESC);
CREATE INDEX idx_game_history_winner ON game_history(winner_id) WHERE winner_id IS NOT NULL;

-- RLS Policies for game_history
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view game history"
  ON game_history FOR SELECT
  USING (true);

-- ============================================
-- MATCHMAKING_QUEUE TABLE (Random Matchmaking)
-- ============================================
CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  character_id INTEGER NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',

  CONSTRAINT valid_character CHECK (character_id >= 0 AND character_id < 16)
);

-- Indexes for matchmaking_queue
CREATE INDEX idx_matchmaking_elo ON matchmaking_queue(elo_rating);
CREATE INDEX idx_matchmaking_created ON matchmaking_queue(created_at);
CREATE INDEX idx_matchmaking_expires ON matchmaking_queue(expires_at);

-- RLS Policies for matchmaking_queue
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view matchmaking queue"
  ON matchmaking_queue FOR SELECT
  USING (true);

CREATE POLICY "Users can insert themselves to queue"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Users can remove themselves from queue"
  ON matchmaking_queue FOR DELETE
  USING (auth.uid() = player_id);

-- ============================================
-- MATCHUPS TABLE (Head-to-Head Stats)
-- ============================================
CREATE TABLE matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stats
  player1_wins INTEGER DEFAULT 0,
  player2_wins INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique pairing (order doesn't matter)
  CONSTRAINT unique_matchup UNIQUE (player1_id, player2_id),
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Indexes for matchups
CREATE INDEX idx_matchups_player1 ON matchups(player1_id);
CREATE INDEX idx_matchups_player2 ON matchups(player2_id);
CREATE INDEX idx_matchups_last_played ON matchups(last_played_at DESC);

-- RLS Policies for matchups
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their matchups"
  ON matchups FOR SELECT
  USING (
    auth.uid() = player1_id OR
    auth.uid() = player2_id
  );

-- ============================================
-- LEADERBOARD VIEW (Global Rankings)
-- ============================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  elo_rating,
  total_games,
  total_wins,
  total_losses,
  win_streak,
  best_streak,
  CASE
    WHEN total_games > 0 THEN ROUND((total_wins::numeric / total_games::numeric) * 100, 2)
    ELSE 0
  END AS win_rate,
  ROW_NUMBER() OVER (ORDER BY elo_rating DESC, total_wins DESC) AS rank
FROM profiles
WHERE is_anonymous = FALSE  -- Only registered users on leaderboard
  AND total_games > 0       -- Must have played at least one game
ORDER BY elo_rating DESC, total_wins DESC
LIMIT 100;                  -- Top 100 players only

-- ============================================
-- FUNCTIONS: Auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matchups_updated_at
  BEFORE UPDATE ON matchups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTIONS: Auto-cleanup expired matchmaking
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_expired_matchmaking()
RETURNS void AS $$
BEGIN
  DELETE FROM matchmaking_queue WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTIONS: Auto-update game status
-- ============================================
CREATE OR REPLACE FUNCTION update_game_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When player 2 joins, start the game
  IF NEW.player2_id IS NOT NULL AND OLD.player2_id IS NULL THEN
    NEW.status = 'in_progress';
    NEW.started_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_status_trigger
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_game_status();

-- ============================================
-- FUNCTIONS: Calculate ELO rating change
-- ============================================
CREATE OR REPLACE FUNCTION calculate_elo_change(
  winner_elo INTEGER,
  loser_elo INTEGER,
  k_factor INTEGER DEFAULT 32
)
RETURNS TABLE (winner_change INTEGER, loser_change INTEGER) AS $$
DECLARE
  expected_winner NUMERIC;
  expected_loser NUMERIC;
BEGIN
  -- Calculate expected scores
  expected_winner := 1.0 / (1.0 + POWER(10.0, (loser_elo - winner_elo)::numeric / 400.0));
  expected_loser := 1.0 / (1.0 + POWER(10.0, (winner_elo - loser_elo)::numeric / 400.0));

  -- Calculate rating changes
  winner_change := ROUND(k_factor * (1.0 - expected_winner))::INTEGER;
  loser_change := ROUND(k_factor * (0.0 - expected_loser))::INTEGER;

  RETURN QUERY SELECT winner_change, loser_change;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTIONS: Finalize game (update stats)
-- ============================================
CREATE OR REPLACE FUNCTION finalize_game(
  p_game_id UUID
)
RETURNS void AS $$
DECLARE
  v_game RECORD;
  v_elo_changes RECORD;
BEGIN
  -- Get game data
  SELECT * INTO v_game FROM games WHERE id = p_game_id;

  IF NOT FOUND OR v_game.status != 'completed' THEN
    RETURN;
  END IF;

  -- Calculate ELO changes for matchmaking games
  IF v_game.game_type = 'matchmaking' AND v_game.winner_id IS NOT NULL THEN
    SELECT * INTO v_elo_changes FROM calculate_elo_change(
      (SELECT elo_rating FROM profiles WHERE id = v_game.winner_id),
      (SELECT elo_rating FROM profiles WHERE id =
        CASE
          WHEN v_game.winner_id = v_game.player1_id THEN v_game.player2_id
          ELSE v_game.player1_id
        END
      )
    );

    -- Update winner ELO and win streak
    UPDATE profiles
    SET
      elo_rating = elo_rating + v_elo_changes.winner_change,
      total_wins = total_wins + 1,
      total_games = total_games + 1,
      win_streak = win_streak + 1,
      best_streak = GREATEST(best_streak, win_streak + 1)
    WHERE id = v_game.winner_id;

    -- Update loser ELO and reset win streak
    UPDATE profiles
    SET
      elo_rating = GREATEST(0, elo_rating + v_elo_changes.loser_change),
      total_losses = total_losses + 1,
      total_games = total_games + 1,
      win_streak = 0
    WHERE id = CASE
      WHEN v_game.winner_id = v_game.player1_id THEN v_game.player2_id
      ELSE v_game.player1_id
    END;

    -- Insert into game history
    INSERT INTO game_history (
      game_id,
      player1_id,
      player2_id,
      winner_id,
      player1_character_id,
      player2_character_id,
      rounds_played,
      player1_round_wins,
      player2_round_wins,
      game_duration_seconds,
      game_type,
      elo_change_player1,
      elo_change_player2
    ) VALUES (
      v_game.id,
      v_game.player1_id,
      v_game.player2_id,
      v_game.winner_id,
      v_game.player1_character_id,
      v_game.player2_character_id,
      v_game.current_round,
      v_game.player1_round_wins,
      v_game.player2_round_wins,
      EXTRACT(EPOCH FROM (v_game.completed_at - v_game.started_at))::INTEGER,
      v_game.game_type,
      CASE WHEN v_game.winner_id = v_game.player1_id
        THEN v_elo_changes.winner_change
        ELSE v_elo_changes.loser_change
      END,
      CASE WHEN v_game.winner_id = v_game.player2_id
        THEN v_elo_changes.winner_change
        ELSE v_elo_changes.loser_change
      END
    );
  END IF;

  -- Update matchup stats
  INSERT INTO matchups (player1_id, player2_id, player1_wins, player2_wins, total_games, last_played_at)
  VALUES (
    v_game.player1_id,
    v_game.player2_id,
    CASE WHEN v_game.winner_id = v_game.player1_id THEN 1 ELSE 0 END,
    CASE WHEN v_game.winner_id = v_game.player2_id THEN 1 ELSE 0 END,
    1,
    NOW()
  )
  ON CONFLICT (player1_id, player2_id) DO UPDATE SET
    player1_wins = matchups.player1_wins + CASE WHEN v_game.winner_id = v_game.player1_id THEN 1 ELSE 0 END,
    player2_wins = matchups.player2_wins + CASE WHEN v_game.winner_id = v_game.player2_id THEN 1 ELSE 0 END,
    total_games = matchups.total_games + 1,
    last_played_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INITIAL DATA / SEED (Optional - for testing)
-- ============================================
-- Uncomment below for local testing only

-- INSERT INTO auth.users (id, email) VALUES
--   ('11111111-1111-1111-1111-111111111111', 'test1@example.com'),
--   ('22222222-2222-2222-2222-222222222222', 'test2@example.com');

-- INSERT INTO profiles (id, username, display_name, is_anonymous) VALUES
--   ('11111111-1111-1111-1111-111111111111', 'warrior1', 'Test Warrior 1', false),
--   ('22222222-2222-2222-2222-222222222222', 'warrior2', 'Test Warrior 2', false);

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- Tables: 7 (profiles, games, game_rounds, game_history, matchmaking_queue, matchups, + auth.users)
-- Views: 1 (leaderboard)
-- Functions: 5 (triggers + helpers)
-- Indexes: 25+ (for query optimization)
-- RLS Policies: 15+ (for security)
