import {
  CharacterStats,
  DerivedStats,
  ElementType,
  Item,
  JobClass,
  PlayerProfile,
  Skill,
  Monster,
} from './types';

export const ELEMENT_TABLE: Record<ElementType, Partial<Record<ElementType, number>>> = {
  Neutral: { Neutral: 1.0, Shadow: 1.0, Holy: 1.0 },
  Fire: { Earth: 1.5, Water: 0.5, Fire: 0.25, Neutral: 1.0, Shadow: 1.0, Holy: 0.75 },
  Water: { Fire: 1.5, Wind: 0.5, Water: 0.25, Neutral: 1.0, Shadow: 1.0, Holy: 0.75 },
  Wind: { Water: 1.5, Earth: 0.5, Wind: 0.25, Neutral: 1.0, Shadow: 1.0, Holy: 0.75 },
  Earth: { Wind: 1.5, Fire: 0.5, Earth: 0.25, Neutral: 1.0, Shadow: 1.0, Holy: 0.75 },
  Holy: { Shadow: 2.0, Holy: 0.0, Neutral: 1.0, Fire: 1.0, Water: 1.0, Earth: 1.0, Wind: 1.0 },
  Shadow: { Holy: 1.5, Shadow: 0.0, Neutral: 1.0, Fire: 1.0, Water: 1.0, Earth: 1.0, Wind: 1.0 },
};

export function getElementMultiplier(attackElement: ElementType, targetElement: ElementType): number {
  const table = ELEMENT_TABLE[attackElement];
  if (!table) return 1.0;
  return table[targetElement] ?? 1.0;
}

export function calculateDerivedStats(
  baseLevel: number,
  jobLevel: number,
  job: JobClass,
  stats: CharacterStats,
  equipment: Partial<Record<string, Item>>
): DerivedStats {
  // Classic Ragnarok-inspired stat formulas
  let equipAtk = 0;
  let equipMatk = 0;
  let equipDef = 0;
  let equipMdef = 0;
  let bonusStr = 0;
  let bonusAgi = 0;
  let bonusVit = 0;
  let bonusInt = 0;
  let bonusDex = 0;
  let bonusLuk = 0;

  Object.values(equipment).forEach((item) => {
    if (!item) return;
    if (item.atkBonus) {
      equipAtk += item.atkBonus + (item.refineLevel ? item.refineLevel * 5 : 0);
    }
    if (item.matkBonus) {
      equipMatk += item.matkBonus + (item.refineLevel ? item.refineLevel * 4 : 0);
    }
    if (item.defBonus) {
      equipDef += item.defBonus + (item.refineLevel ? item.refineLevel * 2 : 0);
    }
    if (item.statsBonus) {
      bonusStr += item.statsBonus.str ?? 0;
      bonusAgi += item.statsBonus.agi ?? 0;
      bonusVit += item.statsBonus.vit ?? 0;
      bonusInt += item.statsBonus.int ?? 0;
      bonusDex += item.statsBonus.dex ?? 0;
      bonusLuk += item.statsBonus.luk ?? 0;
    }
    // Cards bonuses
    if (item.slottedCards) {
      item.slottedCards.forEach((c) => {
        if (c.bonus.stat) {
          if (c.bonus.stat === 'str') bonusStr += c.bonus.value ?? 0;
          if (c.bonus.stat === 'agi') bonusAgi += c.bonus.value ?? 0;
          if (c.bonus.stat === 'vit') bonusVit += c.bonus.value ?? 0;
          if (c.bonus.stat === 'int') bonusInt += c.bonus.value ?? 0;
          if (c.bonus.stat === 'dex') bonusDex += c.bonus.value ?? 0;
          if (c.bonus.stat === 'luk') bonusLuk += c.bonus.value ?? 0;
        }
      });
    }
  });

  const totalStr = stats.str + bonusStr;
  const totalAgi = stats.agi + bonusAgi;
  const totalVit = stats.vit + bonusVit;
  const totalInt = stats.int + bonusInt;
  const totalDex = stats.dex + bonusDex;
  const totalLuk = stats.luk + bonusLuk;

  // Job class HP/SP multipliers
  const jobHpFactor =
    job === 'Swordsman' || job === 'Knight' ? 1.5 :
    job === 'Acolyte' || job === 'Priest' ? 1.1 :
    job === 'Thief' || job === 'Assassin' ? 1.2 :
    job === 'Archer' || job === 'Hunter' ? 1.15 :
    job === 'Mage' || job === 'Wizard' ? 0.9 : 1.0;

  const jobSpFactor =
    job === 'Mage' || job === 'Wizard' ? 1.8 :
    job === 'Acolyte' || job === 'Priest' ? 1.6 :
    job === 'Archer' || job === 'Hunter' ? 1.2 : 1.0;

  const maxHp = Math.floor((100 + baseLevel * 25 + totalVit * 18) * jobHpFactor);
  const maxSp = Math.floor((30 + baseLevel * 8 + totalInt * 12) * jobSpFactor);

  // Attack: STR contributes base, DEX gives bonus (or vice versa for Archer)
  const isRanged = job === 'Archer' || job === 'Hunter';
  const baseAtk = isRanged
    ? Math.floor(totalDex + Math.pow(totalDex / 10, 2) + totalStr / 5 + totalLuk / 5)
    : Math.floor(totalStr + Math.pow(totalStr / 10, 2) + totalDex / 5 + totalLuk / 5);

  const atk = baseAtk + equipAtk;
  const matk = Math.floor(totalInt + Math.pow(totalInt / 8, 2) + equipMatk);

  // Defense: Soft def from VIT, Hard def from Equipment
  const def = Math.floor(totalVit * 0.7 + equipDef);
  const mdef = Math.floor(totalInt * 0.5 + equipMdef);

  // Accuracy: 175 + BaseLevel + DEX + LUK/3
  const hit = Math.floor(175 + baseLevel + totalDex + totalLuk / 3);

  // Flee: 100 + BaseLevel + AGI + LUK/5
  const flee = Math.floor(100 + baseLevel + totalAgi + totalLuk / 5);

  // ASPD: 150 + AGI * 0.35 + DEX * 0.15
  const aspd = Math.min(190, Math.floor(150 + totalAgi * 0.4 + totalDex * 0.15));

  // Critical Rate: 1 + LUK * 0.3
  const critRate = Math.min(100, Math.max(1, Math.floor(1 + totalLuk * 0.35)));

  return {
    maxHp,
    maxSp,
    hp: maxHp,
    sp: maxSp,
    atk,
    matk,
    def,
    mdef,
    hit,
    flee,
    aspd,
    critRate,
  };
}

export function calculateHitChance(attackerHit: number, targetFlee: number): number {
  const chance = 80 + (attackerHit - targetFlee);
  return Math.min(95, Math.max(5, chance));
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isHit: boolean;
  elementMultiplier: number;
}

export function calculateTurnDamage(
  attackerAtk: number,
  attackerMatk: number,
  attackerHit: number,
  attackerCritRate: number,
  targetDef: number,
  targetMdef: number,
  targetFlee: number,
  attackElement: ElementType,
  targetElement: ElementType,
  skill?: Skill
): DamageResult {
  const hitChance = calculateHitChance(attackerHit, targetFlee);
  const rollHit = Math.random() * 100;
  const isHit = rollHit <= hitChance;

  if (!isHit) {
    return { damage: 0, isCrit: false, isHit: false, elementMultiplier: 1.0 };
  }

  const rollCrit = Math.random() * 100;
  const isCrit = rollCrit <= attackerCritRate;

  const elementMultiplier = getElementMultiplier(
    skill ? skill.element : attackElement,
    targetElement
  );

  let rawDamage = 0;
  if (skill?.isMagic) {
    // Magic damage scales with MATK and bypasses normal DEF, reduced by MDEF
    const baseMagic = attackerMatk * (skill.damageMultiplier || 1.0);
    rawDamage = Math.max(1, baseMagic - targetMdef * 0.8);
  } else {
    // Physical damage: Crit bypasses target DEF!
    const multiplier = skill ? skill.damageMultiplier : 1.0;
    const basePhys = attackerAtk * multiplier;
    if (isCrit) {
      rawDamage = basePhys * 1.4; // 140% crit multiplier, ignores DEF
    } else {
      const defReduction = Math.max(0.15, 1 - targetDef / (targetDef + 120));
      rawDamage = Math.max(1, basePhys * defReduction);
    }
  }

  const finalDamage = Math.max(1, Math.floor(rawDamage * elementMultiplier));
  return {
    damage: finalDamage,
    isCrit,
    isHit: true,
    elementMultiplier,
  };
}

export function executeMarketTrade(
  buyerZeny: number,
  sellerZeny: number,
  itemPrice: number,
  taxRatePercent = 2
): { success: boolean; newBuyerZeny: number; newSellerZeny: number; taxCollected: number; error?: string } {
  if (buyerZeny < itemPrice) {
    return {
      success: false,
      newBuyerZeny: buyerZeny,
      newSellerZeny: sellerZeny,
      taxCollected: 0,
      error: 'Insufficient Zeny for transaction',
    };
  }

  const taxCollected = Math.floor((itemPrice * taxRatePercent) / 100);
  const sellerReceives = itemPrice - taxCollected;

  return {
    success: true,
    newBuyerZeny: buyerZeny - itemPrice,
    newSellerZeny: sellerZeny + sellerReceives,
    taxCollected,
  };
}

export function verifyAntiCheatAction(
  lastTimestamp: number,
  currentTimestamp: number,
  minIntervalMs = 250
): { valid: boolean; reason?: string } {
  const delta = currentTimestamp - lastTimestamp;
  if (delta < 0) {
    return { valid: false, reason: 'Negative time drift detected (clock manipulation)' };
  }
  if (delta < minIntervalMs) {
    return { valid: false, reason: `Action rate too fast (${delta}ms < ${minIntervalMs}ms minimum)` };
  }
  return { valid: true };
}

export function generateSaveHash(profile: Partial<PlayerProfile>): string {
  const payload = `${profile.id}:${profile.name}:${profile.baseLevel}:${profile.zeny}:${profile.stats?.str}:${profile.stats?.agi}:${profile.stats?.vit}`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `AEGIS-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}
