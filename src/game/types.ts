export type JobClass =
  | 'Novice'
  | 'Swordsman'
  | 'Knight'
  | 'Mage'
  | 'Wizard'
  | 'Archer'
  | 'Hunter'
  | 'Thief'
  | 'Assassin'
  | 'Acolyte'
  | 'Priest';

export type ElementType = 'Neutral' | 'Fire' | 'Water' | 'Wind' | 'Earth' | 'Holy' | 'Shadow';

export interface CharacterStats {
  str: number; // Attack power & physical damage
  agi: number; // Attack speed & flee rate
  vit: number; // Max HP, defense, and potion recovery
  int: number; // Magic attack, max SP, magic def
  dex: number; // Accuracy (Hit), cast speed, ranged damage
  luk: number; // Critical rate, perfect dodge, lucky drop
}

export interface DerivedStats {
  maxHp: number;
  maxSp: number;
  hp: number;
  sp: number;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  hit: number;
  flee: number;
  aspd: number;
  critRate: number;
}

export type EquipSlot =
  | 'headTop'
  | 'headMid'
  | 'headLow'
  | 'weapon'
  | 'shield'
  | 'armor'
  | 'garment'
  | 'footgear'
  | 'accessory1'
  | 'accessory2';

export interface Card {
  id: string;
  name: string;
  description: string;
  slotTarget: 'weapon' | 'armor' | 'shield' | 'accessory' | 'head';
  bonus: {
    stat?: keyof CharacterStats;
    value?: number;
    atkPercent?: number;
    critPercent?: number;
    fleeBonus?: number;
    hpBonus?: number;
    elementModifier?: { element: ElementType; percent: number };
  };
}

export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'headgear' | 'shield' | 'garment' | 'footgear' | 'accessory' | 'usable' | 'card' | 'material';
  description: string;
  icon: string;
  price: number;
  equipSlot?: EquipSlot;
  refineLevel?: number;
  slots?: number;
  slottedCards?: Card[];
  statsBonus?: Partial<CharacterStats>;
  atkBonus?: number;
  matkBonus?: number;
  defBonus?: number;
  hpRecover?: number;
  spRecover?: number;
  quantity?: number;
}

export interface Skill {
  id: string;
  name: string;
  job: JobClass;
  spCost: number;
  element: ElementType;
  damageMultiplier: number;
  isMagic: boolean;
  isAoE: boolean;
  castTime: number; // seconds
  description: string;
  level: number;
  maxLevel: number;
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  exp: number;
  zenyDrop: number;
  element: ElementType;
  isMvp: boolean;
  scale: number;
  color: string;
  drops: { itemId: string; dropRate: number }[];
  skills?: string[];
}

export interface GuildMember {
  id: string;
  name: string;
  job: JobClass;
  level: number;
  role: 'Master' | 'Officer' | 'Veteran' | 'Member';
  contribution: number;
  lastOnline: string;
}

export interface Guild {
  id: string;
  name: string;
  masterId: string;
  level: number;
  exp: number;
  emblem: string; // SVG icon or color code
  notice: string;
  taxRate: number; // percentage
  skills: { [skillId: string]: number };
  members: GuildMember[];
}

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerShopName: string;
  item: Item;
  price: number;
  listedAt: number;
  sold: boolean;
}

export interface PlayerProfile {
  id: string;
  name: string;
  job: JobClass;
  baseLevel: number;
  jobLevel: number;
  baseExp: number;
  jobExp: number;
  zeny: number;
  stats: CharacterStats;
  statPoints: number;
  skillPoints: number;
  equipment: Partial<Record<EquipSlot, Item>>;
  inventory: Item[];
  skills: Skill[];
  guildId?: string;
  pvpRating: number;
  pvpWins: number;
  pvpLosses: number;
  currentZone: 'prontera' | 'field' | 'pyramid' | 'colosseum';
  lastSavedAt: number;
  syncHash: string;
  unlockedHeadgears: string[];
}

export interface HardwareMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  polyCount: number;
  memoryUsageMb: number;
  tier: 'Low' | 'Medium' | 'High' | 'Ultra';
}

export interface AntiCheatStatus {
  verified: boolean;
  lastActionTime: number;
  suspiciousActionCount: number;
  statusText: string;
  integrityHash: string;
}
