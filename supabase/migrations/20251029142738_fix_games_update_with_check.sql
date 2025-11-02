-- Fix RLS policy for games table with proper WITH CHECK clause
-- The USING clause checks the OLD row (before update)
-- The WITH CHECK clause checks the NEW row (after update)

DROP POLICY IF EXISTS "Players can update their games" ON games;

CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (
    -- Can select/update if:
    auth.uid() = player1_id OR                          -- You're player 1
    auth.uid() = player2_id OR                          -- You're player 2 (already joined)
    (status = 'waiting' AND player2_id IS NULL)         -- Or it's a waiting game with no player 2
  )
  WITH CHECK (
    -- New row must satisfy:
    auth.uid() = player1_id OR                          -- You remain/become player 1
    auth.uid() = player2_id OR                          -- You remain/become player 2
    (player1_id IS NOT NULL AND player2_id IS NULL)     -- Or creating game (player 1 set, player 2 null)
  );
