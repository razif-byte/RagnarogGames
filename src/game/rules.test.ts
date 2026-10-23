import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDerivedStats,
  calculateHitChance,
  calculateTurnDamage,
  getElementMultiplier,
  executeMarketTrade,
  verifyAntiCheatAction,
  generateSaveHash,
} from './rules';
import { CharacterStats, Item } from './types';

test('calculateDerivedStats computes standard Ragnarok stats properly', () => {
  const baseStats: CharacterStats = {
    str: 50,
    agi: 40,
    vit: 30,
    int: 10,
    dex: 35,
    luk: 20,
  };

  const sword: Item = {
    id: 'weapon-1',
    name: 'Saber',
    type: 'weapon',
    description: 'A sharp blade',
    icon: 'sword',
    price: 1500,
    atkBonus: 45,
    refineLevel: 4,
  };

  const derived = calculateDerivedStats(50, 40, 'Swordsman', baseStats, { weapon: sword });
  assert.ok(derived.maxHp > 1000, 'Max HP should be substantial for level 50 Swordsman');
  assert.ok(derived.atk > 100, 'Attack should include STR base and weapon refine');
  assert.ok(derived.flee > 150, 'Flee should scale with Agi and Base Level');
  assert.ok(derived.hit > 200, 'Hit should scale with Dex and Base Level');
});

test('getElementMultiplier gives 1.5x on Fire vs Earth and 0.5x on Fire vs Water', () => {
  assert.equal(getElementMultiplier('Fire', 'Earth'), 1.5);
  assert.equal(getElementMultiplier('Fire', 'Water'), 0.5);
  assert.equal(getElementMultiplier('Holy', 'Shadow'), 2.0);
  assert.equal(getElementMultiplier('Neutral', 'Neutral'), 1.0);
});

test('calculateHitChance clamps between 5% and 95%', () => {
  assert.equal(calculateHitChance(300, 100), 95); // Capped at 95%
  assert.equal(calculateHitChance(50, 200), 5); // Floored at 5%
  assert.equal(calculateHitChance(180, 180), 80); // Base 80%
});

test('executeMarketTrade conducts atomic Zeny transfer with fair tax', () => {
  const buyerZeny = 50000;
  const sellerZeny = 10000;
  const itemPrice = 20000;
  const taxRate = 2; // 2% tax

  const result = executeMarketTrade(buyerZeny, sellerZeny, itemPrice, taxRate);
  assert.equal(result.success, true);
  assert.equal(result.newBuyerZeny, 30000);
  assert.equal(result.taxCollected, 400); // 2% of 20000
  assert.equal(result.newSellerZeny, 29600); // 10000 + 20000 - 400
});

test('executeMarketTrade fails when buyer has insufficient funds', () => {
  const result = executeMarketTrade(500, 10000, 2000);
  assert.equal(result.success, false);
  assert.equal(result.newBuyerZeny, 500);
});

test('verifyAntiCheatAction flags actions fired too quickly or backwards in time', () => {
  // Normal spacing (500ms)
  assert.equal(verifyAntiCheatAction(1000, 1500, 250).valid, true);

  // Microsecond macro spam (20ms)
  const spam = verifyAntiCheatAction(1000, 1020, 250);
  assert.equal(spam.valid, false);

  // Time manipulation backward
  const rewind = verifyAntiCheatAction(2000, 1500, 250);
  assert.equal(rewind.valid, false);
});

test('generateSaveHash generates deterministic tamper-proof key', () => {
  const profile = {
    id: 'user-001',
    name: 'KafraKnight',
    baseLevel: 45,
    zeny: 125000,
    stats: { str: 60, agi: 40, vit: 30, int: 1, dex: 30, luk: 1 },
  };

  const hash1 = generateSaveHash(profile);
  const hash2 = generateSaveHash(profile);
  assert.equal(hash1, hash2);
  assert.ok(hash1.startsWith('AEGIS-'));
});
