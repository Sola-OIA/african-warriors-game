-- Add round ready flags to game_rounds table
-- These flags coordinate round transitions so both players must click "Continue"
-- before the next round starts, preventing desynchronization

ALTER TABLE game_rounds
  ADD COLUMN player1_ready_for_next_round BOOLEAN DEFAULT FALSE,
  ADD COLUMN player2_ready_for_next_round BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN game_rounds.player1_ready_for_next_round IS 'Set to TRUE when player 1 clicks Continue after round ends';
COMMENT ON COLUMN game_rounds.player2_ready_for_next_round IS 'Set to TRUE when player 2 clicks Continue after round ends';
