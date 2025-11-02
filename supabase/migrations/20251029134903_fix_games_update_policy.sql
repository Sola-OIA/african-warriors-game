-- Fix RLS policy for games table to allow joining
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Players can update their games" ON games;

-- Create new policy that allows:
-- 1. Player 1 to update their game
-- 2. Player 2 to update their game
-- 3. Anyone to join a waiting game (set themselves as player2)
CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (
    auth.uid() = player1_id OR
    auth.uid() = player2_id OR
    (status = 'waiting' AND player2_id IS NULL)
  );
