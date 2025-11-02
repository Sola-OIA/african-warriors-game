-- Add player stats columns to games table
-- These track current health and base damage for each player throughout the match

ALTER TABLE games
  ADD COLUMN player1_max_health INTEGER,
  ADD COLUMN player2_max_health INTEGER,
  ADD COLUMN player1_health INTEGER,
  ADD COLUMN player2_health INTEGER,
  ADD COLUMN player1_damage INTEGER,
  ADD COLUMN player2_damage INTEGER;

-- Add constraints
ALTER TABLE games
  ADD CONSTRAINT valid_player1_health CHECK (player1_health IS NULL OR (player1_health >= 0 AND player1_health <= player1_max_health)),
  ADD CONSTRAINT valid_player2_health CHECK (player2_health IS NULL OR (player2_health >= 0 AND player2_health <= player2_max_health)),
  ADD CONSTRAINT valid_player1_damage CHECK (player1_damage IS NULL OR player1_damage > 0),
  ADD CONSTRAINT valid_player2_damage CHECK (player2_damage IS NULL OR player2_damage > 0);
