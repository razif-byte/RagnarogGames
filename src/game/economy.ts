import { Item } from './types';

export interface GatheringNode {
  id: string;
  name: string;
  type: 'herb' | 'ore' | 'wood' | 'spring';
  position: { x: number; z: number };
  color: string;
  cooldownSeconds: number;
  lastGathered: number;
  yields: { itemId: string; name: string; type: Item['type']; min: number; max: number; chance: number; icon: string }[];
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'potion' | 'weapon' | 'armor' | 'material';
  requiredLevel: number;
  ingredients: { itemId: string; name: string; quantity: number }[];
  result: Item;
  zenyCost: number;
  successRate: number; // 0 to 1
}

export const OPEN_WORLD_NODES: GatheringNode[] = [
  {
    id: 'node-herb-1',
    name: 'Wild Red Herb Bush',
    type: 'herb',
    position: { x: -16, z: 28 },
    color: '#ef4444',
    cooldownSeconds: 15,
    lastGathered: 0,
    yields: [
      { itemId: 'mat-red-herb', name: 'Red Herb', type: 'material', min: 1, max: 3, chance: 1.0, icon: 'herb' },
      { itemId: 'mat-clover', name: 'Four-Leaf Clover', type: 'material', min: 1, max: 1, chance: 0.15, icon: 'leaf' },
    ],
  },
  {
    id: 'node-herb-2',
    name: 'Mystic White Herb Patch',
    type: 'herb',
    position: { x: 18, z: 34 },
    color: '#f8fafc',
    cooldownSeconds: 20,
    lastGathered: 0,
    yields: [
      { itemId: 'mat-white-herb', name: 'White Herb', type: 'material', min: 1, max: 2, chance: 0.9, icon: 'herb' },
      { itemId: 'mat-blue-herb', name: 'Blue Herb', type: 'material', min: 1, max: 1, chance: 0.3, icon: 'herb' },
    ],
  },
  {
    id: 'node-ore-1',
    name: 'Rich Iron Ore Deposit',
    type: 'ore',
    position: { x: -26, z: 45 },
    color: '#94a3b8',
    cooldownSeconds: 25,
    lastGathered: 0,
    yields: [
      { itemId: 'mat-iron-ore', name: 'Iron Ore', type: 'material', min: 2, max: 4, chance: 1.0, icon: 'ore' },
      { itemId: 'mat-rough-oridecon', name: 'Rough Oridecon', type: 'material', min: 1, max: 1, chance: 0.35, icon: 'gem' },
    ],
  },
  {
    id: 'node-ore-2',
    name: 'Elunium Crystal Seam',
    type: 'ore',
    position: { x: 28, z: 48 },
    color: '#38bdf8',
    cooldownSeconds: 30,
    lastGathered: 0,
    yields: [
      { itemId: 'mat-rough-elunium', name: 'Rough Elunium', type: 'material', min: 1, max: 2, chance: 0.8, icon: 'gem' },
      { itemId: 'mat-star-crumb', name: 'Star Crumb', type: 'material', min: 1, max: 1, chance: 0.2, icon: 'star' },
    ],
  },
  {
    id: 'node-wood-1',
    name: 'Ancient Prontera Cedar',
    type: 'wood',
    position: { x: 8, z: 62 },
    color: '#78350f',
    cooldownSeconds: 18,
    lastGathered: 0,
    yields: [
      { itemId: 'mat-timber', name: 'Hardwood Timber', type: 'material', min: 2, max: 5, chance: 1.0, icon: 'wood' },
      { itemId: 'mat-sap', name: 'Aromatic Tree Resin', type: 'material', min: 1, max: 2, chance: 0.4, icon: 'drop' },
    ],
  },
];

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // 1. Alchemy: Red Potion
  {
    id: 'rcp-red-potion',
    name: 'Craft Red Potion (x3)',
    category: 'potion',
    requiredLevel: 1,
    ingredients: [
      { itemId: 'mat-red-herb', name: 'Red Herb', quantity: 2 },
    ],
    result: {
      id: 'pot-red-crafted',
      name: 'Red Potion',
      type: 'usable',
      description: 'Restores 120 HP when consumed. Freshly brewed.',
      icon: 'potion-red',
      price: 50,
      hpRecover: 120,
      quantity: 3,
    },
    zenyCost: 30,
    successRate: 0.95,
  },
  // 2. Alchemy: White Potion
  {
    id: 'rcp-white-potion',
    name: 'Brew Potent White Potion',
    category: 'potion',
    requiredLevel: 5,
    ingredients: [
      { itemId: 'mat-white-herb', name: 'White Herb', quantity: 2 },
      { itemId: 'mat-sap', name: 'Aromatic Tree Resin', quantity: 1 },
    ],
    result: {
      id: 'pot-white-crafted',
      name: 'White Potion',
      type: 'usable',
      description: 'Potent elixir restoring 350 HP instantly.',
      icon: 'potion-white',
      price: 180,
      hpRecover: 350,
      quantity: 2,
    },
    zenyCost: 80,
    successRate: 0.9,
  },
  // 3. Alchemy: Blue Potion
  {
    id: 'rcp-blue-potion',
    name: 'Distill Blue Mana Draught',
    category: 'potion',
    requiredLevel: 8,
    ingredients: [
      { itemId: 'mat-blue-herb', name: 'Blue Herb', quantity: 2 },
      { itemId: 'mat-clover', name: 'Four-Leaf Clover', quantity: 1 },
    ],
    result: {
      id: 'pot-blue-crafted',
      name: 'Blue Potion',
      type: 'usable',
      description: 'Restores 80 SP for casting powerful spells.',
      icon: 'potion-blue',
      price: 320,
      spRecover: 80,
      quantity: 2,
    },
    zenyCost: 150,
    successRate: 0.85,
  },
  // 4. Blacksmith: Smelt Pure Oridecon
  {
    id: 'rcp-smelt-oridecon',
    name: 'Smelt Pure Oridecon',
    category: 'material',
    requiredLevel: 10,
    ingredients: [
      { itemId: 'mat-rough-oridecon', name: 'Rough Oridecon', quantity: 3 },
      { itemId: 'mat-iron-ore', name: 'Iron Ore', quantity: 1 },
    ],
    result: {
      id: 'mat-oridecon',
      name: 'Oridecon',
      type: 'material',
      description: 'Sacred purified metal for weapon forging and refining.',
      icon: 'gem',
      price: 600,
      quantity: 1,
    },
    zenyCost: 200,
    successRate: 1.0,
  },
  // 5. Blacksmith: Smelt Pure Elunium
  {
    id: 'rcp-smelt-elunium',
    name: 'Smelt Pure Elunium',
    category: 'material',
    requiredLevel: 10,
    ingredients: [
      { itemId: 'mat-rough-elunium', name: 'Rough Elunium', quantity: 3 },
      { itemId: 'mat-iron-ore', name: 'Iron Ore', quantity: 1 },
    ],
    result: {
      id: 'mat-elunium',
      name: 'Elunium',
      type: 'material',
      description: 'Purified mineral used to reinforce armor.',
      icon: 'gem',
      price: 750,
      quantity: 1,
    },
    zenyCost: 250,
    successRate: 1.0,
  },
  // 6. Forging: Knight Broadsword
  {
    id: 'rcp-knight-broadsword',
    name: 'Forge Knight Broadsword',
    category: 'weapon',
    requiredLevel: 12,
    ingredients: [
      { itemId: 'mat-iron-ore', name: 'Iron Ore', quantity: 6 },
      { itemId: 'mat-timber', name: 'Hardwood Timber', quantity: 4 },
      { itemId: 'mat-oridecon', name: 'Oridecon', quantity: 1 },
    ],
    result: {
      id: 'wpn-knight-sword',
      name: 'Knight Broadsword',
      type: 'weapon',
      description: 'A heavy balanced blade. ATK +75, STR +5.',
      icon: 'sword',
      price: 8500,
      equipSlot: 'weapon',
      atkBonus: 75,
      statsBonus: { str: 5 },
      refineLevel: 0,
    },
    zenyCost: 1200,
    successRate: 0.85,
  },
  // 7. Forging: Steel Guard Shield
  {
    id: 'rcp-steel-shield',
    name: 'Forge Steel Buckler',
    category: 'armor',
    requiredLevel: 10,
    ingredients: [
      { itemId: 'mat-iron-ore', name: 'Iron Ore', quantity: 5 },
      { itemId: 'mat-elunium', name: 'Elunium', quantity: 1 },
    ],
    result: {
      id: 'shield-steel-buckler',
      name: 'Steel Buckler',
      type: 'shield',
      description: 'Reinforced shield. DEF +18, VIT +3.',
      icon: 'shield',
      price: 6500,
      equipSlot: 'shield',
      defBonus: 18,
      statsBonus: { vit: 3 },
      refineLevel: 0,
    },
    zenyCost: 950,
    successRate: 0.9,
  },
];

export function executeGathering(
  node: GatheringNode,
  playerLuk: number
): { success: boolean; gatheredItems: Item[]; message: string } {
  const now = Date.now();
  const elapsed = (now - node.lastGathered) / 1000;
  if (elapsed < node.cooldownSeconds) {
    const remaining = Math.ceil(node.cooldownSeconds - elapsed);
    return {
      success: false,
      gatheredItems: [],
      message: `${node.name} is depleted. Respawning in ${remaining}s...`,
    };
  }

  node.lastGathered = now;
  const gatheredItems: Item[] = [];

  // Luk increases bonus yield chance
  const luckBonus = playerLuk * 0.005;

  node.yields.forEach((y) => {
    const roll = Math.random();
    if (roll <= y.chance + luckBonus) {
      const count = Math.floor(Math.random() * (y.max - y.min + 1)) + y.min;
      gatheredItems.push({
        id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: y.name,
        type: y.type,
        description: `Gathered from ${node.name}.`,
        icon: y.icon,
        price: 40,
        quantity: count,
      });
    }
  });

  return {
    success: true,
    gatheredItems,
    message: `Harvested from ${node.name}!`,
  };
}

export function executeCrafting(
  recipe: CraftingRecipe,
  inventory: Item[],
  playerZeny: number
): { success: boolean; updatedInventory: Item[]; newZeny: number; createdItem?: Item; error?: string } {
  if (playerZeny < recipe.zenyCost) {
    return { success: false, updatedInventory: inventory, newZeny: playerZeny, error: 'Insufficient Zeny for crafting fee.' };
  }

  // Check ingredients
  const newInventory = inventory.map((i) => ({ ...i }));
  for (const ing of recipe.ingredients) {
    const found = newInventory.find((item) => item.name.toLowerCase() === ing.name.toLowerCase() || item.id === ing.itemId);
    if (!found || (found.quantity ?? 1) < ing.quantity) {
      return { success: false, updatedInventory: inventory, newZeny: playerZeny, error: `Missing required ingredient: ${ing.name} (x${ing.quantity})` };
    }
  }

  // Deduct ingredients
  for (const ing of recipe.ingredients) {
    const idx = newInventory.findIndex((item) => item.name.toLowerCase() === ing.name.toLowerCase() || item.id === ing.itemId);
    if (idx >= 0) {
      const q = newInventory[idx].quantity ?? 1;
      if (q > ing.quantity) {
        newInventory[idx].quantity = q - ing.quantity;
      } else {
        newInventory.splice(idx, 1);
      }
    }
  }

  // Success roll
  const roll = Math.random();
  if (roll <= recipe.successRate) {
    const craftedItem: Item = {
      ...recipe.result,
      id: `crafted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    newInventory.push(craftedItem);
    return {
      success: true,
      updatedInventory: newInventory,
      newZeny: playerZeny - recipe.zenyCost,
      createdItem: craftedItem,
    };
  } else {
    return {
      success: false,
      updatedInventory: newInventory,
      newZeny: playerZeny - recipe.zenyCost,
      error: 'Crafting failed! Materials were consumed during forging.',
    };
  }
}
