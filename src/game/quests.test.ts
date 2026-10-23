import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateDailyQuests,
  updateQuestProgress,
  claimQuestReward,
  checkAllDailyQuestsClaimed,
  DailyQuest,
} from './quests';
import { PlayerProfile } from './types';
import { INITIAL_PLAYER } from './constants';

test('generateDailyQuests returns 3 distinct active daily tasks', () => {
  const quests = generateDailyQuests('2026-10-23');
  assert.equal(quests.length, 3);
  const ids = new Set(quests.map((q) => q.id));
  assert.equal(ids.size, 3, 'All 3 quests should be distinct');
  assert.ok(quests.every((q) => q.status === 'active' && q.currentCount === 0));
});

test('updateQuestProgress advances progress and marks completion when threshold reached', () => {
  const initialQuests: DailyQuest[] = [
    {
      id: 'q-hunt-poring',
      title: 'Poring Hunt',
      description: 'Defeat 2 Porings',
      type: 'hunt',
      targetKey: 'poring',
      targetCount: 2,
      currentCount: 0,
      zenyReward: 2000,
      expReward: 500,
      status: 'active',
    },
  ];

  // Defeat 1st poring
  const step1 = updateQuestProgress(initialQuests, 'hunt', 'poring', 1);
  assert.equal(step1.quests[0].currentCount, 1);
  assert.equal(step1.quests[0].status, 'active');
  assert.equal(step1.newlyCompleted.length, 0);

  // Defeat 2nd poring -> completion!
  const step2 = updateQuestProgress(step1.quests, 'hunt', 'poring', 1);
  assert.equal(step2.quests[0].currentCount, 2);
  assert.equal(step2.quests[0].status, 'completed');
  assert.equal(step2.newlyCompleted.length, 1);
  assert.equal(step2.newlyCompleted[0].id, 'q-hunt-poring');
});

test('claimQuestReward awards Zeny and EXP to the player profile', () => {
  const completedQuests: DailyQuest[] = [
    {
      id: 'q-hunt-poring',
      title: 'Poring Hunt',
      description: 'Defeat 2 Porings',
      type: 'hunt',
      targetKey: 'poring',
      targetCount: 2,
      currentCount: 2,
      zenyReward: 2500,
      expReward: 600,
      status: 'completed',
    },
  ];

  const initialPlayer: PlayerProfile = {
    ...INITIAL_PLAYER,
    zeny: 1000,
    baseExp: 200,
  };

  const result = claimQuestReward('q-hunt-poring', completedQuests, initialPlayer);
  assert.equal(result.updatedQuests[0].status, 'claimed');
  assert.equal(result.updatedPlayer.zeny, 3500); // 1000 + 2500
  assert.equal(result.updatedPlayer.baseExp, 800); // 200 + 600
  assert.ok(result.claimedQuest);
});

test('checkAllDailyQuestsClaimed validates daily bonus eligibility', () => {
  const quests: DailyQuest[] = [
    { id: '1', title: 'Q1', description: '', type: 'hunt', targetKey: 'a', targetCount: 1, currentCount: 1, zenyReward: 100, expReward: 100, status: 'claimed' },
    { id: '2', title: 'Q2', description: '', type: 'gather', targetKey: 'b', targetCount: 1, currentCount: 1, zenyReward: 100, expReward: 100, status: 'claimed' },
    { id: '3', title: 'Q3', description: '', type: 'craft', targetKey: 'c', targetCount: 1, currentCount: 1, zenyReward: 100, expReward: 100, status: 'claimed' },
  ];

  assert.equal(checkAllDailyQuestsClaimed(quests), true);

  quests[1].status = 'completed';
  assert.equal(checkAllDailyQuestsClaimed(quests), false);
});
