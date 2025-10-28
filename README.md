# African Warriors - Strategic Card Battle Game

A dynamic, multi-dimensional card battle game featuring 16 unique characters representing different African nations. Built with React and featuring action-based strategic combat.

![African Warriors](https://img.shields.io/badge/Game-African%20Warriors-orange)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎮 Game Features

### 16 Unique African Warriors
Each character represents a different African nation with:
- **Unique character portraits** (AI-generated artwork)
- **Balanced stats** (Health: 190-220, Damage: 30-39)
- **Special abilities** (Counter, Dodge, Lifesteal, Berserk, Phoenix, etc.)
- **Cultural representation** from Nigeria, Ghana, Egypt, Kenya, South Africa, Ethiopia, Morocco, Tanzania, Uganda, Senegal, Algeria, Ivory Coast, Rwanda, Tunisia, Botswana, and Angola

### Action-Based Combat System
- **4 strategic actions per turn:**
  - ⚔️ **Attack** - Deal damage to opponent
  - 🛡️ **Block** - Reduce incoming damage by 70%
  - 💥 **Counter** - Take damage but deal 1.5x back
  - ❤️ **Heal** - Restore 20% of max health
- **16 unique action combinations** create diverse tactical outcomes
- **Turn-based gameplay** with simultaneous action execution

### Game Modes
1. **Quick Battle** - Strategic best of 5 rounds with action choices
2. **Tournament** - Face all 16 warriors in tactical battles
3. **Survival** - Endless strategic combat challenges

### Difficulty Levels
- **Easy** - Player deals 1.3x damage, AI deals 0.7x damage, AI makes 35% mistakes
- **Medium** - Balanced gameplay for fair competition
- **Hard** - AI deals 1.1x damage, player deals 0.9x damage, AI makes only 5% mistakes

### Multiplayer Support
- **vs AI** - Battle against smart AI with strategic actions
- **Local 2-Player** - Compete with friends on the same device
- **Online** - Coming soon!

### Economy & Progression
- **Earn coins** from victories (50 coins per win, multiplied by difficulty)
- **In-battle shop** with 4 purchasable items:
  - Health Boost (50 coins) - Restore 150 HP
  - Power-Up (80 coins) - Restore 350 HP + special effect
  - Damage Boost (60 coins) - +30% damage for 3 turns
  - Shield (70 coins) - Block 50% damage for 2 turns
- **Persistent coin system** across rounds for strategic resource management

### Best of 5 Rounds System
- **Win 3 rounds** to win the match
- **Health resets** at the start of each round
- **Coins persist** across rounds for strategic planning
- **Round celebrations** with winner announcements
- **Final score tracking** (e.g., 3-2 victory)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or compatible runtime
- pnpm, npm, or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/Sola-OIA/african-warriors-game.git
cd african-warriors-game

# Install dependencies
pnpm install
# or
npm install

# Start development server
pnpm run dev
# or
npm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
# Build the project
pnpm run build
# or
npm run build

# Preview production build
pnpm run preview
# or
npm run preview
```

## 📁 Project Structure

```
african-warriors-game/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── assets/        # Character images (16 PNG files)
│   │   ├── components/    # Reusable UI components (shadcn/ui)
│   │   ├── App.jsx        # Main game component
│   │   ├── gameData.js    # Character data and game constants
│   │   └── main.tsx       # Application entry point
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── server/                # Backend (if applicable)
├── README.md             # This file
└── package.json          # Root package configuration
```

## 🎨 Character List

| Character | Country | Health | Damage | Special Ability |
|-----------|---------|--------|--------|-----------------|
| Amara | Nigeria | 200 | 35 | Counter (20% chance) |
| Kofi | Ghana | 210 | 32 | Shield (absorbs 100 dmg) |
| Zara | Egypt | 195 | 38 | Lifesteal (30% heal) |
| Jabari | Kenya | 205 | 34 | Dodge (25% chance) |
| Naledi | South Africa | 215 | 31 | Regenerate (heal 5 HP/turn) |
| Desta | Ethiopia | 200 | 36 | Berserk (2x dmg at low HP) |
| Fatima | Morocco | 205 | 35 | Combo (extra attack) |
| Chike | Tanzania | 220 | 30 | Endurance (extra HP) |
| Imani | Uganda | 190 | 39 | First Strike (attack first) |
| Sekou | Senegal | 200 | 35 | Reflect (return 30% dmg) |
| Ayana | Algeria | 210 | 33 | Poison (DoT damage) |
| Kwame | Ivory Coast | 195 | 37 | Critical (higher crit chance) |
| Nia | Rwanda | 200 | 35 | Phoenix (revive once) |
| Tariq | Tunisia | 205 | 34 | Precision (ignore 20% def) |
| Makena | Botswana | 215 | 32 | Fortify (reduce dmg taken) |
| Olu | Angola | 200 | 36 | Rage (increase dmg over time) |

## 🎯 How to Play

1. **Choose your game mode** (Quick Battle, Tournament, or Survival)
2. **Select difficulty level** (Easy, Medium, or Hard)
3. **Pick player mode** (vs AI or Local 2-Player)
4. **Choose your warrior** (all 16 are balanced!)
5. **Battle:**
   - Select your action each turn (Attack, Block, Counter, or Heal)
   - Opponent selects simultaneously
   - Actions execute based on interaction matrix
   - Use shop to buy power-ups during battle
6. **Win rounds** - First to 3 round wins = Match victory!

## 🛠️ Technologies Used

- **React 18.3.1** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Lucide React** - Icons

## 🎮 Game Balance

The game is carefully balanced to ensure:
- ✅ **No character has unfair advantage** - all warriors have similar total power
- ✅ **Multiple viable strategies** - all 4 actions are useful
- ✅ **Skill-based gameplay** - predicting opponent actions matters
- ✅ **Resource management** - coin spending decisions are strategic
- ✅ **Round-based comebacks** - losing a round doesn't mean losing the match

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🌍 About

African Warriors celebrates the diversity and strength of African nations through engaging strategic gameplay. Each character represents the unique culture and heritage of their country.

## 📧 Contact

For questions or feedback, please open an issue on GitHub.

---

**Enjoy the game! May the best warrior win!** 🎮⚔️🌍
