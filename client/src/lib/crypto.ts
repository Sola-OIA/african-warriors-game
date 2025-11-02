import CryptoJS from 'crypto-js'

/**
 * Generate a random salt for commit-reveal pattern
 * @returns Random 16-byte hex string
 */
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(16).toString()
}

/**
 * Hash an action with a salt using SHA-256 (commit phase)
 * @param action - The player's action ('attack', 'block', 'counter', 'heal')
 * @param salt - Random salt from generateSalt()
 * @returns SHA-256 hash as hex string
 */
export function hashAction(action: string, salt: string): string {
  return CryptoJS.SHA256(action + salt).toString()
}

/**
 * Verify that a revealed action matches the original commitment (reveal phase)
 * @param action - The revealed action
 * @param salt - The salt used during commit
 * @param commitment - The original hash commitment
 * @returns true if valid, false if cheating attempt
 */
export function verifyCommitment(
  action: string,
  salt: string,
  commitment: string
): boolean {
  return hashAction(action, salt) === commitment
}
