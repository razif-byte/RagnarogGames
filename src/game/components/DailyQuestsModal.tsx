import React, { useState } from 'react';
import { DailyQuest, checkAllDailyQuestsClaimed } from '../quests';
import { PlayerProfile } from '../types';
import { sound } from '../audio';

interface DailyQuestsModalProps {
  quests: DailyQuest[];
  player: PlayerProfile;
  hasClaimedDailyBonus: boolean;
  onClaimQuest: (questId: string) => void;
  onClaimDailyBonus: () => void;
  onClose: () => void;
}

export const DailyQuestsModal: React.FC<DailyQuestsModalProps> = ({
  quests,
  player,
  hasClaimedDailyBonus,
  onClaimQuest,
  onClaimDailyBonus,
  onClose,
}) => {
  const allClaimed = checkAllDailyQuestsClaimed(quests);
  const completedCount = quests.filter((q) => q.status === 'completed' || q.status === 'claimed').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="daily-quests-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <div className="text-base font-black uppercase tracking-wider text-amber-400">
                Daily Adventurer Bulletin
              </div>
              <div className="text-[10px] text-slate-400">
                3 Mini-Tasks Available Daily · Resets at 00:00 Server Time
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Overview Bar */}
        <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold">Daily Completion:</span>
            <span className="font-mono font-bold text-amber-400">
              {completedCount} / 3 Tasks Complete
            </span>
          </div>

          <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Quest List */}
        <div className="p-6 flex flex-col gap-3.5 overflow-y-auto">
          {quests.map((quest) => {
            const isCompleted = quest.status === 'completed';
            const isClaimed = quest.status === 'claimed';
            const percent = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

            return (
              <div
                key={quest.id}
                className={`p-4 rounded-xl border transition-all ${
                  isClaimed
                    ? 'border-slate-800 bg-slate-950/50 opacity-75'
                    : isCompleted
                    ? 'border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded font-black uppercase tracking-wider bg-slate-800 border border-slate-700 text-sky-300">
                        {quest.type}
                      </span>
                      <h4 className="font-bold text-sm text-slate-100">{quest.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{quest.description}</p>
                  </div>

                  {/* Rewards Box */}
                  <div className="text-right flex flex-col items-end">
                    <span className="font-mono text-xs font-black text-amber-300">
                      +{quest.zenyReward.toLocaleString()} Z
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 font-bold">
                      +{quest.expReward} EXP
                    </span>
                  </div>
                </div>

                {/* Progress bar & Action button */}
                <div className="mt-3.5 flex flex-col sm:flex-row justify-between items-center gap-3 pt-2.5 border-t border-slate-800/80">
                  <div className="w-full sm:flex-1 flex items-center gap-2.5">
                    <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted || isClaimed ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300 tabular-nums w-12 text-right">
                      {quest.currentCount}/{quest.targetCount}
                    </span>
                  </div>

                  <div>
                    {isClaimed ? (
                      <span className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold block text-center">
                        Claimed ✓
                      </span>
                    ) : isCompleted ? (
                      <button
                        type="button"
                        onClick={() => {
                          sound.playLevelUp();
                          onClaimQuest(quest.id);
                        }}
                        className="px-5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer animate-pulse"
                      >
                        Claim Reward
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 text-xs font-semibold block text-center">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand Completion Chest Box */}
          <div className="mt-2 p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-950 to-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎁</span>
              <div>
                <h4 className="font-black text-sm text-amber-300">Daily Grand Adventurer Chest</h4>
                <p className="text-xs text-slate-400">
                  Complete and claim all 3 daily quests to receive +10,000 Zeny & +2,000 EXP bonus!
                </p>
              </div>
            </div>

            <div>
              {hasClaimedDailyBonus ? (
                <span className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs block text-center">
                  Daily Chest Claimed ✓
                </span>
              ) : (
                <button
                  type="button"
                  disabled={!allClaimed}
                  onClick={() => {
                    sound.playCritical();
                    onClaimDailyBonus();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                >
                  Open Chest 🎉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
