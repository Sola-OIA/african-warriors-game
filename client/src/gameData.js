// Character data for African Warriors game - BALANCED VERSION
import amaraImg from './assets/amara_nigeria.webp';
import kofiImg from './assets/kofi_ghana.webp';
import zaraImg from './assets/zara_egypt.webp';
import jabariImg from './assets/jabari_kenya.webp';
import nalediImg from './assets/naledi_south_africa.webp';
import destaImg from './assets/desta_ethiopia.webp';
import fatimaImg from './assets/fatima_morocco.webp';
import chikeImg from './assets/chike_tanzania.webp';
import imaniImg from './assets/imani_uganda.webp';
import sekouImg from './assets/sekou_senegal.webp';
import ayanaImg from './assets/ayana_algeria.webp';
import kwameImg from './assets/kwame_ivory_coast.webp';
import niaImg from './assets/nia_rwanda.webp';
import tariqImg from './assets/tariq_tunisia.webp';
import makenaImg from './assets/makena_botswana.webp';
import oluImg from './assets/olu_angola.webp';

// BALANCED STATS - All characters now competitive
export const characters = [
  {
    id: 1,
    name: "Amara",
    country: "Nigeria",
    maxHealth: 200,
    health: 200,
    damage: 35,
    powerUp: "Oil Boom",
    backstory: "A fierce warrior from Lagos, master of strategic combat",
    image: amaraImg,
    color: "#008751",
    specialAbility: "counter" // 20% chance to counter-attack
  },
  {
    id: 2,
    name: "Kofi",
    country: "Ghana",
    maxHealth: 210,
    health: 210,
    damage: 32,
    powerUp: "Golden Shield",
    backstory: "Guardian of ancient Ashanti traditions",
    image: kofiImg,
    color: "#FFD700",
    specialAbility: "shield" // 25% chance to block 50% damage
  },
  {
    id: 3,
    name: "Zara",
    country: "Egypt",
    maxHealth: 195,
    health: 195,
    damage: 38,
    powerUp: "Pharaoh's Blessing",
    backstory: "Descendant of pharaohs, wielder of desert magic",
    image: zaraImg,
    color: "#C9B037",
    specialAbility: "lifesteal" // Heals 15% of damage dealt
  },
  {
    id: 4,
    name: "Jabari",
    country: "Kenya",
    maxHealth: 205,
    health: 205,
    damage: 34,
    powerUp: "Savanna Sprint",
    backstory: "Swift runner from the Maasai plains",
    image: jabariImg,
    color: "#BB0000",
    specialAbility: "dodge" // 20% chance to dodge attacks
  },
  {
    id: 5,
    name: "Naledi",
    country: "South Africa",
    maxHealth: 215,
    health: 215,
    damage: 31,
    powerUp: "Rainbow Power",
    backstory: "Mining engineer turned freedom fighter",
    image: nalediImg,
    color: "#007A4D",
    specialAbility: "regenerate" // Heals 5 HP per turn
  },
  {
    id: 6,
    name: "Desta",
    country: "Ethiopia",
    maxHealth: 200,
    health: 200,
    damage: 36,
    powerUp: "Lion of Judah",
    backstory: "Highland warrior with unbreakable spirit",
    image: destaImg,
    color: "#DA121A",
    specialAbility: "berserk" // Damage increases as health decreases
  },
  {
    id: 7,
    name: "Fatima",
    country: "Morocco",
    maxHealth: 205,
    health: 205,
    damage: 35,
    powerUp: "Desert Storm",
    backstory: "Berber princess skilled in martial arts",
    image: fatimaImg,
    color: "#C1272D",
    specialAbility: "combo" // 15% chance for double attack
  },
  {
    id: 8,
    name: "Chike",
    country: "Tanzania",
    maxHealth: 220,
    health: 220,
    damage: 30,
    powerUp: "Mountain Might",
    backstory: "Climber who conquered Kilimanjaro at age 10",
    image: chikeImg,
    color: "#1EB53A",
    specialAbility: "endurance" // Takes 10% less damage
  },
  {
    id: 9,
    name: "Imani",
    country: "Uganda",
    maxHealth: 195,
    health: 195,
    damage: 37,
    powerUp: "Nile Force",
    backstory: "River guardian with water manipulation powers",
    image: imaniImg,
    color: "#FCDC04",
    specialAbility: "flow" // Damage varies more (±20%)
  },
  {
    id: 10,
    name: "Sekou",
    country: "Senegal",
    maxHealth: 205,
    health: 205,
    damage: 34,
    powerUp: "Teranga Spirit",
    backstory: "Griot warrior who fights with rhythm and dance",
    image: sekouImg,
    color: "#00853F",
    specialAbility: "rhythm" // Every 3rd attack is guaranteed critical
  },
  {
    id: 11,
    name: "Ayana",
    country: "Algeria",
    maxHealth: 210,
    health: 210,
    damage: 33,
    powerUp: "Sahara Shield",
    backstory: "Desert nomad with survival expertise",
    image: ayanaImg,
    color: "#006233",
    specialAbility: "mirage" // 15% chance opponent misses
  },
  {
    id: 12,
    name: "Kwame",
    country: "Ivory Coast",
    maxHealth: 200,
    health: 200,
    damage: 36,
    powerUp: "Cocoa Rush",
    backstory: "Agile fighter from Abidjan's streets",
    image: kwameImg,
    color: "#F77F00",
    specialAbility: "agility" // First attack each battle is critical
  },
  {
    id: 13,
    name: "Nia",
    country: "Rwanda",
    maxHealth: 190,
    health: 190,
    damage: 39,
    powerUp: "Phoenix Rise",
    backstory: "Symbol of rebirth and technological innovation",
    image: niaImg,
    color: "#00A1DE",
    specialAbility: "phoenix" // Revives once with 30% health
  },
  {
    id: 14,
    name: "Tariq",
    country: "Tunisia",
    maxHealth: 205,
    health: 205,
    damage: 35,
    powerUp: "Carthage Fury",
    backstory: "Revolutionary with ancient warrior blood",
    image: tariqImg,
    color: "#E70013",
    specialAbility: "fury" // Critical hits deal 2x instead of 1.5x
  },
  {
    id: 15,
    name: "Makena",
    country: "Botswana",
    maxHealth: 215,
    health: 215,
    damage: 32,
    powerUp: "Diamond Defense",
    backstory: "Protector of the Okavango Delta",
    image: makenaImg,
    color: "#75AADB",
    specialAbility: "reflect" // Reflects 10% of damage taken
  },
  {
    id: 16,
    name: "Olu",
    country: "Angola",
    maxHealth: 195,
    health: 195,
    damage: 37,
    powerUp: "Black Gold Surge",
    backstory: "Young warrior with untapped potential",
    image: oluImg,
    color: "#CC092F",
    specialAbility: "growth" // Gains +5 damage each turn
  }
];

// Game constants
export const POWER_UP_COST = 80;
export const POWER_UP_HEAL = 350;
export const HEALTH_BOOST_COST = 50;
export const HEALTH_BOOST_HEAL = 150;
export const WIN_REWARD = 100;
export const CRITICAL_HIT_CHANCE = 0.15;
export const CRITICAL_HIT_MULTIPLIER = 1.3;
export const DAMAGE_VARIANCE = 0.10;
export const STARTING_COINS = 300;

// Difficulty settings
export const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    description: "AI makes mistakes, you deal more damage",
    playerDamageBonus: 1.3,
    aiDamageReduction: 0.7,
    aiMistakeChance: 0.35,
    coinMultiplier: 1.5
  },
  medium: {
    label: "Medium",
    description: "Balanced gameplay for fair competition",
    playerDamageBonus: 1.0,
    aiDamageReduction: 1.0,
    aiMistakeChance: 0.15,
    coinMultiplier: 1.0
  },
  hard: {
    label: "Hard",
    description: "AI is ruthless, you take more damage",
    playerDamageBonus: 0.9,
    aiDamageReduction: 1.1,
    aiMistakeChance: 0.05,
    coinMultiplier: 2.0
  }
};

// Shop items
export const SHOP_ITEMS = [
  {
    id: 'health_boost',
    name: 'Health Boost',
    description: 'Restore 150 health instantly',
    cost: 50,
    icon: '❤️'
  },
  {
    id: 'power_up',
    name: 'Power-Up',
    description: 'Restore 350 health + special effect',
    cost: 80,
    icon: '⚡'
  },
  {
    id: 'damage_boost',
    name: 'Damage Boost',
    description: '+30% damage for 3 turns',
    cost: 60,
    icon: '⚔️'
  },
  {
    id: 'shield',
    name: 'Shield',
    description: 'Block 50% damage for 2 turns',
    cost: 70,
    icon: '🛡️'
  }
];

// Battle events for more excitement
export const BATTLE_EVENTS = [
  {
    id: 'meteor',
    name: 'Meteor Strike',
    description: 'Both warriors take 50 damage!',
    effect: 'both_damage',
    value: 50,
    chance: 0.05
  },
  {
    id: 'blessing',
    name: 'Ancestral Blessing',
    description: 'Both warriors heal 30 health!',
    effect: 'both_heal',
    value: 30,
    chance: 0.05
  },
  {
    id: 'power_surge',
    name: 'Power Surge',
    description: 'Next attack deals double damage!',
    effect: 'next_attack_double',
    chance: 0.08
  },
  {
    id: 'coin_drop',
    name: 'Coin Drop',
    description: 'Found 50 coins!',
    effect: 'gain_coins',
    value: 50,
    chance: 0.1
  }
];

