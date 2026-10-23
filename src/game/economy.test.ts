import test from 'node:test';
import assert from 'node:assert/strict';
import { executeGathering, executeCrafting, CRAFTING_RECIPES, GatheringNode } from './economy';
import { Item } from './types';

test('executeGathering yields items and enforces cooldown', () => {
  const testNode: GatheringNode = {
    id: 'test-node-1',
    name: 'Test Herb',
    type: 'herb',
    position: { x: 0, z: 0 },
    color: '#ff0000',
    cooldownSeconds: 10,
    lastGathered: 0,
    yields: [
      { itemId: 'mat-red-herb', name: 'Red Herb', type: 'material', min: 2, max: 2, chance: 1.0, icon: 'herb' },
    ],
  };

  const res1 = executeGathering(testNode, 20);
  assert.equal(res1.success, true);
  assert.equal(res1.gatheredItems.length, 1);
  assert.equal(res1.gatheredItems[0].name, 'Red Herb');

  // Immediately try again -> should be blocked by cooldown
  const res2 = executeGathering(testNode, 20);
  assert.equal(res2.success, false);
  assert.ok(res2.message.includes('depleted'));
});

test('executeCrafting consumes ingredients and produces Red Potion', () => {
  const recipe = CRAFTING_RECIPES.find((r) => r.id === 'rcp-red-potion')!;
  const inventory: Item[] = [
    {
      id: 'mat-red-herb',
      name: 'Red Herb',
      type: 'material',
      description: 'Herbal ingredient',
      icon: 'herb',
      price: 15,
      quantity: 5,
    },
  ];

  const zeny = 500;
  const result = executeCrafting(recipe, inventory, zeny);

  assert.equal(result.success, true);
  assert.equal(result.newZeny, zeny - recipe.zenyCost);
  // Red herb should be reduced from 5 to 3
  const remainingHerb = result.updatedInventory.find((i) => i.name === 'Red Herb');
  assert.equal(remainingHerb?.quantity, 3);
  // Created item should be present
  assert.ok(result.createdItem);
  assert.equal(result.createdItem.name, 'Red Potion');
});

test('executeCrafting fails gracefully when lacking materials or zeny', () => {
  const recipe = CRAFTING_RECIPES.find((r) => r.id === 'rcp-knight-broadsword')!;
  const emptyInventory: Item[] = [];
  const result = executeCrafting(recipe, emptyInventory, 10000);

  assert.equal(result.success, false);
  assert.ok(result.error?.includes('Missing required ingredient'));
});
