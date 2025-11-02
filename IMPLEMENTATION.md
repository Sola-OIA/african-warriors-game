# Online Multiplayer Implementation Guide

**Project**: African Warriors Game
**Feature**: Online Multiplayer with Supabase (Free Tier)
**Pattern**: Commit-Reveal for Simultaneous Action Selection
**Date**: January 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Safety Rules for Claude Code](#safety-rules-for-claude-code)
3. [Architecture Decisions](#architecture-decisions)
4. [Implementation Phases](#implementation-phases)
5. [Database Schema](#database-schema)
6. [Edge Functions](#edge-functions)
7. [Frontend Integration](#frontend-integration)
8. [Testing Procedures](#testing-procedures)
9. [Free Tier Optimizations](#free-tier-optimizations)
10. [Rollback Procedures](#rollback-procedures)

---

## Overview

### What We're Building

Online multiplayer functionality for African Warriors with:
- **Private game links** - Share with friends, play as guest or registered user
- **Random matchmaking** - ELO-based matchmaking (requires registration)
- **Simultaneous action selection** - Commit-reveal pattern prevents cheating
- **Complete information hiding** - Neither player knows when opponent selected
- **30-second action timer** - Auto-select if AFK
- **Head-to-head stats** - Track wins/losses vs specific opponents
- **Global leaderboard** - Only for ranked matches (not private games)
- **Google OAuth** - Easy signup
- **Anonymous auth** - Play as guest without signup

### Why Supabase (Free Tier)

**Free Tier Limits:**
- 500MB database storage
- 2GB bandwidth/month
- 50,000 monthly active users
- 500,000 Edge Function invocations/month
- Projects pause after 1 week inactivity (easily resumed)

**Why it works for us:**
- PostgreSQL better for leaderboards than Firebase NoSQL
- Real-time subscriptions built-in
- Row-Level Security for data protection
- Native crypto support in Edge Functions (Deno)
- Fixed costs (vs Firebase's unpredictable pricing)
- Open-source with self-hosting option later

### Key Technical Concepts

**Commit-Reveal Pattern:**
```
1. COMMIT PHASE:
   Player selects action → hash(action + salt) → store hash in DB
   Opponent cannot reverse-engineer the hash

2. REVEAL PHASE:
   When both committed → both reveal actual actions
   Server validates: hash(revealed_action + salt) === stored_hash

3. CALCULATE PHASE:
   Server computes battle results using validated actions
```

**Complete Information Hiding:**
- Neither player knows if opponent selected
- Both see generic "⏳ Waiting for other player..."
- When both commit → immediately trigger reveals (don't wait for timer)
- Results appear simultaneously for both players

---

## Safety Rules for Claude Code

### 🚨 RULE 1: NEVER BREAK EXISTING FEATURES

**Before ANY change:**
- ✅ Test local 2-player mode works
- ✅ Test vs AI mode works
- ✅ Test character selection works
- ✅ Test special abilities work
- ✅ Test all 4 actions (Attack, Block, Counter, Heal)

**After EVERY change:**
- ✅ Re-test all existing features
- ✅ Use Chrome DevTools MCP to verify UI
- ✅ Check console for errors
- ✅ Verify no regressions

**Never:**
- ❌ Modify App.jsx without testing
- ❌ Change gameData.js without verifying characters
- ❌ Remove existing functionality
- ❌ Skip testing steps

### 🚨 RULE 2: TEST BEFORE PROCEEDING

**After each Edge Function:**
```bash
# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/commit-action' \
  --header 'Authorization: Bearer ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"gameId": "test-id", "roundNumber": 1, "actionCommit": "hash123", "salt": "salt123"}'
```

**After each React component:**
- Use Chrome DevTools MCP to navigate to component
- Take screenshot of working UI
- Verify network requests in DevTools Network tab
- Check for console errors
- Test user interactions (clicks, forms, etc.)

**After each database change:**
- Query tables in Supabase Studio (http://localhost:54323)
- Verify RLS policies work (try accessing data as different users)
- Check indexes exist
- Test foreign key constraints

### 🚨 RULE 3: INCREMENTAL IMPLEMENTATION

**One Feature at a Time:**
1. Create ONE Edge Function
2. Test it thoroughly
3. Mark todo as completed
4. Only then create the next one

**Never:**
- ❌ Create multiple untested Edge Functions
- ❌ Create all components at once
- ❌ Skip intermediate testing
- ❌ Batch changes without verification

### 🚨 RULE 4: USE STANDARD TECHNIQUES

**React Best Practices:**
- Use functional components (not class components)
- Use hooks (useState, useEffect, useMemo, useCallback)
- Follow existing code style in App.jsx
- Use TypeScript where possible (.tsx files)

**Supabase Best Practices:**
- Follow official Supabase docs exactly
- Use Row-Level Security (never bypass)
- Use Edge Functions for sensitive logic
- Use real-time subscriptions (not polling)

**Security Best Practices:**
- Never trust client-side validation
- Always validate in Edge Functions
- Use parameterized queries (SQL injection protection)
- Verify user authorization in every Edge Function

### 🚨 RULE 5: FREE TIER OPTIMIZATIONS

**Database:**
- Always use `SELECT` with specific columns (not `SELECT *`)
- Set up auto-cleanup for old data (>30 days)
- Use efficient indexes on frequently queried columns
- Archive completed games to reduce table size

**Edge Functions:**
- Batch operations where possible
- Use database triggers for simple tasks
- Cache frequently accessed data
- Monitor invocation count

**Bandwidth:**
- Use real-time subscriptions (not polling)
- Compress large responses
- Only send changed data (not full state)

---

## Architecture Decisions

### Backend: Supabase (PostgreSQL + Edge Functions)

**Why PostgreSQL over NoSQL:**
- Complex queries for leaderboards (ORDER BY elo_rating)
- Relational data (games → rounds → results)
- Head-to-head stats require JOINs
- Better for aggregations (SUM, COUNT, AVG)

**Why Edge Functions over Client-Side:**
- Commit-reveal validation must be server-side
- Prevent cheating (client can't fake results)
- Secure random matchmaking
- Server-authoritative game state

### Frontend: React 18 + Real-time Hooks

**State Management:**
- Local state with useState for UI
- Real-time subscriptions for game state
- Custom hooks for auth and game logic
- No Redux needed (real-time handles sync)

**Routing:**
- Continue using Wouter (existing)
- Add routes: /online, /join/:code, /auth/callback

---

## Implementation Phases

### Phase 1: Setup & Documentation ✓

**Tasks:**
1. ✅ Create IMPLEMENTATION.md (this file)
2. Install Supabase CLI locally
3. Initialize Supabase project
4. Start local Supabase with Docker
5. Configure environment variables

**Commands:**
```bash
# Install dependencies
pnpm add @supabase/supabase-js crypto-js
pnpm add -D supabase @types/crypto-js

# Initialize Supabase
pnpm supabase init

# Start local Supabase (requires Docker Desktop)
pnpm supabase start
```

**Expected Output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Testing:**
- [ ] Navigate to Studio URL (http://localhost:54323)
- [ ] Verify database is empty (no tables yet)
- [ ] Copy anon key and service_role key

**Environment Setup:**

Create `.env.local`:
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-from-above
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-above
VITE_APP_URL=http://localhost:3000
```

---

### Phase 2: Database Schema

**Tasks:**
1. Create migration file
2. Define 8 tables with RLS policies
3. Apply migration
4. Generate TypeScript types
5. Test in Supabase Studio

**Create Migration:**
```bash
pnpm supabase migration new initial_schema
```

This creates: `supabase/migrations/TIMESTAMP_initial_schema.sql`

**Tables to Create:**

1. **profiles** - User accounts (anonymous + registered)
2. **games** - Game sessions (private + matchmaking)
3. **game_rounds** - Round data with commit-reveal
4. **game_history** - Completed games archive
5. **matchmaking_queue** - Players searching for match
6. **matchups** - Head-to-head stats
7. **leaderboard** - Global rankings (view)
8. **rate_limits** - API rate limiting

**Apply Migration:**
```bash
pnpm supabase db reset
```

**Generate Types:**
```bash
pnpm supabase gen types typescript --local > client/src/lib/database.types.ts
```

**Testing:**
- [ ] Open Supabase Studio (http://localhost:54323)
- [ ] Verify all 8 tables exist
- [ ] Check RLS policies enabled
- [ ] Verify indexes created
- [ ] Test foreign key constraints

---

### Phase 3: Edge Functions

Create and test ONE function at a time.

#### 3.1 Edge Function: commit-action

**Purpose:** Store SHA-256 hash of player's action choice

**Create:**
```bash
pnpm supabase functions new commit-action
```

**Input:**
```json
{
  "gameId": "uuid",
  "roundNumber": 1,
  "actionCommit": "sha256-hash",
  "salt": "random-salt"
}
```

**Logic:**
1. Authenticate user
2. Verify user is player in this game
3. Store commitment in game_rounds table
4. Check if both players committed
5. If both committed → return { bothReady: true }

**Testing:**
```bash
# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/commit-action' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"gameId": "test-uuid", "roundNumber": 1, "actionCommit": "abc123", "salt": "xyz789"}'
```

**Checklist:**
- [ ] Function returns 200 for valid request
- [ ] Function returns 401 for unauthorized
- [ ] Function returns 403 if not player in game
- [ ] Database updated with commitment
- [ ] No errors in function logs

#### 3.2 Edge Function: reveal-action

**Purpose:** Validate and reveal player's action

**Input:**
```json
{
  "gameId": "uuid",
  "roundNumber": 1,
  "action": "attack"
}
```

**Logic:**
1. Authenticate user
2. Get stored commitment and salt
3. Compute hash(action + salt)
4. Verify computed hash === stored commitment
5. If valid → store revealed action
6. If invalid → return error (cheating attempt)

**Testing:**
- [ ] Valid action with correct salt → success
- [ ] Invalid action → 400 error
- [ ] Mismatched hash → 400 error (cheating detected)

#### 3.3 Edge Function: calculate-results

**Purpose:** Compute battle results server-side

**Input:**
```json
{
  "gameId": "uuid",
  "roundNumber": 1
}
```

**Logic:**
1. Verify both actions revealed
2. Get character stats from game
3. Use action matrix from gameData.js
4. Calculate damage/healing
5. Update health values
6. Determine round winner
7. Update game state

**Testing:**
- [ ] Attack vs Attack → both take damage
- [ ] Block vs Attack → blocker takes no damage
- [ ] Counter vs Attack → attacker takes 1.5x damage
- [ ] Heal vs Attack → healer takes damage, partial heal
- [ ] Results match existing local game logic

#### 3.4 Edge Function: create-private-game

**Purpose:** Generate shareable game link

**Input:**
```json
{
  "characterId": 1
}
```

**Output:**
```json
{
  "gameId": "uuid",
  "privateLink": "ABC123",
  "shareUrl": "http://localhost:3000/join/ABC123"
}
```

**Logic:**
1. Authenticate user
2. Generate random 6-char code (A-Z, 2-9, no confusing chars)
3. Ensure code is unique
4. Create game record
5. Create first round record
6. Return shareable link

**Testing:**
- [ ] Link generated successfully
- [ ] Code is 6 characters
- [ ] Code is unique (no duplicates)
- [ ] Game created with status 'waiting'
- [ ] First round initialized

#### 3.5 Edge Function: join-private-game

**Purpose:** Join game via link (guest or registered)

**Input:**
```json
{
  "privateLink": "ABC123",
  "characterId": 2
}
```

**Logic:**
1. Authenticate user (can be anonymous)
2. Find game by private link
3. Verify game is still waiting
4. Verify user is not player 1
5. Set player 2
6. Update game status to 'in_progress'
7. Start round timer

**Testing:**
- [ ] Guest can join
- [ ] Registered user can join
- [ ] Can't join own game
- [ ] Can't join started game
- [ ] Invalid link returns 404

#### 3.6 Edge Function: matchmaking

**Purpose:** Find opponent with similar ELO

**Input:**
```json
{
  "action": "join",
  "characterId": 1
}
```

**Logic:**
1. Authenticate user (must be registered, not anonymous)
2. Get player's ELO rating
3. Search queue for opponent within ±200 ELO
4. If found → create game, remove both from queue
5. If not found → add to queue
6. Return status: 'searching' or 'matched'

**Testing:**
- [ ] Join queue → returns 'searching'
- [ ] Two players join → returns 'matched'
- [ ] ELO matching works (within ±200)
- [ ] Anonymous users rejected
- [ ] Queue cleaned up after match

---

### Phase 4: Frontend Integration

#### 4.1 Create Shared Game Logic

**File:** `client/src/lib/gameLogic.ts`

**Purpose:** Extract battle calculation from App.jsx for reuse

**Functions to export:**
```typescript
export type Action = 'attack' | 'block' | 'counter' | 'heal'

export interface BattleResult {
  player1Damage: number
  player2Damage: number
  player1Heal: number
  player2Heal: number
}

export function calculateBattle(
  action1: Action,
  action2: Action,
  player1Damage: number,
  player2Damage: number
): BattleResult

export function applySpecialAbility(
  character: Character,
  damage: number,
  turnNumber: number
): number
```

**Testing:**
- [ ] Import works in App.jsx
- [ ] Existing local game still works
- [ ] Battle results match previous behavior
- [ ] No regressions in 2-player or vs AI mode

#### 4.2 Create Supabase Client

**File:** `client/src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

**Testing:**
- [ ] Client initializes without errors
- [ ] Environment variables loaded
- [ ] TypeScript types work

#### 4.3 Create Crypto Utilities

**File:** `client/src/lib/crypto.ts`

```typescript
import CryptoJS from 'crypto-js'

export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(16).toString()
}

export function hashAction(action: string, salt: string): string {
  return CryptoJS.SHA256(action + salt).toString()
}

export function verifyCommitment(
  action: string,
  salt: string,
  commitment: string
): boolean {
  return hashAction(action, salt) === commitment
}
```

**Testing:**
```typescript
const salt = generateSalt()
const hash = hashAction('attack', salt)
const valid = verifyCommitment('attack', salt, hash) // true
const invalid = verifyCommitment('block', salt, hash) // false
```

#### 4.4 Create Auth Hook

**File:** `client/src/hooks/useAuth.ts`

**Exports:**
```typescript
export function useAuth() {
  return {
    user: User | null
    session: Session | null
    loading: boolean
    signInWithGoogle: () => Promise<void>
    signInAnonymously: () => Promise<void>
    signOut: () => Promise<void>
  }
}
```

**Testing:**
- [ ] Hook loads without errors
- [ ] User state updates on auth changes
- [ ] Sign in with Google redirects correctly
- [ ] Anonymous sign in creates profile
- [ ] Sign out clears session

#### 4.5 Create Game Hook

**File:** `client/src/hooks/useGame.ts`

**Exports:**
```typescript
export function useGame(gameId: string | null) {
  return {
    game: Game | null
    currentRound: GameRound | null
    loading: boolean
    commitAction: (action: string, roundNumber: number) => Promise<void>
    revealAction: (action: string, roundNumber: number) => Promise<void>
  }
}
```

**Features:**
- Real-time subscription to game updates
- Real-time subscription to round updates
- Commit/reveal action helpers
- Auto-cleanup on unmount

**Testing:**
- [ ] Hook subscribes to real-time updates
- [ ] Game state updates when opponent acts
- [ ] commitAction calls Edge Function
- [ ] revealAction validates locally then calls Edge Function

---

### Phase 5: UI Components

#### 5.1 OnlineMultiplayer Component

**File:** `client/src/components/OnlineMultiplayer.tsx`

**Screens:**
1. **Auth Screen** (if not signed in)
   - Sign in with Google button
   - Play as Guest button

2. **Mode Selection**
   - Private Game (Share Link)
   - Random Matchmaking

3. **Private Game Flow**
   - Create game → show link with copy/WhatsApp/QR
   - Or join game → enter code

4. **Matchmaking Flow**
   - Select character → join queue
   - Show "Searching..." with spinner
   - When matched → navigate to battle

**Testing with Chrome DevTools MCP:**
- [ ] Take snapshot of auth screen
- [ ] Click "Sign in with Google" → verify redirect
- [ ] Click "Play as Guest" → verify anonymous auth
- [ ] Take snapshot of mode selection
- [ ] Click "Private Game" → verify link generation
- [ ] Copy link and join in incognito window
- [ ] Click "Matchmaking" → verify queue join

#### 5.2 OnlineBattle Component

**File:** `client/src/components/OnlineBattle.tsx`

**Features:**
- Display both players' characters
- Show health bars (real-time updates)
- Action selection buttons (Attack, Block, Counter, Heal)
- Timer countdown (30 seconds)
- Complete information hiding (no opponent status leak)
- Battle log with animations
- Round wins tracker (best of 5)

**States:**
1. **Waiting for Opponent** - Show "Waiting for opponent to join..."
2. **Action Selection** - Show 4 action buttons + timer
3. **Waiting State** - "⏳ Waiting for other player..." (no status leak!)
4. **Results** - Show both actions + damage + new health
5. **Round End** - Show round winner
6. **Match End** - Show overall winner + stats

**Testing:**
- [ ] Timer counts down correctly
- [ ] Selecting action disables buttons
- [ ] No information leak about opponent
- [ ] Results appear when both ready
- [ ] Health bars update smoothly
- [ ] Round progression works
- [ ] Match end shows winner

#### 5.3 Leaderboard Component

**File:** `client/src/components/Leaderboard.tsx`

**Features:**
- Top 100 players by ELO
- Display: rank, username, ELO, W/L ratio
- Only shows ranked matches (not private games)
- Real-time updates

**Testing:**
- [ ] Leaderboard loads
- [ ] Shows correct rankings
- [ ] Updates when player wins
- [ ] Private games don't affect ranking

---

## Database Schema

### Table: profiles

```sql
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
  elo_rating INTEGER DEFAULT 1200
);
```

**Indexes:**
- `idx_profiles_elo` on (elo_rating DESC) - for leaderboard
- `idx_profiles_username` on (username) - for lookups

**RLS Policies:**
- `SELECT`: Everyone can view profiles
- `UPDATE`: Users can only update their own profile
- `INSERT`: Users can only create their own profile

### Table: games

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_type TEXT CHECK (game_type IN ('private', 'matchmaking')),
  status TEXT CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),

  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  player1_character_id INTEGER,
  player2_character_id INTEGER,

  difficulty TEXT DEFAULT 'medium',
  max_rounds INTEGER DEFAULT 5,
  current_round INTEGER DEFAULT 1,

  player1_round_wins INTEGER DEFAULT 0,
  player2_round_wins INTEGER DEFAULT 0,

  winner_id UUID REFERENCES profiles(id),
  private_link TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

**Indexes:**
- `idx_games_status` on (status)
- `idx_games_private_link` on (private_link)
- `idx_games_players` on (player1_id, player2_id)

**RLS Policies:**
- `SELECT`: Players can view their own games, or waiting games
- `UPDATE`: Players can update their own games
- `INSERT`: Authenticated users can create games

### Table: game_rounds

```sql
CREATE TABLE game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  round_number INTEGER,

  -- Commit-Reveal Pattern
  player1_action_commit TEXT,
  player1_action TEXT,
  player1_salt TEXT,
  player1_committed_at TIMESTAMPTZ,
  player1_revealed_at TIMESTAMPTZ,

  player2_action_commit TEXT,
  player2_action TEXT,
  player2_salt TEXT,
  player2_committed_at TIMESTAMPTZ,
  player2_revealed_at TIMESTAMPTZ,

  -- Battle Results
  player1_health_before INTEGER,
  player2_health_before INTEGER,
  player1_health_after INTEGER,
  player2_health_after INTEGER,
  player1_damage_dealt INTEGER DEFAULT 0,
  player2_damage_dealt INTEGER DEFAULT 0,
  round_winner_id UUID REFERENCES profiles(id),

  battle_events JSONB,
  timer_started_at TIMESTAMPTZ DEFAULT NOW(),
  auto_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  UNIQUE(game_id, round_number)
);
```

**Indexes:**
- `idx_game_rounds_game` on (game_id, round_number)
- `idx_game_rounds_timer` on (timer_started_at) WHERE completed_at IS NULL

**RLS Policies:**
- `SELECT`: Players can view rounds from their games
- `INSERT`: Players can create rounds
- `UPDATE`: Players can update rounds (for commit/reveal)

### Table: matchmaking_queue

```sql
CREATE TABLE matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  character_id INTEGER NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);
```

**Indexes:**
- `idx_matchmaking_elo` on (elo_rating)
- `idx_matchmaking_created` on (created_at)

**Cleanup:**
- Auto-delete entries older than 5 minutes

---

## Testing Procedures

### Manual Testing Checklist

#### After Phase 1 (Setup)
- [ ] Supabase running: `docker ps` shows containers
- [ ] Studio accessible: http://localhost:54323
- [ ] API responds: `curl http://localhost:54321/rest/v1/`

#### After Phase 2 (Database)
- [ ] All tables visible in Studio
- [ ] RLS policies enabled
- [ ] Can insert test data
- [ ] Foreign keys enforced
- [ ] Indexes created

#### After Phase 3 (Edge Functions)
Test each function:
- [ ] commit-action responds
- [ ] reveal-action validates
- [ ] calculate-results computes correctly
- [ ] create-private-game generates link
- [ ] join-private-game works
- [ ] matchmaking finds opponents

#### After Phase 4 (Frontend Integration)
- [ ] Existing 2-player mode works
- [ ] Existing vs AI mode works
- [ ] Character selection unchanged
- [ ] Special abilities work
- [ ] Auth hook loads
- [ ] Game hook subscribes

#### After Phase 5 (UI Components)
- [ ] OnlineMultiplayer renders
- [ ] Can create private game
- [ ] Can join private game
- [ ] Can join matchmaking
- [ ] Battle UI displays
- [ ] Real-time updates work

### Chrome DevTools MCP Testing

After each component:

```javascript
// 1. Navigate to component
await mcp.chrome.navigate_page({ url: 'http://localhost:3000/online' })

// 2. Take snapshot
await mcp.chrome.take_snapshot()

// 3. Take screenshot
await mcp.chrome.take_screenshot({ filePath: 'screenshots/online-menu.png' })

// 4. Test interaction
await mcp.chrome.click({ uid: 'button-private-game' })

// 5. Check console
await mcp.chrome.list_console_messages()

// 6. Check network
await mcp.chrome.list_network_requests()
```

### End-to-End Testing

**Two Browser Windows:**

1. **Window 1 (Host)**
   - Create private game
   - Select character
   - Copy link
   - Wait for opponent

2. **Window 2 (Guest)**
   - Sign in anonymously
   - Join via link
   - Select character
   - Both see game start

3. **Both Windows**
   - Select actions (different actions)
   - Verify neither knows opponent's choice
   - Wait for results
   - Verify results match expected outcome
   - Play 5 rounds
   - Verify winner determined correctly

**Checklist:**
- [ ] Private game creation works
- [ ] Link sharing works
- [ ] Guest can join
- [ ] Actions are hidden
- [ ] Timer counts down
- [ ] Results appear when both ready
- [ ] Health updates correctly
- [ ] Round progression works
- [ ] Match ends after 5 rounds
- [ ] Stats updated

---

## Free Tier Optimizations

### Database Cleanup

**Auto-delete old data:**

```sql
-- Delete rounds older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_rounds()
RETURNS void AS $$
BEGIN
  DELETE FROM game_rounds
  WHERE completed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule (run manually or with cron)
SELECT cron.schedule('cleanup-rounds', '0 0 * * *', 'SELECT cleanup_old_rounds()');
```

**Archive completed games:**

```sql
-- Move completed games to archive table
INSERT INTO game_history
SELECT * FROM games WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days';

DELETE FROM games WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days';
```

### Efficient Queries

**Always specify columns:**
```typescript
// ❌ Bad
const { data } = await supabase.from('games').select('*')

// ✅ Good
const { data } = await supabase.from('games').select('id, status, player1_id, player2_id')
```

**Use indexes:**
```sql
-- Create indexes on frequently queried columns
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_profiles_elo ON profiles(elo_rating DESC);
```

**Limit results:**
```typescript
// Leaderboard: only fetch top 100
const { data } = await supabase
  .from('profiles')
  .select('username, elo_rating')
  .order('elo_rating', { ascending: false })
  .limit(100)
```

### Edge Function Optimization

**Use database triggers instead of functions:**

```sql
-- Auto-update game status when both players join
CREATE OR REPLACE FUNCTION update_game_status()
RETURNS TRIGGER AS $$
BEGIN
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
```

**Batch operations:**
```typescript
// ❌ Bad: Multiple function calls
await supabase.functions.invoke('commit-action', { ... })
await supabase.functions.invoke('check-both-ready', { ... })

// ✅ Good: Single function does both
await supabase.functions.invoke('commit-action', { ... })
// Function checks both ready internally
```

### Monitoring

**Track usage:**
- Dashboard: https://app.supabase.com/project/_/settings/billing
- Monitor: Database size, Bandwidth, Edge Function invocations
- Set alerts: Email when approaching limits

---

## Rollback Procedures

### If Something Breaks

**Rollback database:**
```bash
# List migrations
pnpm supabase migration list

# Rollback last migration
pnpm supabase db reset --version PREVIOUS_VERSION
```

**Rollback Edge Functions:**
```bash
# Delete deployed function
pnpm supabase functions delete commit-action

# Re-deploy previous version
git checkout HEAD~1 supabase/functions/commit-action/index.ts
pnpm supabase functions deploy commit-action
```

**Rollback frontend:**
```bash
# Revert changes
git diff client/src/

# Restore file
git checkout HEAD -- client/src/components/OnlineMultiplayer.tsx
```

### Emergency Shutdown

**Disable online multiplayer:**

```typescript
// In App.jsx
const ONLINE_ENABLED = false // Set to false to disable

if (ONLINE_ENABLED) {
  // Show online multiplayer button
}
```

**Or remove route:**
```typescript
// In App.tsx
// Comment out online route
// <Route path="/online" component={OnlineMultiplayer} />
```

---

## Troubleshooting

### Common Issues

**1. Supabase won't start**
```bash
# Check Docker is running
docker ps

# Restart Docker Desktop
# Then retry
pnpm supabase start
```

**2. Edge Function errors**
```bash
# Check logs
pnpm supabase functions serve --debug

# Or view in Studio
# Logs tab shows function invocations
```

**3. Real-time not updating**
```typescript
// Check subscription status
const channel = supabase.channel('game:123')
console.log('Channel state:', channel.state) // Should be 'joined'

// Unsubscribe and resubscribe
channel.unsubscribe()
// Then resubscribe
```

**4. RLS blocks legitimate access**
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'games';

-- Test policy
SET request.jwt.claim.sub = 'user-id';
SELECT * FROM games; -- Should show user's games
```

**5. Free tier limits reached**
- Database full: Run cleanup script
- Bandwidth exceeded: Optimize queries
- Functions limit: Use triggers instead

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Supabase running locally
- [ ] Studio accessible
- [ ] Environment variables configured

### Phase 2 Complete When:
- [ ] All tables created
- [ ] RLS policies working
- [ ] TypeScript types generated

### Phase 3 Complete When:
- [ ] All 6 Edge Functions deployed
- [ ] Each function tested individually
- [ ] No errors in logs

### Phase 4 Complete When:
- [ ] Existing game modes still work
- [ ] Shared game logic extracted
- [ ] Hooks working

### Phase 5 Complete When:
- [ ] Can create and join private games
- [ ] Can find matches via matchmaking
- [ ] Complete game flow works end-to-end

### Project Complete When:
- [ ] All tests pass
- [ ] Chrome DevTools testing complete
- [ ] No console errors
- [ ] No regressions in existing features
- [ ] Documentation updated
- [ ] Ready for production deployment

---

## Next Steps After Implementation

1. **Production Deployment**
   - Create Supabase project at supabase.com
   - Deploy Edge Functions to production
   - Configure Google OAuth for production domain
   - Update environment variables in hosting platform

2. **Monitoring Setup**
   - Set up Sentry for error tracking
   - Configure analytics for online games
   - Monitor Supabase usage dashboard

3. **User Testing**
   - Invite beta testers
   - Gather feedback
   - Fix bugs
   - Iterate

4. **Future Enhancements**
   - Tournament mode
   - Replays
   - Spectator mode
   - In-game chat
   - Seasons and ranks

---

## Contact & Support

**Supabase Docs:** https://supabase.com/docs
**Discord:** https://discord.supabase.com
**GitHub Issues:** [Repository]/issues

**Implementation Questions:**
- Check CLAUDE.md for project context
- Check this file for implementation details
- Test with Chrome DevTools MCP at each step
- Never skip testing steps

---

**Last Updated:** January 28, 2025
**Status:** Phase 1 in progress
**Next Milestone:** Database schema creation
