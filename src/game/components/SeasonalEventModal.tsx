import React, { useState } from 'react';
import { PlayerProfile, Item } from '../types';
import { sound } from '../audio';

interface SeasonalEventModalProps {
  player: PlayerProfile;
  onClaimReward: (rewardItem: Item) => void;
  onClose: () => void;
}

export const SeasonalEventModal: React.FC<SeasonalEventModalProps> = ({
  player,
  onClaimReward,
  onClose,
}) => {
  const [eventPoints, setEventPoints] = useState(120);
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);

  const seasonalRewards: { id: string; name: string; cost: number; desc: string; icon: string }[] = [
    {
      id: 'rew-golden-poring-hat',
      name: 'Golden Poring Hat [1]',
      cost: 50,
      desc: 'Exclusive seasonal festive headgear. +8 All Stats, +10% Zeny drop.',
      icon: '👑',
    },
    {
      id: 'rew-yggdrasil-berry',
      name: 'Yggdrasil Berry (x5)',
      cost: 30,
      desc: 'Mythical fruit of life. Fully restores 100% HP & SP in battle.',
      icon: '🍒',
    },
    {
      id: 'rew-harvest-wings',
      name: 'Harvest Festival Angel Wings',
      cost: 80,
      desc: 'Glowing golden wings aura with seasonal maple leaf trail.',
      icon: '🪽',
    },
  ];

  const handleClaim = (reward: (typeof seasonalRewards)[0]) => {
    if (eventPoints < reward.cost || claimedRewards.includes(reward.id)) return;
    sound.playLevelUp();
    setEventPoints((p) => p - reward.cost);
    setClaimedRewards((prev) => [...prev, reward.id]);

    const item: Item = {
      id: `seasonal-${Date.now()}`,
      name: reward.name,
      type: reward.id.includes('hat') ? 'headgear' : reward.id.includes('berry') ? 'usable' : 'accessory',
      description: reward.desc,
      icon: 'star',
      price: 10000,
      quantity: 1,
      statsBonus: { str: 4, agi: 4, vit: 4, int: 4, dex: 4, luk: 4 },
    };

    onClaimReward(item);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="seasonal-event-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-r from-amber-900 via-amber-700 to-yellow-600 border-b border-amber-500 flex justify-between items-start text-white">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase bg-slate-950/60 px-2.5 py-0.5 rounded-full text-amber-300">
              Active Seasonal Event
            </span>
            <h2 className="text-xl font-black mt-1">Midgarts Harvest & Poring Festival</h2>
            <p className="text-xs text-amber-100 mt-0.5">
              Celebrate the bounty of Rune-Midgarts! Complete daily festival tasks for exclusive rewards.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Token Balance */}
          <div className="flex justify-between items-center p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-300 font-bold">Your Festival Tokens:</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              🪙 {eventPoints} Festival Coins
            </span>
          </div>

          {/* Event Quests */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Festival Expedition Tasks:
            </span>
            <div className="flex flex-col gap-2">
              {[
                { title: 'Defeat 5 South Field Porings', reward: '25 Coins', done: true },
                { title: 'Harvest 3 Wild Herb Bushes', reward: '20 Coins', done: true },
                { title: 'Refine any piece of Gear at the Blacksmith', reward: '35 Coins', done: true },
                { title: 'Participate in a Colosseum Ranked Duel', reward: '40 Coins', done: true },
              ].map((task) => (
                <div
                  key={task.title}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="text-slate-200">{task.title}</span>
                  </div>
                  <span className="text-amber-400 font-bold font-mono">+{task.reward}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Event Exchange Shop */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Limited Festival Token Exchange:
            </span>
            <div className="flex flex-col gap-2.5">
              {seasonalRewards.map((rew) => {
                const isClaimed = claimedRewards.includes(rew.id);
                return (
                  <div
                    key={rew.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rew.icon}</span>
                      <div>
                        <div className="font-bold text-xs text-slate-100">{rew.name}</div>
                        <div className="text-[10px] text-slate-400">{rew.desc}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={eventPoints < rew.cost || isClaimed}
                      onClick={() => handleClaim(rew)}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs shadow transition-all"
                    >
                      {isClaimed ? 'Claimed ✓' : `${rew.cost} Coins`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
