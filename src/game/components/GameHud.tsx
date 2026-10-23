import React, { useState } from 'react';
import { PlayerProfile, HardwareMetrics, Monster } from '../types';
import { calculateDerivedStats } from '../rules';
import { WATERMARK_INFO } from '../constants';
import { sound } from '../audio';
import { GatheringNode } from '../economy';
import { DailyQuest } from '../quests';

interface GameHudProps {
  player: PlayerProfile;
  metrics: HardwareMetrics;
  dailyQuests: DailyQuest[];
  nearbyMonster: Monster | null;
  nearbyNode: GatheringNode | null;
  onOpenQuests: () => void;
  onOpenStats: () => void;
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
  onOpenMarket: () => void;
  onOpenGuild: () => void;
  onOpenArena: () => void;
  onOpenSeasonal: () => void;
  onOpenCloudSync: () => void;
  onOpenAntiCheat: () => void;
  onOpenCharacterCreator: () => void;
  onEngageMonster: (monster: Monster) => void;
  onGatherNode: (node: GatheringNode) => void;
  onMoveIntent: (x: number, z: number) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  player,
  metrics,
  dailyQuests,
  nearbyMonster,
  nearbyNode,
  onOpenQuests,
  onOpenStats,
  onOpenInventory,
  onOpenCrafting,
  onOpenMarket,
  onOpenGuild,
  onOpenArena,
  onOpenSeasonal,
  onOpenCloudSync,
  onOpenAntiCheat,
  onOpenCharacterCreator,
  onEngageMonster,
  onGatherNode,
  onMoveIntent,
}) => {
  const derived = calculateDerivedStats(player.baseLevel, player.jobLevel, player.job, player.stats, player.equipment);
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [touchActive, setTouchActive] = useState(false);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });

  const readyQuestsCount = dailyQuests.filter((q) => q.status === 'completed').length;

  const handleToggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Virtual joystick touch handlers for mobile / Android support
  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    setTouchActive(true);
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchActive && e.type === 'mousemove' && (e as React.MouseEvent).buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.min(38, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * dist;
    const stickY = Math.sin(angle) * dist;

    setTouchPos({ x: stickX, y: stickY });
    onMoveIntent(stickX / 38, stickY / 38);
  };

  const handleJoystickEnd = () => {
    setTouchActive(false);
    setTouchPos({ x: 0, y: 0 });
    onMoveIntent(0, 0);
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-5 select-none"
      data-testid="game-hud"
    >
      {/* Top Bar Perimeter Cluster */}
      <div className="flex justify-between items-start w-full">
        {/* Top-Left: Character Status Card */}
        <div className="pointer-events-auto flex items-start gap-3 bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xl max-w-sm">
          {/* Avatar button opens Character Customizer */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenCharacterCreator();
            }}
            title="Customize 3D Character Avatar"
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 border border-amber-300 flex items-center justify-center text-xl shadow hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            🛡️
          </button>

          <div className="flex flex-col gap-1 w-44 sm:w-52">
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                {player.name}
              </span>
              <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-500/20">
                {player.job}
              </span>
            </div>

            {/* Level & Zeny */}
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Base Lv {player.baseLevel}</span>
              <span className="text-amber-300 font-bold">💰 {player.zeny.toLocaleString()} Z</span>
            </div>

            {/* HP Bar */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold text-emerald-400 w-4">HP</span>
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-emerald-500 rounded-full w-full" />
              </div>
              <span className="text-[10px] font-mono text-slate-300 tabular-nums">
                {derived.maxHp}
              </span>
            </div>

            {/* SP Bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-sky-400 w-4">SP</span>
              <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-sky-500 rounded-full w-full" />
              </div>
              <span className="text-[10px] font-mono text-slate-300 tabular-nums">
                {derived.maxSp}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right: Minimap & Quick Utilities */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl p-1.5 shadow">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Performance & Anti-cheat status */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenAntiCheat();
              }}
              title="Aegis Anti-Cheat & Hardware Diagnostics"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{metrics.fps} FPS</span>
            </button>
          </div>

          {/* Minimap Box */}
          <div className="w-28 h-28 rounded-2xl bg-slate-950/90 border border-slate-800 p-2 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
              <span>Prontera Field</span>
              <span className="text-amber-400">prt_fild08</span>
            </div>
            {/* Visual Radar Mock */}
            <div className="relative w-full h-16 border border-slate-800/80 rounded-lg flex items-center justify-center bg-slate-900/60">
              {/* Radar center player */}
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute" />
              <div className="w-2 h-2 rounded-full bg-amber-400 absolute" />
              {/* Surrounding blips */}
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 absolute top-2 left-3" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-3 right-4" />
            </div>
            <div className="text-[8px] text-center text-slate-500 font-mono">WASD / Joystick to move</div>
          </div>
        </div>
      </div>

      {/* Floating Interactive Action Prompts (When near monster or gathering node) */}
      <div className="flex flex-col items-center justify-center gap-2">
        {nearbyMonster && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onEngageMonster(nearbyMonster);
            }}
            className="pointer-events-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.6)] flex items-center gap-2 transition-all cursor-pointer animate-pulse"
          >
            <span>⚔️</span>
            <span>Engage {nearbyMonster.name} (Lv {nearbyMonster.level})</span>
          </button>
        )}

        {nearbyNode && (
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onGatherNode(nearbyNode);
            }}
            className="pointer-events-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.6)] flex items-center gap-2 transition-all cursor-pointer animate-pulse"
          >
            <span>🌿</span>
            <span>Gather from {nearbyNode.name}</span>
          </button>
        )}
      </div>

      {/* Bottom Perimeter Controls & Dock */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-3 w-full">
        {/* Virtual Joystick (Android & Touch Friendly) */}
        <div
          className="pointer-events-auto relative w-28 h-28 rounded-full bg-slate-950/80 border-2 border-slate-800 flex items-center justify-center shadow-2xl cursor-pointer touch-none"
          onMouseDown={handleJoystickStart}
          onMouseMove={handleJoystickMove}
          onMouseUp={handleJoystickEnd}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          title="Virtual Joystick (Touch or Drag)"
        >
          {/* Outer ring mark */}
          <div className="w-16 h-16 rounded-full border border-slate-700/60 pointer-events-none" />
          {/* Inner movable thumb stick */}
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 border-2 border-amber-300 shadow-md absolute pointer-events-none transition-transform"
            style={{
              transform: `translate(${touchPos.x}px, ${touchPos.y}px)`,
            }}
          />
        </div>

        {/* Center Dock: System Navigation Buttons */}
        <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5 sm:gap-2 p-2 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-2xl max-w-xl mx-auto">
          {[
            { label: 'Quests', icon: '📜', action: onOpenQuests, title: 'Daily Quests', badge: readyQuestsCount > 0 ? readyQuestsCount : undefined },
            { label: 'Stats', icon: '⚡', action: onOpenStats, title: 'Character Status' },
            { label: 'Bag', icon: '🎒', action: onOpenInventory, title: 'Inventory & Refine' },
            { label: 'Craft', icon: '⚗️', action: onOpenCrafting, title: 'Gathering & Crafting' },
            { label: 'Market', icon: '🛒', action: onOpenMarket, title: 'Player Marketplace' },
            { label: 'Guild', icon: '🛡️', action: onOpenGuild, title: 'Guild & MVP Raids' },
            { label: 'Arena', icon: '🏆', action: onOpenArena, title: 'Ranked Tournament Duels' },
            { label: 'Festival', icon: '🎉', action: onOpenSeasonal, title: 'Seasonal Event Board' },
            { label: 'Avatar', icon: '🎨', action: onOpenCharacterCreator, title: '3D Character Customizer' },
            { label: 'Cloud', icon: '☁️', action: onOpenCloudSync, title: 'Cross-Platform Cloud Sync' },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => {
                sound.playClick();
                btn.action();
              }}
              title={btn.title}
              className="relative flex flex-col items-center justify-center p-2 sm:px-2.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700/70 text-slate-200 transition-all cursor-pointer"
            >
              {btn.badge !== undefined && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center animate-bounce shadow">
                  {btn.badge}
                </span>
              )}
              <span className="text-base sm:text-lg">{btn.icon}</span>
              <span className="text-[10px] font-bold tracking-tight mt-0.5">{btn.label}</span>
            </button>
          ))}
        </div>

        {/* Mandatory Watermark Badge */}
        <div className="pointer-events-auto flex items-center justify-end">
          <a
            href={WATERMARK_INFO.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/95 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl font-bold text-xs tracking-wide shadow-xl transition-all"
            title="Visit Nasadef"
          >
            <span>{WATERMARK_INFO.text}</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};
