-- Enable real-time replication for games and game_rounds tables
-- This allows real-time subscriptions to receive updates when rows change

-- Add games table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Add game_rounds table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;
