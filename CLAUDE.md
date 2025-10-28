# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

African Warriors is a strategic turn-based card battle game featuring 16 unique characters representing different African nations. Built as a single-page React application with action-based combat mechanics, shop system, and multiple game modes.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (Vite dev server on port 3000)
pnpm run dev

# Type checking (TypeScript)
pnpm run check

# Build for production (builds both client and server)
pnpm run build

# Format code with Prettier
pnpm run format

# Start production server
pnpm run start

# Preview production build
pnpm run preview
```

## Architecture

### Technology Stack
- **Frontend**: React 18 with mixed JSX/TSX files
- **Build Tool**: Vite 7 with HMR
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **Routing**: Wouter (lightweight client-side routing)
- **Server**: Express (serves static files in production)
- **Package Manager**: pnpm with patches

### Project Structure
```
african-warriors-game/
├── client/src/
│   ├── App.jsx           # Main game logic (1500+ lines, action-based combat)
│   ├── App.tsx           # Router setup with wouter
│   ├── gameData.js       # Character stats, shop items, constants
│   ├── components/ui/    # shadcn/ui components (both .tsx and .jsx)
│   ├── pages/            # Home and NotFound pages
│   ├── contexts/         # ThemeContext for light/dark mode
│   └── assets/           # 16 character PNG images
├── server/
│   └── index.ts          # Express server for production
└── vite.config.ts        # Vite configuration
```

### Key Files
- **client/src/App.jsx**: Core game implementation with all battle mechanics, action system, round logic, shop, and AI
- **client/src/gameData.js**: Character data (16 warriors with balanced stats), shop items, difficulty settings, battle events
- **client/src/App.tsx**: Application shell with routing and theme provider

## Game Architecture

### State Management
All game state is managed with React useState hooks in App.jsx. Key states include:
- Game flow: `gameState` ('menu', 'difficulty', 'characterSelect', 'battle', 'gameOver')
- Battle mechanics: `player`, `opponent`, `playerAction`, `opponentAction`
- Round system: `currentRound`, `playerRoundWins`, `opponentRoundWins` (best of 5)
- Economy: `coins`, `player2Coins`
- Effects: `activeEffects`, `phoenixUsed`, `playerShield`, `opponentShield`

### Action-Based Combat System
The game uses a simultaneous action selection system:
1. **Four actions**: Attack, Block, Counter, Heal
2. **Action matrix**: 16 possible combinations determine outcomes
3. **Turn flow**: Both players select actions → Actions resolve simultaneously → Results displayed
4. **Implementation**: `handlePlayerAction()` and `selectAIAction()` functions coordinate action selection and resolution

### Character Balance
All 16 characters have balanced stats (total power ~235):
- Health: 190-220 HP
- Damage: 30-39 per attack
- Special abilities: counter, shield, lifesteal, dodge, regenerate, berserk, combo, endurance, flow, rhythm, mirage, agility, phoenix, fury, reflect, growth

### Round System
- Best of 5 rounds (first to 3 wins)
- Health resets each round, but coins persist
- Victory/defeat handled in `checkRoundEnd()` and `endMatch()`

## Important Patterns

### Image Positioning
Character images use `object-position: center 20%` to focus on faces rather than full body. This is critical for portrait display:
```jsx
<img style={{ objectPosition: 'center 20%' }} />
```

### Dual File Types
The codebase has both .jsx and .tsx versions of many files (especially in components/ui/). The .tsx files are the canonical source. When editing UI components, prefer TypeScript versions.

### Path Aliases
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Difficulty Modifiers
Applied in battle calculations (see `DIFFICULTY_SETTINGS` in gameData.js):
- Easy: Player 1.3x damage, AI 0.7x damage, 35% AI mistakes
- Medium: Balanced
- Hard: Player 0.9x damage, AI 1.1x damage, 5% AI mistakes

## Common Tasks

### Adding a New Character
1. Add character image to `client/src/assets/`
2. Import image in `gameData.js`
3. Add character object to `characters` array with balanced stats (total ~235)
4. Implement special ability logic in battle functions if needed

### Modifying Combat Mechanics
Battle logic is in `App.jsx` in these functions:
- `handlePlayerAction()`: Main action resolution
- `selectAIAction()`: AI decision making
- `calculateActionOutcome()`: Determines damage/effects based on action pairs
- `checkRoundEnd()`: Round victory conditions

### Adjusting Game Balance
Constants in `gameData.js`:
- `DIFFICULTY_SETTINGS`: Modifiers per difficulty
- `SHOP_ITEMS`: Cost and effects of purchasable items
- `CRITICAL_HIT_CHANCE`, `DAMAGE_VARIANCE`: Combat randomness
- Character stats: health/damage/specialAbility per warrior

### Working with the Shop System
Shop implementation in `App.jsx`:
- Items persist across rounds but within same match
- Purchase handlers: `buyPowerUp()`, `buyHealthBoost()`, etc.
- Temporary effects tracked in `activeEffects` state

## Testing Notes

- No test suite currently exists
- Manual testing workflow: Start dev server → Test game modes (Quick/Tournament/Survival) → Test each difficulty → Verify round system works correctly
- Key areas to test: Action combinations, round transitions, coin persistence, special abilities, AI behavior

## Build Process

The build creates two outputs:
1. Client build: `vite build` → `dist/public/` (static assets)
2. Server build: `esbuild server/index.ts` → `dist/index.js` (Node server)

Production server serves static files from `dist/public/` and handles client-side routing fallback.
