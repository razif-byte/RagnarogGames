import React, { useState } from 'react';
import { PlayerProfile, CharacterStats } from '../types';
import { calculateDerivedStats } from '../rules';
import { sound } from '../audio';

interface StatsModalProps {
  player: PlayerProfile;
  onUpdatePlayer: (updated: PlayerProfile) => void;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ player, onUpdatePlayer, onClose }) => {
  const [stats, setStats] = useState<CharacterStats>({ ...player.stats });
  const [points, setPoints] = useState<number>(player.statPoints);

  const derived = calculateDerivedStats(player.baseLevel, player.jobLevel, player.job, stats, player.equipment);

  const incrementStat = (stat: keyof CharacterStats) => {
    if (points <= 0) return;
    sound.playClick();
    setStats((prev) => ({ ...prev, [stat]: prev[stat] + 1 }));
    setPoints((p) => p - 1);
  };

  const decrementStat = (stat: keyof CharacterStats) => {
    if (stats[stat] <= player.stats[stat]) return; // Cannot lower below saved stats
    sound.playClick();
    setStats((prev) => ({ ...prev, [stat]: prev[stat] - 1 }));
    setPoints((p) => p + 1);
  };

  const handleSave = () => {
    sound.playLevelUp();
    onUpdatePlayer({
      ...player,
      stats,
      statPoints: points,
    });
    onClose();
  };

  const statList: { key: keyof CharacterStats; label: string; desc: string; icon: string }[] = [
    { key: 'str', label: 'STR (Strength)', desc: 'Increases physical Attack (ATK) and inventory weight limit.', icon: '⚔️' },
    { key: 'agi', label: 'AGI (Agility)', desc: 'Boosts Attack Speed (ASPD) and evasion rate (Flee).', icon: '⚡' },
    { key: 'vit', label: 'VIT (Vitality)', desc: 'Boosts Max HP, physical defense, and potion recovery.', icon: '🛡️' },
    { key: 'int', label: 'INT (Intelligence)', desc: 'Increases Magic Attack (MATK), Max SP, and SP regen.', icon: '🔮' },
    { key: 'dex', label: 'DEX (Dexterity)', desc: 'Improves hit rate (Accuracy), cast speed, and ranged ATK.', icon: '🎯' },
    { key: 'luk', label: 'LUK (Luck)', desc: 'Increases Critical Rate, Perfect Dodge, and rare drop chance.', icon: '🍀' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="stats-modal"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-wider text-amber-400">
              Character Status Build
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold">
              {player.name} ({player.job})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status Points Bar */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex justify-between items-center text-xs">
          <span className="text-slate-300 font-medium">Available Status Points:</span>
          <span className="font-mono font-black text-amber-400 text-sm tracking-wider tabular-nums">
            {points} PTS
          </span>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {/* Left: Core 6 Stats Allocator */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Core Attributes
            </span>
            {statList.map(({ key, label, desc, icon }) => (
              <div
                key={key}
                className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-100">{label}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">{desc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono">
                  <button
                    type="button"
                    disabled={stats[key] <= player.stats[key]}
                    onClick={() => decrementStat(key)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-xs font-bold text-slate-200 transition-colors"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-amber-300 text-sm tabular-nums">
                    {stats[key]}
                  </span>
                  <button
                    type="button"
                    disabled={points <= 0}
                    onClick={() => incrementStat(key)}
                    className="w-6 h-6 flex items-center justify-center rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-xs font-black text-slate-950 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Derived Combat Stats Preview */}
          <div className="flex flex-col gap-2 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Derived Combat Stats
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Max HP</span>
                <span className="text-emerald-400 font-bold tabular-nums text-sm">{derived.maxHp}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Max SP</span>
                <span className="text-sky-400 font-bold tabular-nums text-sm">{derived.maxSp}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Physical ATK</span>
                <span className="text-amber-400 font-bold tabular-nums text-sm">{derived.atk}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Magic MATK</span>
                <span className="text-purple-400 font-bold tabular-nums text-sm">{derived.matk}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">DEF (Armor/Soft)</span>
                <span className="text-blue-400 font-bold tabular-nums text-sm">{derived.def}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">MDEF (Magic Def)</span>
                <span className="text-indigo-400 font-bold tabular-nums text-sm">{derived.mdef}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Accuracy (HIT)</span>
                <span className="text-yellow-400 font-bold tabular-nums text-sm">{derived.hit}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Flee Rate</span>
                <span className="text-teal-400 font-bold tabular-nums text-sm">{derived.flee}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Attack Speed (ASPD)</span>
                <span className="text-orange-400 font-bold tabular-nums text-sm">{derived.aspd}</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-sans">Critical Rate</span>
                <span className="text-rose-400 font-bold tabular-nums text-sm">{derived.critRate}%</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
              💡 Tip: High AGI and DEX build provides rapid attack speed with high dodge, while STR and VIT builds maximize endurance for MVP raids.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            Confirm Build
          </button>
        </div>
      </div>
    </div>
  );
};
