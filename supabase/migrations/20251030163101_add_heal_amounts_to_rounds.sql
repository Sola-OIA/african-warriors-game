-- Add heal amount columns to game_rounds table
-- These allow perfect reconstruction of battle results for idempotency

ALTER TABLE game_rounds
  ADD COLUMN player1_heal_amount INTEGER DEFAULT 0,
  ADD COLUMN player2_heal_amount INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN game_rounds.player1_heal_amount IS 'Amount of HP healed by player 1 in this turn';
COMMENT ON COLUMN game_rounds.player2_heal_amount IS 'Amount of HP healed by player 2 in this turn';
