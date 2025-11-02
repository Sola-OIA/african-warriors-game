/**
 * Shared game logic for African Warriors
 * Used by both local game (App.jsx) and online multiplayer
 */

export type Action = 'attack' | 'block' | 'counter' | 'heal'

export interface BattleResult {
  player1Damage: number  // Damage taken by player 1
  player2Damage: number  // Damage taken by player 2
  player1Heal: number    // HP healed by player 1
  player2Heal: number    // HP healed by player 2
}

/**
 * Calculate battle outcome based on simultaneous actions
 * Uses the action matrix from the original game design
 *
 * @param action1 - Player 1's action
 * @param action2 - Player 2's action
 * @param player1Damage - Player 1's base damage stat
 * @param player2Damage - Player 2's base damage stat
 * @param player1MaxHealth - Player 1's max HP (for percentage healing)
 * @param player2MaxHealth - Player 2's max HP (for percentage healing)
 * @returns Battle result with damage/healing for both players
 */
export function calculateBattle(
  action1: Action,
  action2: Action,
  player1Damage: number,
  player2Damage: number,
  player1MaxHealth: number,
  player2MaxHealth: number
): BattleResult {
  // Action outcome matrix - matches the existing game logic in App.jsx
  // Format: { p1: damage to player1, p2: damage to player2, h1: heal for player1, h2: heal for player2 }

  const matrix: Record<Action, Record<Action, { p1: number; p2: number; h1: number; h2: number }>> = {
    attack: {
      attack: { p1: player2Damage, p2: player1Damage, h1: 0, h2: 0 }, // Both hit each other
      block: { p1: 0, p2: Math.floor(player1Damage * 0.3), h1: 0, h2: 0 },  // Block reduces damage to 30%
      counter: { p1: Math.floor(player2Damage * 1.5), p2: Math.floor(player1Damage * 0.5), h1: 0, h2: 0 },  // Counter deals 1.5x, attacker still lands 50%
      heal: { p1: 0, p2: player1Damage, h1: 0, h2: Math.floor(player2MaxHealth * 0.2) },  // Attack interrupts heal (20% heal)
    },
    block: {
      attack: { p1: Math.floor(player2Damage * 0.3), p2: 0, h1: 0, h2: 0 },  // Block reduces damage to 30%
      block: { p1: 0, p2: 0, h1: 10, h2: 10 },  // Both block and heal 10 HP
      counter: { p1: 0, p2: 20, h1: 0, h2: 0 },  // Counter takes recoil damage
      heal: { p1: 0, p2: 0, h1: 10, h2: Math.floor(player2MaxHealth * 0.2) },  // Block heals 10, Heal heals 20%
    },
    counter: {
      attack: { p1: Math.floor(player2Damage * 0.5), p2: Math.floor(player1Damage * 1.5), h1: 0, h2: 0 },  // Counter deals 1.5x, attacker still lands 50%
      block: { p1: 20, p2: 0, h1: 0, h2: 0 },  // Counter takes recoil damage
      counter: { p1: 30, p2: 30, h1: 0, h2: 0 },  // Both counters take recoil
      heal: { p1: 0, p2: 0, h1: 0, h2: Math.floor(player2MaxHealth * 0.2) },  // Heal succeeds (20% heal)
    },
    heal: {
      attack: { p1: player2Damage, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: 0 },  // Interrupted, 20% heal
      block: { p1: 0, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: 10 },  // Heal heals 20%, Block heals 10
      counter: { p1: 0, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: 0 },  // Heal succeeds (20% heal)
      heal: { p1: 0, p2: 0, h1: Math.floor(player1MaxHealth * 0.2), h2: Math.floor(player2MaxHealth * 0.2) },  // Both heal 20%
    },
  }

  const result = matrix[action1]?.[action2] || { p1: 0, p2: 0, h1: 0, h2: 0 }

  return {
    player1Damage: result.p1,
    player2Damage: result.p2,
    player1Heal: result.h1,
    player2Heal: result.h2,
  }
}

/**
 * Determine winner based on round wins (best of 5)
 * @param player1Wins - Number of rounds won by player 1
 * @param player2Wins - Number of rounds won by player 2
 * @returns 1 if player 1 won, 2 if player 2 won, null if match not over
 */
export function determineMatchWinner(
  player1Wins: number,
  player2Wins: number
): 1 | 2 | null {
  if (player1Wins >= 3) return 1
  if (player2Wins >= 3) return 2
  return null
}

/**
 * Check if a round is over (either player at 0 HP)
 * @param player1Health - Player 1's current HP
 * @param player2Health - Player 2's current HP
 * @returns Winner (1, 2, or null if round ongoing)
 */
export function checkRoundWinner(
  player1Health: number,
  player2Health: number
): 1 | 2 | null {
  if (player1Health <= 0 && player2Health <= 0) {
    // Both died - shouldn't happen but handle it
    return null
  }
  if (player1Health <= 0) return 2
  if (player2Health <= 0) return 1
  return null
}
