import { PlayerProfile, Item } from './types';

export type QuestType = 'hunt' | 'gather' | 'craft' | 'refine' | 'arena' | 'market';

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  targetKey: string; // e.g. 'poring', 'herb', 'potion', etc.
  currentCount: number;
  targetCount: number;
  zenyReward: number;
  expReward: number;
  itemReward?: Item;
  status: 'active' | 'completed' | 'claimed';
}

export const QUEST_POOL: Omit<DailyQuest, 'currentCount' | 'status'>[] = [
  {
    id: 'q-hunt-poring',
    title: 'Poring Extermination',
    description: 'Defeat 3 bouncing Porings in Prontera South Field.',
    type: 'hunt',
    targetKey: 'poring',
    targetCount: 3,
    zenyReward: 2500,
    expReward: 600,
  },
  {
    id: 'q-hunt-fabre',
    title: 'Wild Caterpillar Cull',
    description: 'Defeat 2 Fabres in the forest undergrowth.',
    type: 'hunt',
    targetKey: 'fabre',
    targetCount: 2,
    zenyReward: 2800,
    expReward: 700,
  },
  {
    id: 'q-hunt-lunatic',
    title: 'Lunatic Meadow Watch',
    description: 'Defeat 2 Lunatics roaming the south plains.',
    type: 'hunt',
    targetKey: 'lunatic',
    targetCount: 2,
    zenyReward: 3000,
    expReward: 750,
  },
  {
    id: 'q-gather-herb',
    title: 'Botanist Herbalist',
    description: 'Harvest 2 wild herb bushes (Red or White herbs).',
    type: 'gather',
    targetKey: 'herb',
    targetCount: 2,
    zenyReward: 2200,
    expReward: 500,
  },
  {
    id: 'q-gather-ore',
    title: 'Deep Vein Prospector',
    description: 'Mine 2 ore deposits (Iron or Elunium minerals).',
    type: 'gather',
    targetKey: 'ore',
    targetCount: 2,
    zenyReward: 3200,
    expReward: 650,
  },
  {
    id: 'q-craft-potion',
    title: 'Alchemical Brewing',
    description: 'Synthesize 1 potion formula at the Alchemy Workshop.',
    type: 'craft',
    targetKey: 'potion',
    targetCount: 1,
    zenyReward: 2600,
    expReward: 550,
  },
  {
    id: 'q-refine-gear',
    title: 'Blacksmith Anvil Strike',
    description: 'Refine any weapon or armor piece with the blacksmith.',
    type: 'refine',
    targetKey: 'refine',
    targetCount: 1,
    zenyReward: 4000,
    expReward: 900,
  },
  {
    id: 'q-arena-duel',
    title: 'Colosseum Gladiator',
    description: 'Challenge a rival in a 1v1 Ranked Tournament Duel.',
    type: 'arena',
    targetKey: 'arena',
    targetCount: 1,
    zenyReward: 3500,
    expReward: 800,
  },
];

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function generateDailyQuests(seedDateStr: string = getTodayDateString()): DailyQuest[] {
  // Simple deterministic hash based on date string so all players have consistent daily quests
  let hash = 0;
  for (let i = 0; i < seedDateStr.length; i++) {
    hash = (hash << 5) - hash + seedDateStr.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  // Pick 3 non-overlapping quests from the pool
  const poolCopy = [...QUEST_POOL];
  const selected: DailyQuest[] = [];

  for (let i = 0; i < 3; i++) {
    const idx = (absHash + i * 3) % poolCopy.length;
    const base = poolCopy.splice(idx, 1)[0];
    selected.push({
      ...base,
      currentCount: 0,
      status: 'active',
    });
  }

  return selected;
}

export function updateQuestProgress(
  currentQuests: DailyQuest[],
  type: QuestType,
  targetKey: string,
  amount: number = 1
): { quests: DailyQuest[]; newlyCompleted: DailyQuest[] } {
  const newlyCompleted: DailyQuest[] = [];

  const updatedQuests = currentQuests.map((q) => {
    if (q.status !== 'active') return q;

    const matchesType = q.type === type;
    const matchesTarget = q.targetKey === targetKey || q.targetKey === 'any';

    if (matchesType && matchesTarget) {
      const nextCount = Math.min(q.targetCount, q.currentCount + amount);
      const isNowCompleted = nextCount >= q.targetCount;
      const updated: DailyQuest = {
        ...q,
        currentCount: nextCount,
        status: isNowCompleted ? 'completed' : 'active',
      };
      if (isNowCompleted) {
        newlyCompleted.push(updated);
      }
      return updated;
    }
    return q;
  });

  return { quests: updatedQuests, newlyCompleted };
}

export function claimQuestReward(
  questId: string,
  quests: DailyQuest[],
  player: PlayerProfile
): { updatedQuests: DailyQuest[]; updatedPlayer: PlayerProfile; claimedQuest?: DailyQuest } {
  let claimedQuest: DailyQuest | undefined;

  const updatedQuests = quests.map((q) => {
    if (q.id === questId && q.status === 'completed') {
      claimedQuest = q;
      return { ...q, status: 'claimed' as const };
    }
    return q;
  });

  if (!claimedQuest) {
    return { updatedQuests: quests, updatedPlayer: player };
  }

  const updatedPlayer: PlayerProfile = {
    ...player,
    zeny: player.zeny + claimedQuest.zenyReward,
    baseExp: player.baseExp + claimedQuest.expReward,
  };

  return { updatedQuests, updatedPlayer, claimedQuest };
}

export function checkAllDailyQuestsClaimed(quests: DailyQuest[]): boolean {
  return quests.length > 0 && quests.every((q) => q.status === 'claimed');
}
