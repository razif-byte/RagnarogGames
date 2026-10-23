export type Race = 'Human' | 'Doram' | 'Valkyrie' | 'Elf';
export type Gender = 'Male' | 'Female' | 'Non-Binary';

export interface CharacterAppearance {
  race: Race;
  gender: Gender;
  hairStyle: string;
  hairColor: string;
  facialFeature: string;
  skinTone: string;
  outfitChoice: string;
  accessory: string;
  personality: string;
}

export const RACE_OPTIONS: { id: Race; name: string; desc: string; icon: string }[] = [
  { id: 'Human', name: 'Midgarts Human', desc: 'Adaptable and resilient children of Rune-Midgarts.', icon: '🛡️' },
  { id: 'Doram', name: 'Doram (Feline)', desc: 'Agile cat-folk with natural curiosity and beast vitality.', icon: '🐾' },
  { id: 'Valkyrie', name: 'Valkyrie Celestial', desc: 'Divine lineage blessed with sacred radiance.', icon: '🪽' },
  { id: 'Elf', name: 'Fay Elf', desc: 'Ancient woodland dwellers gifted with deep elemental mana.', icon: '🌿' },
];

export const GENDER_OPTIONS: Gender[] = ['Male', 'Female', 'Non-Binary'];

export const HAIRSTYLES = [
  { id: 'spiky', name: 'Spiky Adventurer' },
  { id: 'twintails', name: 'Twin Tails' },
  { id: 'ponytail', name: 'Knight Ponytail' },
  { id: 'bob', name: 'Mage Bob Cut' },
  { id: 'wild', name: 'Wild Wolf' },
  { id: 'shaggy', name: 'Shaggy Thief' },
  { id: 'braid', name: 'Sacred Braid' },
];

export const HAIR_COLORS = [
  { id: 'blonde', name: 'Golden Blonde', hex: '#fbbf24' },
  { id: 'crimson', name: 'Crimson Red', hex: '#dc2626' },
  { id: 'blue', name: 'Deep Sapphire', hex: '#2563eb' },
  { id: 'green', name: 'Emerald Wind', hex: '#16a34a' },
  { id: 'black', name: 'Raven Black', hex: '#18181b' },
  { id: 'silver', name: 'Silver White', hex: '#e2e8f0' },
  { id: 'pink', name: 'Sakura Pink', hex: '#f472b6' },
];

export const SKIN_TONES = [
  { id: 'fair', name: 'Fair Ivory', hex: '#ffe4c4' },
  { id: 'peach', name: 'Sun-kissed Peach', hex: '#ffd1a4' },
  { id: 'bronze', name: 'Warm Bronze', hex: '#c68642' },
  { id: 'espresso', name: 'Deep Espresso', hex: '#8d5524' },
  { id: 'moonlit', name: 'Pale Moonlit', hex: '#e2e8f0' },
];

export const FACIAL_EXPRESSIONS = [
  { id: 'hero', name: 'Determined Hero', icon: '✨' },
  { id: 'smile', name: 'Gentle Smile', icon: '😊' },
  { id: 'fierce', name: 'Fierce Warrior', icon: '🔥' },
  { id: 'wink', name: 'Playful Wink', icon: '😉' },
  { id: 'stoic', name: 'Mysterious Stoic', icon: '👁️' },
];

export const OUTFIT_CHOICES = [
  { id: 'novice_tunic', name: 'Novice Leather Tunic', color: '#3b82f6', desc: 'Classic lightweight explorer tunic.' },
  { id: 'apprentice_robe', name: 'Apprentice Silk Robe', color: '#8b5cf6', desc: 'Embroidered mana-infused robes.' },
  { id: 'scout_vest', name: 'Scout Hunter Vest', color: '#10b981', desc: 'Supple leather suited for agile movement.' },
  { id: 'acolyte_vestment', name: 'Acolyte Holy Vestment', color: '#f59e0b', desc: 'Blessed ceremonial robes of the sanctuary.' },
  { id: 'traveler_plate', name: 'Iron Traveler Plate', color: '#64748b', desc: 'Sturdy steel breastplate offering solid protection.' },
];

export const ACCESSORY_CHOICES = [
  { id: 'none', name: 'None' },
  { id: 'poring_band', name: 'Poring Headband' },
  { id: 'cat_ears', name: 'Feline Ears' },
  { id: 'goggles', name: 'Aviator Goggles' },
  { id: 'feather_cap', name: 'Feathered Cap' },
  { id: 'ribbon', name: 'Silk Hair Ribbon' },
];

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  race: 'Human',
  gender: 'Female',
  hairStyle: 'spiky',
  hairColor: '#fbbf24',
  facialFeature: 'hero',
  skinTone: '#ffe4c4',
  outfitChoice: 'novice_tunic',
  accessory: 'poring_band',
  personality: 'Cheerful',
};
