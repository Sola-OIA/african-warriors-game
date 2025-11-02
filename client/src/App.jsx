import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Sword, Heart, Zap, Trophy, Coins, Sparkles, Shield, Users, Target, TrendingUp, Star, Gift, Flame, Activity, Crown, Swords } from 'lucide-react';
import { characters, POWER_UP_COST, POWER_UP_HEAL, HEALTH_BOOST_COST, HEALTH_BOOST_HEAL, WIN_REWARD, CRITICAL_HIT_CHANCE, CRITICAL_HIT_MULTIPLIER, DAMAGE_VARIANCE, STARTING_COINS, DIFFICULTY_SETTINGS, SHOP_ITEMS, BATTLE_EVENTS } from './gameData';
import './App.css';

// Special ability descriptions for character selection
const ABILITY_DESCRIPTIONS = {
  lifesteal: "Heal for 15% of damage dealt",
  growth: "Gain +5 damage per turn (max +50)",
  dodge: "20% chance to completely avoid attacks",
  shield: "25% chance to block 50% of damage",
  mirage: "15% chance for opponent to miss",
  flow: "Damage varies more wildly (±20%)",
  rhythm: "Every 3rd attack is a guaranteed critical",
  agility: "First attack each round is critical",
  berserk: "Damage increases as health decreases",
  combo: "15% chance for double damage",
  counter: "20% chance to return 30% of damage taken",
  reflect: "Reflect 10% of all damage taken",
  phoenix: "Revive once with 50% health",
  regenerate: "Heal 10 HP per turn",
  fury: "Critical hit damage increased by 50%",
  endurance: "Take 10% less damage from all sources"
};

function App() {
  const [gameState, setGameState] = useState('menu');
  const [difficulty, setDifficulty] = useState('medium');
  const [playerMode, setPlayerMode] = useState('single');
  const [player, setPlayer] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [coins, setCoins] = useState(STARTING_COINS);
  const [player2Coins, setPlayer2Coins] = useState(STARTING_COINS);
  const [battleLog, setBattleLog] = useState([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [gameMode, setGameMode] = useState('quick');
  const [tournamentProgress, setTournamentProgress] = useState(0);
  const [survivalStreak, setSurvivalStreak] = useState(0);
  const [animatingDamage, setAnimatingDamage] = useState(null);
  const [turnCount, setTurnCount] = useState(0);
  const [activeEffects, setActiveEffects] = useState({ player: {}, opponent: {} });
  const [phoenixUsed, setPhoenixUsed] = useState({ player: false, opponent: false });
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Round-based system
  const [currentRound, setCurrentRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(5);
  const [playerRoundWins, setPlayerRoundWins] = useState(0);
  const [opponentRoundWins, setOpponentRoundWins] = useState(0);
  const [roundHistory, setRoundHistory] = useState([]);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [lastRoundWinner, setLastRoundWinner] = useState(null);
  
  // Shield system
  const [playerShield, setPlayerShield] = useState(0);
  const [opponentShield, setOpponentShield] = useState(0);
  
  // NEW: Action selection system
  const [playerAction, setPlayerAction] = useState(null); // 'attack', 'block', 'counter', 'heal'
  const [opponentAction, setOpponentAction] = useState(null);
  const [waitingForActions, setWaitingForActions] = useState(false);
  const [roundInProgress, setRoundInProgress] = useState(false);

  // Special ability tracking state
  const [attackCounters, setAttackCounters] = useState({ player: 0, opponent: 0 }); // For Rhythm ability
  const [damageModifiers, setDamageModifiers] = useState({ player: 0, opponent: 0 }); // For Growth ability
  const [firstAttackUsed, setFirstAttackUsed] = useState({ player: false, opponent: false }); // For Agility ability

  const startGame = (mode) => {
    setGameMode(mode);
    setGameState('playerMode');
    setBattleLog([]);
    if (mode === 'tournament') {
      setTournamentProgress(0);
    }
    if (mode === 'survival') {
      setSurvivalStreak(0);
    }
  };

  const selectDifficulty = (diff) => {
    setDifficulty(diff);
    setGameState('characterSelect');
  };

  const selectPlayerMode = (mode) => {
    setPlayerMode(mode);
    if (mode === 'single') {
      // vs AI needs difficulty selection
      setGameState('difficulty');
    } else {
      // 2-player and online use balanced settings (no difficulty modifiers)
      setDifficulty('medium');
      setGameState('characterSelect');
    }
  };

  const selectCharacter = (character) => {
    if (playerMode === 'local2p') {
      if (!player) {
        const playerChar = { ...character, health: character.maxHealth };
        setPlayer(playerChar);
        setBattleLog([`Player 1 selected ${character.name}! Player 2, choose your warrior...`]);
      } else {
        const player2Char = { ...character, health: character.maxHealth };
        setPlayer2(player2Char);
        setOpponent(player2Char);
        startBattle(player, player2Char);
      }
    } else {
      const playerChar = { ...character, health: character.maxHealth };
      setPlayer(playerChar);
      
      const availableOpponents = characters.filter(c => c.id !== character.id);
      const randomOpponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
      const opponentChar = { ...randomOpponent, health: randomOpponent.maxHealth };
      setOpponent(opponentChar);
      
      startBattle(playerChar, opponentChar);
    }
  };

  const startBattle = (p1, p2) => {
    setGameState('battle');
    setIsPlayerTurn(true);
    setTurnCount(0);
    setCurrentRound(1);
    setPlayerRoundWins(0);
    setOpponentRoundWins(0);
    setRoundHistory([]);
    setPlayerShield(0);
    setOpponentShield(0);
    setRoundInProgress(true);
    setBattleLog([
      `⚔️ BATTLE START! Best of 5 rounds!`,
      `Round 1: ${p1.name} vs ${p2.name}!`,
      `💡 Choose your action each turn: Attack, Block, Counter, or Heal!`
    ]);
    setPhoenixUsed({ player: false, opponent: false });
    setActiveEffects({ player: {}, opponent: {} });

    // Initialize special ability tracking
    setAttackCounters({ player: 0, opponent: 0 });
    setDamageModifiers({ player: 0, opponent: 0 });
    setFirstAttackUsed({ player: false, opponent: false });

    setPlayerAction(null);
    setOpponentAction(null);
    setWaitingForActions(true);
  };

  const startNewRound = () => {
    const newRound = currentRound + 1;
    setCurrentRound(newRound);
    setTurnCount(0);
    setPlayerShield(0);
    setOpponentShield(0);
    
    setPlayer(p => ({ ...p, health: p.maxHealth }));
    setOpponent(o => ({ ...o, health: o.maxHealth }));
    
    setActiveEffects({ player: {}, opponent: {} });
    setPhoenixUsed({ player: false, opponent: false });

    // Reset special ability tracking per round
    setAttackCounters({ player: 0, opponent: 0 });
    setDamageModifiers({ player: 0, opponent: 0 });
    setFirstAttackUsed({ player: false, opponent: false });

    setBattleLog(prev => [...prev, `\n🔄 ROUND ${newRound} BEGINS!`, `${player.name} vs ${opponent.name}`, `Choose your actions!`]);
    setShowRoundResult(false);
    setIsPlayerTurn(true);
    setPlayerAction(null);
    setOpponentAction(null);
    setWaitingForActions(true);
    setRoundInProgress(true);
  };

  // AI selects action
  const selectAIAction = () => {
    if (playerMode !== 'single') return;
    
    const diffSettings = DIFFICULTY_SETTINGS[difficulty];
    
    // AI makes mistakes
    if (Math.random() < diffSettings.aiMistakeChance) {
      const actions = ['attack', 'block', 'counter', 'heal'];
      return actions[Math.floor(Math.random() * actions.length)];
    }
    
    // Smart AI decision making
    const healthPercent = opponent.health / opponent.maxHealth;
    
    if (healthPercent < 0.3) {
      // Low health - likely to heal or block
      return Math.random() < 0.6 ? 'heal' : 'block';
    } else if (healthPercent < 0.6) {
      // Medium health - balanced approach
      const rand = Math.random();
      if (rand < 0.4) return 'attack';
      if (rand < 0.7) return 'block';
      return 'counter';
    } else {
      // High health - aggressive
      const rand = Math.random();
      if (rand < 0.6) return 'attack';
      if (rand < 0.8) return 'counter';
      return 'block';
    }
  };

  // Player selects action
  const selectAction = (action) => {
    if (!waitingForActions) return;
    if (!roundInProgress) return;
    
    setPlayerAction(action);
    setWaitingForActions(false);
    setBattleLog(prev => [...prev, `🎯 ${player.name} chose ${action.toUpperCase()}!`]);
    
    // AI selects action
    if (playerMode === 'single') {
      const aiAction = selectAIAction();
      setOpponentAction(aiAction);
      setBattleLog(prev => [...prev, `🤖 ${opponent.name} chose ${aiAction.toUpperCase()}!`]);
      
      // Execute both actions
      setTimeout(() => {
        executeActions(action, aiAction);
      }, 1000);
    } else {
      // In 2-player mode, wait for second player
      setBattleLog(prev => [...prev, `⏳ Waiting for ${opponent.name} to choose...`]);
    }
  };

  // Player 2 selects action (2-player mode)
  const selectAction2 = (action) => {
    if (waitingForActions) return;
    if (!playerAction) return;
    if (!roundInProgress) return;
    
    setOpponentAction(action);
    setBattleLog(prev => [...prev, `🎯 ${opponent.name} chose ${action.toUpperCase()}!`]);
    
    // Execute both actions
    setTimeout(() => {
      executeActions(playerAction, action);
    }, 1000);
  };

  // Execute both players' actions simultaneously
  const executeActions = (p1Action, p2Action) => {
    
    let p1Damage = 0;
    let p2Damage = 0;
    let p1Heal = 0;
    let p2Heal = 0;
    let messages = [];
    
    // Calculate base damages
    const p1BaseDamage = calculateBaseDamage(player, true);
    const p2BaseDamage = calculateBaseDamage(opponent, false);
    
    // Action interactions
    if (p1Action === 'attack' && p2Action === 'attack') {
      // Both attack - both take damage
      const p1Result = applyDamage(p2BaseDamage, playerShield, player);
      const p2Result = applyDamage(p1BaseDamage, opponentShield, opponent);
      p1Damage = p1Result.damage;
      p2Damage = p2Result.damage;

      if (p1Result.dodged) messages.push(`🌪️ ${player.name} dodges the attack!`);
      else if (p1Result.miraged) messages.push(`✨ ${opponent.name}'s attack misses due to ${player.name}'s mirage!`);
      else if (p1Result.shieldAbility) messages.push(`🛡️ ${player.name}'s shield ability blocks half the damage!`);

      if (p2Result.dodged) messages.push(`🌪️ ${opponent.name} dodges the attack!`);
      else if (p2Result.miraged) messages.push(`✨ ${player.name}'s attack misses due to ${opponent.name}'s mirage!`);
      else if (p2Result.shieldAbility) messages.push(`🛡️ ${opponent.name}'s shield ability blocks half the damage!`);

      messages.push(`⚔️ Both warriors attack! ${player.name} deals ${p2Damage} damage, ${opponent.name} deals ${p1Damage} damage!`);

    } else if (p1Action === 'attack' && p2Action === 'block') {
      // P1 attacks, P2 blocks - reduced damage
      const p2Result = applyDamage(p1BaseDamage, opponentShield, opponent);
      p2Damage = Math.floor(p2Result.damage * 0.3);

      if (p2Result.dodged) messages.push(`🌪️ ${opponent.name} dodges the attack!`);
      else if (p2Result.miraged) messages.push(`✨ ${player.name}'s attack misses due to ${opponent.name}'s mirage!`);
      else if (p2Result.shieldAbility) messages.push(`🛡️ ${opponent.name}'s shield ability blocks additional damage!`);

      messages.push(`🛡️ ${opponent.name} blocks! Only ${p2Damage} damage taken!`);

    } else if (p1Action === 'attack' && p2Action === 'counter') {
      // P1 attacks, P2 counters - P2 takes damage but deals 1.5x back
      const p2Result = applyDamage(p1BaseDamage, opponentShield, opponent);
      const p1Result = applyDamage(p2BaseDamage, playerShield, player);
      p2Damage = p2Result.damage;
      p1Damage = Math.floor(p1Result.damage * 1.5);

      if (p2Result.dodged) messages.push(`🌪️ ${opponent.name} dodges the attack!`);
      else if (p2Result.miraged) messages.push(`✨ ${player.name}'s attack misses!`);
      else if (p2Result.shieldAbility) messages.push(`🛡️ ${opponent.name}'s shield ability activates!`);

      if (p1Result.dodged) messages.push(`🌪️ ${player.name} dodges the counter!`);
      else if (p1Result.miraged) messages.push(`✨ ${opponent.name}'s counter misses!`);

      messages.push(`💥 ${opponent.name} counters! Takes ${p2Damage} but deals ${p1Damage} back!`);

    } else if (p1Action === 'attack' && p2Action === 'heal') {
      // P1 attacks, P2 heals - P2 takes damage but heals
      const p2Result = applyDamage(p1BaseDamage, opponentShield, opponent);
      p2Damage = p2Result.damage;
      p2Heal = Math.floor(opponent.maxHealth * 0.2);

      if (p2Result.dodged) messages.push(`🌪️ ${opponent.name} dodges while healing!`);
      else if (p2Result.miraged) messages.push(`✨ ${player.name}'s attack misses!`);
      else if (p2Result.shieldAbility) messages.push(`🛡️ ${opponent.name}'s shield ability activates!`);

      messages.push(`❤️ ${opponent.name} heals for ${p2Heal} but takes ${p2Damage} damage!`);

    } else if (p1Action === 'block' && p2Action === 'attack') {
      // P1 blocks, P2 attacks - reduced damage
      const p1Result = applyDamage(p2BaseDamage, playerShield, player);
      p1Damage = Math.floor(p1Result.damage * 0.3);

      if (p1Result.dodged) messages.push(`🌪️ ${player.name} dodges the attack!`);
      else if (p1Result.miraged) messages.push(`✨ ${opponent.name}'s attack misses!`);
      else if (p1Result.shieldAbility) messages.push(`🛡️ ${player.name}'s shield ability activates!`);

      messages.push(`🛡️ ${player.name} blocks! Only ${p1Damage} damage taken!`);
      
    } else if (p1Action === 'block' && p2Action === 'block') {
      // Both block - no damage, both heal small amount
      p1Heal = 10;
      p2Heal = 10;
      messages.push(`🛡️ Both warriors block and recover 10 HP!`);
      
    } else if (p1Action === 'block' && p2Action === 'counter') {
      // P1 blocks, P2 counters - P2 takes small damage from failed counter
      p2Damage = 20;
      messages.push(`🛡️ ${player.name} blocks ${opponent.name}'s counter! ${opponent.name} takes 20 recoil damage!`);
      
    } else if (p1Action === 'block' && p2Action === 'heal') {
      // Both defensive - both heal
      p1Heal = 10;
      p2Heal = Math.floor(opponent.maxHealth * 0.2);
      messages.push(`💚 Both warriors take defensive stance and heal!`);
      
    } else if (p1Action === 'counter' && p2Action === 'attack') {
      // P1 counters, P2 attacks - P1 takes damage but deals 1.5x back
      const p1Result = applyDamage(p2BaseDamage, playerShield, player);
      const p2Result = applyDamage(p1BaseDamage, opponentShield, opponent);
      p1Damage = p1Result.damage;
      p2Damage = Math.floor(p2Result.damage * 1.5);

      if (p1Result.dodged) messages.push(`🌪️ ${player.name} dodges the attack!`);
      else if (p1Result.miraged) messages.push(`✨ ${opponent.name}'s attack misses!`);

      if (p2Result.dodged) messages.push(`🌪️ ${opponent.name} dodges the counter!`);
      else if (p2Result.miraged) messages.push(`✨ ${player.name}'s counter misses!`);
      else if (p2Result.shieldAbility) messages.push(`🛡️ ${opponent.name}'s shield ability activates!`);

      messages.push(`💥 ${player.name} counters! Takes ${p1Damage} but deals ${p2Damage} back!`);
      
    } else if (p1Action === 'counter' && p2Action === 'block') {
      // P1 counters, P2 blocks - P1 takes small damage from failed counter
      p1Damage = 20;
      messages.push(`🛡️ ${opponent.name} blocks ${player.name}'s counter! ${player.name} takes 20 recoil damage!`);
      
    } else if (p1Action === 'counter' && p2Action === 'counter') {
      // Both counter - both take recoil damage
      p1Damage = 30;
      p2Damage = 30;
      messages.push(`💥 Both warriors counter each other! Both take 30 recoil damage!`);
      
    } else if (p1Action === 'counter' && p2Action === 'heal') {
      // P1 counters, P2 heals - P2 heals safely
      p2Heal = Math.floor(opponent.maxHealth * 0.2);
      messages.push(`❤️ ${opponent.name} heals safely for ${p2Heal} HP!`);
      
    } else if (p1Action === 'heal' && p2Action === 'attack') {
      // P1 heals, P2 attacks - P1 takes damage but heals
      const p1Result = applyDamage(p2BaseDamage, playerShield, player);
      p1Damage = p1Result.damage;
      p1Heal = Math.floor(player.maxHealth * 0.2);

      if (p1Result.dodged) messages.push(`🌪️ ${player.name} dodges while healing!`);
      else if (p1Result.miraged) messages.push(`✨ ${opponent.name}'s attack misses!`);
      else if (p1Result.shieldAbility) messages.push(`🛡️ ${player.name}'s shield ability activates!`);

      messages.push(`❤️ ${player.name} heals for ${p1Heal} but takes ${p1Damage} damage!`);
      
    } else if (p1Action === 'heal' && p2Action === 'block') {
      // Both defensive - both heal
      p1Heal = Math.floor(player.maxHealth * 0.2);
      p2Heal = 10;
      messages.push(`💚 Both warriors take defensive stance and heal!`);
      
    } else if (p1Action === 'heal' && p2Action === 'counter') {
      // P1 heals, P2 counters - P1 heals safely
      p1Heal = Math.floor(player.maxHealth * 0.2);
      messages.push(`❤️ ${player.name} heals safely for ${p1Heal} HP!`);
      
    } else if (p1Action === 'heal' && p2Action === 'heal') {
      // Both heal
      p1Heal = Math.floor(player.maxHealth * 0.2);
      p2Heal = Math.floor(opponent.maxHealth * 0.2);
      messages.push(`💚 Both warriors heal! ${player.name} +${p1Heal}, ${opponent.name} +${p2Heal}!`);
    }

    // Combo ability (Fatima): 15% chance for double damage
    if (player.specialAbility === 'combo' && p1Action === 'attack' && p2Damage > 0 && Math.random() < 0.15) {
      p2Damage = p2Damage * 2;
      messages.push(`🔥 ${player.name}'s combo strikes twice! Damage doubled!`);
    }
    if (opponent.specialAbility === 'combo' && p2Action === 'attack' && p1Damage > 0 && Math.random() < 0.15) {
      p1Damage = p1Damage * 2;
      messages.push(`🔥 ${opponent.name}'s combo strikes twice! Damage doubled!`);
    }

    // Lifesteal ability (Zara): Heal for 15% of damage dealt
    if (player.specialAbility === 'lifesteal' && p2Damage > 0) {
      const lifestealHeal = Math.floor(p2Damage * 0.15);
      p1Heal += lifestealHeal;
      messages.push(`💉 ${player.name} lifesteals ${lifestealHeal} HP!`);
    }
    if (opponent.specialAbility === 'lifesteal' && p1Damage > 0) {
      const lifestealHeal = Math.floor(p1Damage * 0.15);
      p2Heal += lifestealHeal;
      messages.push(`💉 ${opponent.name} lifesteals ${lifestealHeal} HP!`);
    }

    // Counter ability (Amara): 20% chance to return 30% of damage taken
    if (player.specialAbility === 'counter' && p1Damage > 0 && Math.random() < 0.20) {
      const counterDamage = Math.floor(p1Damage * 0.30);
      p2Damage += counterDamage;
      messages.push(`⚡ ${player.name}'s counter ability strikes back for ${counterDamage} damage!`);
    }
    if (opponent.specialAbility === 'counter' && p2Damage > 0 && Math.random() < 0.20) {
      const counterDamage = Math.floor(p2Damage * 0.30);
      p1Damage += counterDamage;
      messages.push(`⚡ ${opponent.name}'s counter ability strikes back for ${counterDamage} damage!`);
    }

    // Reflect ability (Makena): Reflect 10% of damage taken
    if (player.specialAbility === 'reflect' && p1Damage > 0) {
      const reflectDamage = Math.floor(p1Damage * 0.10);
      p2Damage += reflectDamage;
      messages.push(`💎 ${player.name} reflects ${reflectDamage} damage back!`);
    }
    if (opponent.specialAbility === 'reflect' && p2Damage > 0) {
      const reflectDamage = Math.floor(p2Damage * 0.10);
      p1Damage += reflectDamage;
      messages.push(`💎 ${opponent.name} reflects ${reflectDamage} damage back!`);
    }

    // Track attack counters for Rhythm ability (Sekou)
    if (p1Action === 'attack') {
      setAttackCounters(prev => ({ ...prev, player: prev.player + 1 }));
    }
    if (p2Action === 'attack') {
      setAttackCounters(prev => ({ ...prev, opponent: prev.opponent + 1 }));
    }

    // Mark first attack used for Agility ability (Kwame)
    if (p1Action === 'attack' && player.specialAbility === 'agility' && !firstAttackUsed.player) {
      setFirstAttackUsed(prev => ({ ...prev, player: true }));
    }
    if (p2Action === 'attack' && opponent.specialAbility === 'agility' && !firstAttackUsed.opponent) {
      setFirstAttackUsed(prev => ({ ...prev, opponent: true }));
    }

    // Apply damage and healing
    const newP1Health = Math.max(0, Math.min(player.maxHealth, player.health - p1Damage + p1Heal));
    const newP2Health = Math.max(0, Math.min(opponent.maxHealth, opponent.health - p2Damage + p2Heal));
    
    setPlayer(p => ({ ...p, health: newP1Health }));
    setOpponent(o => ({ ...o, health: newP2Health }));
    
    // Animate damage
    if (p1Damage > 0) {
      setAnimatingDamage('player');
      setTimeout(() => setAnimatingDamage(null), 500);
    }
    if (p2Damage > 0) {
      setAnimatingDamage('opponent');
      setTimeout(() => setAnimatingDamage(null), 500);
    }
    
    setBattleLog(prev => [...prev, ...messages]);
    
    // Check for round end
    setTimeout(() => {
      if (newP1Health <= 0 || newP2Health <= 0) {
        // Check phoenix ability
        if (newP1Health <= 0 && player.specialAbility === 'phoenix' && !phoenixUsed.player) {
          const reviveHealth = Math.floor(player.maxHealth * 0.3);
          setPlayer(p => ({ ...p, health: reviveHealth }));
          setPhoenixUsed(prev => ({ ...prev, player: true }));
          setBattleLog(prev => [...prev, `🔥 ${player.name} rises from the ashes with ${reviveHealth} HP!`]);
          setPlayerAction(null);
          setOpponentAction(null);
          setWaitingForActions(true);
          return;
        }
        
        if (newP2Health <= 0 && opponent.specialAbility === 'phoenix' && !phoenixUsed.opponent) {
          const reviveHealth = Math.floor(opponent.maxHealth * 0.3);
          setOpponent(o => ({ ...o, health: reviveHealth }));
          setPhoenixUsed(prev => ({ ...prev, opponent: true }));
          setBattleLog(prev => [...prev, `🔥 ${opponent.name} rises from the ashes with ${reviveHealth} HP!`]);
          setPlayerAction(null);
          setOpponentAction(null);
          setWaitingForActions(true);
          return;
        }
        
        endRound(newP1Health > newP2Health);
      } else {
        // Continue round - reset for next turn
        setTurnCount(prev => prev + 1);
        
        // Apply regeneration
        if (player.specialAbility === 'regenerate') {
          setPlayer(p => ({ ...p, health: Math.min(p.maxHealth, p.health + 5) }));
          setBattleLog(prev => [...prev, `💚 ${player.name} regenerated 5 HP!`]);
        }
        if (opponent.specialAbility === 'regenerate') {
          setOpponent(o => ({ ...o, health: Math.min(o.maxHealth, o.health + 5) }));
          setBattleLog(prev => [...prev, `💚 ${opponent.name} regenerated 5 HP!`]);
        }

        // Growth ability (Olu): Gain +5 damage per turn (capped at +50)
        if (player.specialAbility === 'growth' && damageModifiers.player < 50) {
          setDamageModifiers(prev => ({ ...prev, player: Math.min(50, prev.player + 5) }));
          setBattleLog(prev => [...prev, `📈 ${player.name} grows stronger! (+5 damage, total +${Math.min(50, damageModifiers.player + 5)})`]);
        }
        if (opponent.specialAbility === 'growth' && damageModifiers.opponent < 50) {
          setDamageModifiers(prev => ({ ...prev, opponent: Math.min(50, prev.opponent + 5) }));
          setBattleLog(prev => [...prev, `📈 ${opponent.name} grows stronger! (+5 damage, total +${Math.min(50, damageModifiers.opponent + 5)})`]);
        }

        // Random battle events
        checkBattleEvent();
        
        // Reset actions for next turn
        setPlayerAction(null);
        setOpponentAction(null);
        setWaitingForActions(true);
      }
    }, 1500);
  };

  const calculateBaseDamage = (character, isPlayer) => {
    const diffSettings = DIFFICULTY_SETTINGS[difficulty];

    // Flow ability (Imani): Damage varies more (±20% instead of ±10%)
    const damageVariance = character.specialAbility === 'flow' ? 0.20 : DAMAGE_VARIANCE;
    const variance = 1 + (Math.random() * damageVariance * 2 - damageVariance);
    let damage = Math.floor(character.damage * variance);

    // Growth ability (Olu): Gains +5 damage per turn (capped at +50)
    const side = isPlayer ? 'player' : 'opponent';
    if (character.specialAbility === 'growth') {
      damage += damageModifiers[side];
    }

    // Berserk ability (Desta): Damage increases as health decreases
    if (character.specialAbility === 'berserk') {
      const healthPercent = character.health / character.maxHealth;
      const berserkMultiplier = 1 + (1 - healthPercent); // At 50% HP = 1.5x, at 25% HP = 1.75x, at 0% HP = 2x
      damage = Math.floor(damage * berserkMultiplier);
    }

    if (playerMode !== 'local2p') {
      if (isPlayer) {
        damage = Math.floor(damage * diffSettings.playerDamageBonus);
      } else {
        damage = Math.floor(damage * diffSettings.aiDamageReduction);
      }
    }
    
    const effects = activeEffects[isPlayer ? 'player' : 'opponent'];
    if (effects.damageBoost) {
      damage = Math.floor(damage * 1.3);
    }

    // Rhythm ability (Sekou): Every 3rd attack is guaranteed critical
    const isRhythmCritical = character.specialAbility === 'rhythm' && attackCounters[side] % 3 === 2;

    // Agility ability (Kwame): First attack per round is critical
    const isAgilityCritical = character.specialAbility === 'agility' && !firstAttackUsed[side];

    const isCritical = isRhythmCritical || isAgilityCritical || (Math.random() < CRITICAL_HIT_CHANCE);
    if (isCritical) {
      const critMultiplier = (isPlayer && player?.specialAbility === 'fury') || (!isPlayer && opponent?.specialAbility === 'fury') ? 2.0 : CRITICAL_HIT_MULTIPLIER;
      damage = Math.floor(damage * critMultiplier);
    }

    return damage;
  };

  const applyDamage = (damage, shield, defender) => {
    let finalDamage = damage;

    // Dodge ability (Jabari): 20% chance to completely avoid attacks
    if (defender.specialAbility === 'dodge' && Math.random() < 0.20) {
      return { damage: 0, dodged: true };
    }

    // Mirage ability (Ayana): 15% chance for opponent to miss
    if (defender.specialAbility === 'mirage' && Math.random() < 0.15) {
      return { damage: 0, miraged: true };
    }

    // Apply shield reduction from item
    if (shield > 0) {
      const shieldReduction = Math.min(shield, Math.floor(damage * 0.5));
      finalDamage = Math.max(0, damage - shieldReduction);
    }

    // Shield ability (Kofi): 25% chance to block 50% of damage
    if (defender.specialAbility === 'shield' && Math.random() < 0.25) {
      finalDamage = Math.floor(finalDamage * 0.5);
      return { damage: finalDamage, shieldAbility: true };
    }

    // Endurance ability (Chike): Take 10% less damage
    if (defender.specialAbility === 'endurance') {
      finalDamage = Math.floor(finalDamage * 0.9);
    }

    return { damage: finalDamage };
  };

  const checkBattleEvent = () => {
    const event = BATTLE_EVENTS.find(e => Math.random() < e.chance);
    if (event) {
      setBattleLog(prev => [...prev, `⚡ ${event.name}: ${event.description}`]);
      
      switch(event.effect) {
        case 'both_damage':
          const p1Dmg = Math.max(0, event.value - playerShield);
          const p2Dmg = Math.max(0, event.value - opponentShield);
          setPlayer(p => ({ ...p, health: Math.max(0, p.health - p1Dmg) }));
          setOpponent(o => ({ ...o, health: Math.max(0, o.health - p2Dmg) }));
          break;
        case 'both_heal':
          setPlayer(p => ({ ...p, health: Math.min(p.maxHealth, p.health + event.value) }));
          setOpponent(o => ({ ...o, health: Math.min(o.maxHealth, o.health + event.value) }));
          break;
        case 'gain_coins':
          setCoins(c => c + event.value);
          break;
      }
    }
  };

  const useHealthBoost = () => {
    const currentCoins = (playerMode === 'local2p' && !isPlayerTurn) ? player2Coins : coins;
    
    if (currentCoins < HEALTH_BOOST_COST) return;
    
    if (playerMode === 'local2p' && !isPlayerTurn) {
      setPlayer2Coins(prev => prev - HEALTH_BOOST_COST);
    } else {
      setCoins(prev => prev - HEALTH_BOOST_COST);
    }
    
    const character = isPlayerTurn ? player : opponent;
    const newHealth = Math.min(character.maxHealth, character.health + HEALTH_BOOST_HEAL);
    
    if (isPlayerTurn) {
      setPlayer({ ...player, health: newHealth });
    } else {
      setOpponent({ ...opponent, health: newHealth });
    }
    
    setBattleLog(prev => [...prev, `❤️ ${character.name} used Health Boost! Restored ${HEALTH_BOOST_HEAL} health!`]);
  };

  const buyDamageBoost = () => {
    const currentCoins = (playerMode === 'local2p' && !isPlayerTurn) ? player2Coins : coins;
    
    if (currentCoins < 60) return;
    
    if (playerMode === 'local2p' && !isPlayerTurn) {
      setPlayer2Coins(prev => prev - 60);
    } else {
      setCoins(prev => prev - 60);
    }
    
    setActiveEffects(prev => ({
      ...prev,
      [isPlayerTurn ? 'player' : 'opponent']: { ...prev[isPlayerTurn ? 'player' : 'opponent'], damageBoost: 3 }
    }));
    
    const character = isPlayerTurn ? player : opponent;
    setBattleLog(prev => [...prev, `⚔️ ${character.name} gained +30% damage for 3 turns!`]);
  };

  const buyShield = () => {
    const currentCoins = (playerMode === 'local2p' && !isPlayerTurn) ? player2Coins : coins;
    
    if (currentCoins < 70) return;
    
    if (playerMode === 'local2p' && !isPlayerTurn) {
      setPlayer2Coins(prev => prev - 70);
    } else {
      setCoins(prev => prev - 70);
    }
    
    if (isPlayerTurn) {
      setPlayerShield(prev => prev + 100);
    } else {
      setOpponentShield(prev => prev + 100);
    }
    
    const character = isPlayerTurn ? player : opponent;
    setBattleLog(prev => [...prev, `🛡️ ${character.name} activated Shield! +100 shield points!`]);
  };

  const endRound = (playerWon) => {
    setRoundInProgress(false);
    const newPlayerWins = playerWon ? playerRoundWins + 1 : playerRoundWins;
    const newOpponentWins = playerWon ? opponentRoundWins : opponentRoundWins + 1;
    
    setPlayerRoundWins(newPlayerWins);
    setOpponentRoundWins(newOpponentWins);
    setLastRoundWinner(playerWon ? player.name : opponent.name);
    setShowRoundResult(true);
    
    const roundResult = {
      round: currentRound,
      winner: playerWon ? player.name : opponent.name,
      playerHealth: playerWon ? player.health : 0,
      opponentHealth: playerWon ? 0 : opponent.health
    };
    setRoundHistory(prev => [...prev, roundResult]);
    
    setBattleLog(prev => [...prev, `\n🏆 ROUND ${currentRound} WINNER: ${playerWon ? player.name : opponent.name}!`, `Score: ${newPlayerWins} - ${newOpponentWins}`]);
    
    if (newPlayerWins >= 3 || newOpponentWins >= 3) {
      setTimeout(() => endMatch(newPlayerWins >= 3), 2000);
    } else if (currentRound < maxRounds) {
      setTimeout(() => startNewRound(), 3000);
    } else {
      setTimeout(() => endMatch(newPlayerWins > newOpponentWins), 2000);
    }
  };

  const endMatch = (playerWon) => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
    
    if (playerWon) {
      setWins(prev => prev + 1);
      const reward = Math.floor(WIN_REWARD * DIFFICULTY_SETTINGS[difficulty].coinMultiplier);
      setCoins(prev => prev + reward);
      setBattleLog(prev => [...prev, `\n🎉 MATCH VICTORY! ${player.name} wins ${playerRoundWins}-${opponentRoundWins}!`, `Earned ${reward} coins!`]);
      
      if (gameMode === 'tournament') {
        const newProgress = tournamentProgress + 1;
        setTournamentProgress(newProgress);
        if (newProgress >= 16) {
          setBattleLog(prev => [...prev, '🏆 TOURNAMENT CHAMPION! You defeated all warriors!']);
          setTimeout(() => setGameState('gameOver'), 3000);
          return;
        }
      } else if (gameMode === 'survival') {
        setSurvivalStreak(prev => prev + 1);
      }
      
      setTimeout(() => {
        if (gameMode === 'quick') {
          setGameState('gameOver');
        } else {
          const availableOpponents = characters.filter(c => c.id !== player.id);
          const randomOpponent = availableOpponents[Math.floor(Math.random() * availableOpponents.length)];
          const opponentChar = { ...randomOpponent, health: randomOpponent.maxHealth };
          setOpponent(opponentChar);
          setPlayer(prev => ({ ...prev, health: prev.maxHealth }));
          startBattle(player, opponentChar);
        }
      }, 3000);
    } else {
      setLosses(prev => prev + 1);
      setBattleLog(prev => [...prev, `\n💀 MATCH DEFEAT! ${opponent.name} wins ${opponentRoundWins}-${playerRoundWins}!`]);
      setTimeout(() => setGameState('gameOver'), 3000);
    }
  };

  const returnToMenu = () => {
    setGameState('menu');
    setPlayer(null);
    setPlayer2(null);
    setOpponent(null);
    setBattleLog([]);
    setActiveEffects({ player: {}, opponent: {} });
    setCurrentRound(1);
    setPlayerRoundWins(0);
    setOpponentRoundWins(0);
    setRoundHistory([]);
    setRoundInProgress(false);
  };

  const openShop = () => {
    setGameState('shop');
  };

  // Menu Screen
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4 drop-shadow-2xl animate-pulse">
              AFRICAN WARRIORS
            </h1>
            <p className="text-xl md:text-2xl text-amber-100 font-semibold">
              Strategic Combat - Attack, Block, Counter, Heal!
            </p>
            <Badge className="mt-4 text-lg px-4 py-2 bg-green-600">Action-Based Combat System!</Badge>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-amber-50 to-orange-100 border-4 border-amber-600 hover:scale-105 transition-transform cursor-pointer" onClick={() => startGame('quick')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Swords className="w-8 h-8 text-orange-600" />
                  Quick Battle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Strategic best of 5 with action choices!</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-4 border-blue-600 hover:scale-105 transition-transform cursor-pointer" onClick={() => window.location.href = '/online'}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="w-8 h-8 text-blue-600" />
                  Online Multiplayer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Play with friends or random opponents!</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-4 border-purple-600 hover:scale-105 transition-transform cursor-pointer" onClick={() => startGame('tournament')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trophy className="w-8 h-8 text-purple-600" />
                  Tournament
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Face all 16 warriors in tactical battles!</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-4 border-green-600 hover:scale-105 transition-transform cursor-pointer" onClick={() => startGame('survival')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="w-8 h-8 text-green-600" />
                  Survival
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Endless strategic combat challenges!</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-white/90 backdrop-blur rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-around text-center">
              <div>
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Coins className="w-6 h-6 text-yellow-600" />
                  <span className="text-2xl font-bold text-gray-800">{coins}</span>
                </div>
                <p className="text-sm text-gray-600">Coins</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{wins}</div>
                <p className="text-sm text-gray-600">Wins</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{losses}</div>
                <p className="text-sm text-gray-600">Losses</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{survivalStreak}</div>
                <p className="text-sm text-gray-600">Best Streak</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Difficulty Selection
  if (gameState === 'difficulty') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Choose Difficulty</h2>
            <p className="text-xl text-purple-200">Select your challenge level</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {Object.entries(DIFFICULTY_SETTINGS).map(([key, setting]) => (
              <Card 
                key={key}
                className={`cursor-pointer hover:scale-105 transition-all duration-300 border-4 ${
                  key === 'easy' ? 'bg-gradient-to-br from-green-100 to-green-200 border-green-500' :
                  key === 'medium' ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-500' :
                  'bg-gradient-to-br from-red-100 to-red-200 border-red-500'
                }`}
                onClick={() => selectDifficulty(key)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    {key === 'easy' && <Target className="w-8 h-8 text-green-600" />}
                    {key === 'medium' && <Activity className="w-8 h-8 text-yellow-600" />}
                    {key === 'hard' && <Flame className="w-8 h-8 text-red-600" />}
                    {setting.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{setting.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Coin Reward:</span>
                      <span className="font-bold">{setting.coinMultiplier}x</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center">
            <Button onClick={() => setGameState('playerMode')} variant="outline" className="border-white hover:bg-white/10">
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Player Mode Selection
  if (gameState === 'playerMode') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Choose Player Mode</h2>
            <p className="text-xl text-blue-200">How do you want to play?</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card 
              className="cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-blue-500"
              onClick={() => selectPlayerMode('single')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Target className="w-8 h-8 text-blue-600" />
                  vs AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Battle against smart AI with strategic actions!</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br from-green-100 to-green-200 border-4 border-green-500"
              onClick={() => selectPlayerMode('local2p')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="w-8 h-8 text-green-600" />
                  2 Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Local multiplayer with action-based combat!</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br from-purple-100 to-purple-200 border-4 border-purple-500 opacity-50"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Users className="w-8 h-8 text-purple-600" />
                  Online
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">Coming soon! Battle players worldwide!</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button onClick={returnToMenu} variant="outline" className="border-white hover:bg-white/10">
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Character Selection Screen (keeping same as before)
  if (gameState === 'characterSelect') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {playerMode === 'local2p' && !player ? 'Player 1: Choose Your Warrior' : 
               playerMode === 'local2p' && player ? 'Player 2: Choose Your Warrior' :
               'Choose Your Warrior'}
            </h2>
            <p className="text-xl text-purple-200">Strategic combat - All characters balanced!</p>
            <Badge className="mt-2 bg-yellow-500 text-black">Attack, Block, Counter, or Heal!</Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
            {characters.map((char) => (
              <Card 
                key={char.id} 
                className={`cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br from-slate-800 to-slate-900 border-2 hover:border-yellow-500 overflow-hidden group ${
                  playerMode === 'local2p' && player && char.id === player.id ? 'opacity-50 pointer-events-none' : ''
                }`}
                onClick={() => selectCharacter(char)}
              >
                <div className="relative bg-gradient-to-br from-slate-700 to-slate-800">
                  <img
                    src={char.image}
                    alt={char.name}
                    className="w-full h-48 object-cover object-top group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    onLoad={() => console.log('Image loaded:', char.name, char.image)}
                    onError={(e) => {
                      console.error('Failed to load character image:', char.name, char.image);
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23' + char.color.substring(1) + '" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="24" font-weight="bold"%3E' + char.name + '%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <Badge style={{ backgroundColor: char.color }} className="text-white font-bold">
                      {char.country}
                    </Badge>
                  </div>
                  {char.specialAbility && (
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-purple-600 text-white text-xs">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        {char.specialAbility}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="text-xl font-bold text-white mb-2">{char.name}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between text-red-400">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> HP
                      </span>
                      <span className="font-bold">{char.maxHealth}</span>
                    </div>
                    <div className="flex items-center justify-between text-orange-400">
                      <span className="flex items-center gap-1">
                        <Sword className="w-4 h-4" /> DMG
                      </span>
                      <span className="font-bold">{char.damage}</span>
                    </div>
                    {char.specialAbility && ABILITY_DESCRIPTIONS[char.specialAbility] && (
                      <div className="mt-2 pt-2 border-t border-purple-500/30">
                        <p className="text-xs text-purple-300 flex items-start gap-1">
                          <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{ABILITY_DESCRIPTIONS[char.specialAbility]}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Button onClick={() => setGameState(playerMode === 'single' ? 'difficulty' : 'playerMode')} variant="outline" className="border-white hover:bg-white/10">
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Shop Screen (keeping same structure)
  if (gameState === 'shop') {
    const currentCoins = (playerMode === 'local2p' && !isPlayerTurn) ? player2Coins : coins;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-amber-800 to-orange-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Battle Shop</h2>
            <div className="flex items-center justify-center gap-2 text-2xl text-yellow-300">
              <Coins className="w-8 h-8" />
              <span className="font-bold">{currentCoins} Coins</span>
            </div>
            <Badge className="mt-2 bg-blue-600">Round {currentRound} of {maxRounds}</Badge>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-red-100 to-red-200 border-4 border-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Heart className="w-8 h-8 text-red-600" />
                  Health Boost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">Restore 150 health instantly</p>
                <Button 
                  onClick={() => { useHealthBoost(); setGameState('battle'); }}
                  disabled={currentCoins < HEALTH_BOOST_COST}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Buy for {HEALTH_BOOST_COST} <Coins className="w-4 h-4 inline ml-1" />
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-orange-100 to-orange-200 border-4 border-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                  Damage Boost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">+30% damage for 3 turns</p>
                <Button 
                  onClick={() => { buyDamageBoost(); setGameState('battle'); }}
                  disabled={currentCoins < 60}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  Buy for 60 <Coins className="w-4 h-4 inline ml-1" />
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Shield className="w-8 h-8 text-blue-600" />
                  Shield
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">+100 shield points (reduces damage)</p>
                <Button 
                  onClick={() => { buyShield(); setGameState('battle'); }}
                  disabled={currentCoins < 70}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Buy for 70 <Coins className="w-4 h-4 inline ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center">
            <Button onClick={() => setGameState('battle')} size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              Return to Battle
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Battle Screen with Action Selection
  if (gameState === 'battle' && player && opponent) {
    const currentCoins = (playerMode === 'local2p' && !isPlayerTurn) ? player2Coins : coins;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-900 p-4 md:p-8 relative">
        {/* Round Result Overlay */}
        {showRoundResult && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="text-center animate-bounce">
              <div className="text-9xl mb-4">🏆</div>
              <h2 className="text-6xl font-bold text-yellow-400 animate-pulse">
                ROUND {currentRound} WINNER
              </h2>
              <h3 className="text-4xl font-bold text-white mt-4">{lastRoundWinner}</h3>
              <div className="text-2xl text-white mt-4">
                Score: {playerRoundWins} - {opponentRoundWins}
              </div>
            </div>
          </div>
        )}
        
        {/* Match Victory Celebration */}
        {showCelebration && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="text-center animate-bounce">
              <div className="text-9xl mb-4">🎉</div>
              <h2 className="text-6xl font-bold text-yellow-400 animate-pulse">MATCH VICTORY!</h2>
              <div className="flex gap-4 justify-center mt-4 text-5xl">
                <span className="animate-spin">⭐</span>
                <span className="animate-ping">✨</span>
                <span className="animate-bounce">🏆</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="max-w-7xl mx-auto">
          {/* Header Stats */}
          <div className="flex justify-between items-center mb-6 bg-black/30 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-4">
              <Coins className="w-6 h-6 text-yellow-400" />
              <span className="text-2xl font-bold text-white">{currentCoins}</span>
              <Badge className="bg-blue-600">
                {DIFFICULTY_SETTINGS[difficulty].label}
              </Badge>
            </div>
            
            {/* Round Score Display */}
            <div className="text-center bg-white/10 rounded-lg px-6 py-2">
              <div className="text-sm text-yellow-300">Round {currentRound} of {maxRounds}</div>
              <div className="text-3xl font-bold text-white flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-400" />
                {playerRoundWins} - {opponentRoundWins}
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-xs text-gray-300">Best of 5</div>
            </div>
            
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-green-400 text-xl font-bold">{wins}</div>
                <div className="text-xs text-white">Matches Won</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 text-xl font-bold">{losses}</div>
                <div className="text-xs text-white">Matches Lost</div>
              </div>
            </div>
          </div>
          
          {/* Battle Arena */}
          <div className="grid md:grid-cols-2 gap-8 mb-6">
            {/* Player Card */}
            <Card className={`bg-gradient-to-br from-blue-900 to-blue-700 border-4 ${playerAction ? 'border-green-400' : 'border-blue-500'} ${animatingDamage === 'player' ? 'animate-shake' : ''}`}>
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center justify-between">
                  <span>{player.name}</span>
                  <Badge style={{ backgroundColor: player.color }}>{player.country}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-blue-800 to-blue-600">
                  <img
                    src={player.image}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    style={{ objectPosition: 'center 20%' }}
                    onError={(e) => {
                      console.error('Failed to load player image:', player.image);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-white mb-1">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> Health
                      </span>
                      <span className="font-bold">{player.health} / {player.maxHealth}</span>
                    </div>
                    <Progress value={(player.health / player.maxHealth) * 100} className="h-3" />
                  </div>
                  {playerShield > 0 && (
                    <div>
                      <div className="flex justify-between text-blue-300 mb-1">
                        <span className="flex items-center gap-1">
                          <Shield className="w-4 h-4" /> Shield
                        </span>
                        <span className="font-bold">{playerShield}</span>
                      </div>
                      <Progress value={Math.min(100, (playerShield / 100) * 100)} className="h-2 bg-blue-900" />
                    </div>
                  )}
                  {playerAction && (
                    <div className="text-center bg-green-600 rounded p-2">
                      <div className="text-white font-bold">Action: {playerAction.toUpperCase()}</div>
                    </div>
                  )}
                  <div className="text-center bg-green-900/50 rounded p-2">
                    <div className="text-yellow-400 font-bold text-lg">{playerRoundWins} Rounds Won</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Opponent Card */}
            <Card className={`bg-gradient-to-br from-red-900 to-red-700 border-4 ${opponentAction ? 'border-green-400' : 'border-red-500'} ${animatingDamage === 'opponent' ? 'animate-shake' : ''}`}>
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center justify-between">
                  <span>{opponent.name}</span>
                  <Badge style={{ backgroundColor: opponent.color }}>{opponent.country}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-red-800 to-red-600">
                  <img
                    src={opponent.image}
                    alt={opponent.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    style={{ objectPosition: 'center 20%' }}
                    onError={(e) => {
                      console.error('Failed to load opponent image:', opponent.image);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-white mb-1">
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" /> Health
                      </span>
                      <span className="font-bold">{opponent.health} / {opponent.maxHealth}</span>
                    </div>
                    <Progress value={(opponent.health / opponent.maxHealth) * 100} className="h-3" />
                  </div>
                  {opponentShield > 0 && (
                    <div>
                      <div className="flex justify-between text-blue-300 mb-1">
                        <span className="flex items-center gap-1">
                          <Shield className="w-4 h-4" /> Shield
                        </span>
                        <span className="font-bold">{opponentShield}</span>
                      </div>
                      <Progress value={Math.min(100, (opponentShield / 100) * 100)} className="h-2 bg-blue-900" />
                    </div>
                  )}
                  {opponentAction && (
                    <div className="text-center bg-green-600 rounded p-2">
                      <div className="text-white font-bold">Action: {opponentAction.toUpperCase()}</div>
                    </div>
                  )}
                  <div className="text-center bg-green-900/50 rounded p-2">
                    <div className="text-yellow-400 font-bold text-lg">{opponentRoundWins} Rounds Won</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Action Buttons */}
          {waitingForActions && roundInProgress && !playerAction && (
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white text-center mb-4">Choose Your Action:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  onClick={() => selectAction('attack')}
                  size="lg"
                  className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold text-xl py-8"
                >
                  <Sword className="w-8 h-8 mb-2" />
                  <div>ATTACK</div>
                  <div className="text-xs">Deal damage</div>
                </Button>
                <Button 
                  onClick={() => selectAction('block')}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold text-xl py-8"
                >
                  <Shield className="w-8 h-8 mb-2" />
                  <div>BLOCK</div>
                  <div className="text-xs">Reduce damage</div>
                </Button>
                <Button 
                  onClick={() => selectAction('counter')}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-xl py-8"
                >
                  <Zap className="w-8 h-8 mb-2" />
                  <div>COUNTER</div>
                  <div className="text-xs">Risky but powerful</div>
                </Button>
                <Button 
                  onClick={() => selectAction('heal')}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl py-8"
                >
                  <Heart className="w-8 h-8 mb-2" />
                  <div>HEAL</div>
                  <div className="text-xs">Restore 20% HP</div>
                </Button>
              </div>
            </div>
          )}
          
          {/* Player 2 Action Buttons */}
          {!waitingForActions && playerMode === 'local2p' && playerAction && !opponentAction && roundInProgress && (
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white text-center mb-4">Player 2: Choose Your Action:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  onClick={() => selectAction2('attack')}
                  size="lg"
                  className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold text-xl py-8"
                >
                  <Sword className="w-8 h-8 mb-2" />
                  <div>ATTACK</div>
                </Button>
                <Button 
                  onClick={() => selectAction2('block')}
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold text-xl py-8"
                >
                  <Shield className="w-8 h-8 mb-2" />
                  <div>BLOCK</div>
                </Button>
                <Button 
                  onClick={() => selectAction2('counter')}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-xl py-8"
                >
                  <Zap className="w-8 h-8 mb-2" />
                  <div>COUNTER</div>
                </Button>
                <Button 
                  onClick={() => selectAction2('heal')}
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl py-8"
                >
                  <Heart className="w-8 h-8 mb-2" />
                  <div>HEAL</div>
                </Button>
              </div>
            </div>
          )}
          
          {/* Shop Button */}
          <div className="flex gap-4 justify-center mb-6">
            <Button 
              onClick={openShop}
              size="lg"
              className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-bold text-xl px-8 py-6"
            >
              <Gift className="w-6 h-6 mr-2" />
              Shop
            </Button>
          </div>
          
          {/* Battle Log */}
          <Card className="bg-black/50 backdrop-blur border-2 border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-6 h-6" />
                Battle Log - Round {currentRound}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 overflow-y-auto space-y-1">
                {battleLog.slice(-15).map((log, index) => (
                  <div key={index} className="text-white text-sm animate-fade-in">
                    {log}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="text-center mt-4">
            <Button onClick={returnToMenu} variant="outline" className="border-white hover:bg-white/10">
              Forfeit & Return to Menu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over Screen (keeping same as before)
  if (gameState === 'gameOver') {
    const lastBattleWon = battleLog.some(log => log.includes('MATCH VICTORY'));
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-yellow-500">
          <CardHeader>
            <CardTitle className="text-4xl text-center text-white flex items-center justify-center gap-4">
              {lastBattleWon ? (
                <>
                  <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
                  🎉 Match Victory! 🎉
                  <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
                </>
              ) : (
                <>💀 Match Defeat! 💀</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              {player && (
                <div className="mb-4">
                  <img src={player.image} alt={player.name} className="w-48 h-48 object-cover rounded-full mx-auto border-4 border-yellow-500" loading="lazy" style={{ objectPosition: 'center 20%' }} />
                  <h3 className="text-2xl font-bold text-white mt-4">{player.name}</h3>
                  <p className="text-purple-300">{player.country}</p>
                  <div className="text-3xl font-bold text-yellow-400 mt-4">
                    Final Score: {playerRoundWins} - {opponentRoundWins}
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-400">{wins}</div>
                <div className="text-sm text-white">Matches Won</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-red-400">{losses}</div>
                <div className="text-sm text-white">Matches Lost</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-400">{coins}</div>
                <div className="text-sm text-white">Coins</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold text-purple-400">{survivalStreak}</div>
                <div className="text-sm text-white">Streak</div>
              </div>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => startGame(gameMode)} 
                size="lg"
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold"
              >
                <Trophy className="w-5 h-5 mr-2" />
                Play Again
              </Button>
              <Button 
                onClick={returnToMenu} 
                size="lg"
                variant="outline"
                className="text-white border-white hover:bg-white/10"
              >
                Main Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

export default App;

