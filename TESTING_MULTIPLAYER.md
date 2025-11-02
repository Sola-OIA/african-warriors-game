# Testing Online Multiplayer

## Important: Testing Requires Two Different Browser Sessions

Because online multiplayer uses authentication, you **cannot** test the join flow by opening the link in a new tab of the same browser. Both tabs would share the same authentication session, and you'd be trying to join your own game (which is blocked).

## Proper Testing Methods

### Option 1: Normal Window + Incognito Window (Recommended)

**Player 1 (Creator):**
1. Open http://localhost:3000/online in a normal Chrome window
2. Click "Continue as Guest"
3. Select a character (e.g., Amara)
4. Click "Continue" to create private game
5. Copy the game link (e.g., http://localhost:3000/join/ABC123)
6. Wait on the "Waiting for opponent..." screen

**Player 2 (Joiner):**
1. Open an **Incognito/Private window** (Ctrl+Shift+N in Chrome)
2. Paste the game link from step 5
3. Click "Continue as Guest" (this creates a DIFFERENT guest account)
4. Select a character (e.g., Kofi)
5. Click "Continue"
6. You should see "Joining game..." then the battle should start

**Both Players:**
- Battle screen should load showing both characters
- Select actions and test the battle flow

### Option 2: Two Different Browsers

1. Use Chrome for Player 1 and Firefox for Player 2
2. Follow the same steps as Option 1

### Option 3: Sign Out Between Tests

1. Create game as Guest A
2. Copy the game link
3. Click "Sign Out" button in the menu
4. Click the game link (or paste into address bar)
5. Sign in as a new guest (Guest B)
6. Join the game

## What You're Testing

### Game Creation Flow
- [x] Create private game as guest
- [x] Game code is generated
- [x] Game is created in database
- [x] Round 1 is initialized
- [x] Waiting screen shows shareable link

### Game Join Flow
- [ ] Open join link in different session
- [ ] Authenticate as different user
- [ ] Character selection works
- [ ] Join succeeds
- [ ] Both players see battle screen

### Battle Flow
- [ ] Both players see correct health bars
- [ ] Action selection works
- [ ] Both players can commit actions
- [ ] Actions reveal when both committed
- [ ] Damage/heal calculations work
- [ ] Round winner determined correctly
- [ ] Next round starts properly
- [ ] Game ends after 3 round wins

## Expected Behavior

### If You Try to Join Your Own Game (Wrong Test Method)
You'll see an error: **"Cannot join your own game"** with instructions on how to properly test with two different browser sessions.

### Successful Join
- Shows "Joining game..." briefly
- Redirects to battle screen
- Both players see their character and opponent
- Round 1 starts with full health

## Common Issues

### "Timeout reached, forcing loading to false"
This means the auth session took longer than 3 seconds to load. Refresh the page.

### "Waiting for round data..."
The game was created but round data isn't available yet. This usually resolves after 500ms. If it persists, check:
- Supabase connection
- Edge Functions are deployed
- Database migrations are applied

### Page Shows Blank Screen
Check browser console (F12) for errors. Look for:
- CORS errors (Edge Functions not configured)
- Auth errors (session expired)
- Network errors (Supabase unreachable)

### "Game not found"
The game code is incorrect or expired. Create a new game.

## Debugging

### Browser Console Logs

Open browser DevTools (F12) and look for these console.log messages:

**useAuth:**
- `[useAuth] Initializing auth...`
- `[useAuth] Session loaded: authenticated` or `no session`

**useGame:**
- `[useGame] Fetching game: <gameId>`
- `[useGame] Game fetched: <gameData>`
- `[useGame] Round fetched: <roundData>`

**JoinPrivateGame:**
- `[JoinPrivateGame] Joining game: <gameCode>`
- `[JoinPrivateGame] Response status: 200`
- `[JoinPrivateGame] Successfully joined, starting battle`

### Network Tab

Check the Network tab (F12 → Network) for:
- POST to `/functions/v1/create-private-game` → Should return 200
- POST to `/functions/v1/join-private-game` → Should return 200
- WebSocket connections for real-time updates

### Database Check

If you have access to Supabase dashboard:
1. Go to Table Editor → games
2. Find your game by private_link
3. Check that player1_id and player2_id are different UUIDs
4. Check that status is 'in_progress'

## Next Steps After Testing

Once both players can join and battle starts:
- Test action selection and commitment
- Test reveal and damage calculation
- Test round win/loss
- Test game completion
- Test disconnection handling

## Troubleshooting

### Still Having Issues?

1. **Clear browser cache and localStorage**
   - Chrome DevTools (F12) → Application → Clear storage
2. **Restart dev server**
   - Ctrl+C in terminal
   - `npm run dev`
3. **Check Edge Functions are deployed**
   - `npx --yes supabase@latest functions list`
4. **Check database status**
   - `npx --yes supabase@latest db status`
5. **Re-apply migrations**
   - `npx --yes supabase@latest db push`
