import React, { useState, useEffect } from 'react';
import { Monster, PlayerProfile, Skill, Item } from '../types';
import { calculateDerivedStats, calculateTurnDamage } from '../rules';
import { sound } from '../audio';

interface BattleModalProps {
  player: PlayerProfile;
  monster: Monster;
  onVictory: (updatedPlayer: PlayerProfile, lootDrops: Item[], zenyGained: number, expGained: number) => void;
  onDefeat: () => void;
  onFlee: () => void;
}

interface BattleLogEntry {
  id: string;
  text: string;
  type: 'player' | 'monster' | 'crit' | 'heal' | 'info';
}

export const BattleModal: React.FC<BattleModalProps> = ({
  player,
  monster,
  onVictory,
  onDefeat,
  onFlee,
}) => {
  const derived = calculateDerivedStats(player.baseLevel, player.jobLevel, player.job, player.stats, player.equipment);

  const [playerHp, setPlayerHp] = useState(derived.maxHp);
  const [playerSp, setPlayerSp] = useState(derived.maxSp);
  const [monsterHp, setMonsterHp] = useState(monster.hp);

  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [logs, setLogs] = useState<BattleLogEntry[]>([
    { id: '1', text: `Encountered ${monster.name} (Lv ${monster.level})!`, type: 'info' },
  ]);

  const [activeTab, setActiveTab] = useState<'actions' | 'skills' | 'items'>('actions');
  const [hitEffect, setHitEffect] = useState<'none' | 'player-hit' | 'monster-hit'>('none');
  const [damagePopup, setDamagePopup] = useState<{ text: string; isCrit: boolean; color: string } | null>(null);

  // Trigger popup
  const showPopup = (text: string, isCrit = false, color = '#f87171') => {
    setDamagePopup({ text, isCrit, color });
    setTimeout(() => setDamagePopup(null), 800);
  };

  // Add battle log
  const addLog = (text: string, type: BattleLogEntry['type']) => {
    setLogs((prev) => [{ id: Math.random().toString(), text, type }, ...prev.slice(0, 7)]);
  };

  // Check victory / defeat
  useEffect(() => {
    if (monsterHp <= 0) {
      sound.playLevelUp();
      addLog(`Victory! Defeated ${monster.name}!`, 'info');
      setTimeout(() => {
        // Collect rewards
        const loot: Item[] = [];
        monster.drops.forEach((d) => {
          if (Math.random() <= d.dropRate) {
            loot.push({
              id: `loot-${Date.now()}-${Math.random()}`,
              name: d.itemId === 'card-poring' ? 'Poring Card' : d.itemId === 'mat-oridecon' ? 'Oridecon' : 'Red Potion',
              type: d.itemId.includes('card') ? 'card' : d.itemId.includes('mat') ? 'material' : 'usable',
              description: 'Trophy from battle.',
              icon: 'gem',
              price: 150,
              quantity: 1,
            });
          }
        });

        const newExp = player.baseExp + monster.exp;
        let newLevel = player.baseLevel;
        let statPointsGained = 0;
        let skillPointsGained = 0;
        if (newExp >= player.baseLevel * 100) {
          newLevel += 1;
          statPointsGained += 4;
          skillPointsGained += 1;
        }

        const updatedPlayer: PlayerProfile = {
          ...player,
          baseLevel: newLevel,
          baseExp: newExp,
          zeny: player.zeny + monster.zenyDrop,
          statPoints: player.statPoints + statPointsGained,
          skillPoints: player.skillPoints + skillPointsGained,
          inventory: [...player.inventory, ...loot],
        };

        onVictory(updatedPlayer, loot, monster.zenyDrop, monster.exp);
      }, 700);
    } else if (playerHp <= 0) {
      sound.playHit();
      addLog(`Defeated by ${monster.name}...`, 'info');
      setTimeout(() => onDefeat(), 700);
    }
  }, [monsterHp, playerHp]);

  // Monster AI Turn
  useEffect(() => {
    if (!isPlayerTurn && monsterHp > 0 && playerHp > 0) {
      setIsActing(true);
      const timer = setTimeout(() => {
        // Monster attacks
        const dmgResult = calculateTurnDamage(
          monster.atk,
          monster.atk * 0.8,
          160 + monster.level * 2,
          5,
          derived.def,
          derived.mdef,
          derived.flee,
          monster.element,
          'Neutral'
        );

        if (!dmgResult.isHit) {
          sound.playPoringBounce();
          showPopup('MISS', false, '#94a3b8');
          addLog(`${monster.name} attacks, but you dodged!`, 'player');
        } else {
          sound.playHit();
          setHitEffect('player-hit');
          setTimeout(() => setHitEffect('none'), 200);
          showPopup(`-${dmgResult.damage}`, dmgResult.isCrit, '#ef4444');
          setPlayerHp((prev) => Math.max(0, prev - dmgResult.damage));
          addLog(`${monster.name} strikes you for ${dmgResult.damage} damage!`, 'monster');
        }

        setIsActing(false);
        setIsPlayerTurn(true);
        setTurnCount((c) => c + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, monsterHp, playerHp]);

  // Player Basic Attack
  const handlePlayerAttack = () => {
    if (!isPlayerTurn || isActing) return;
    setIsActing(true);
    sound.playAttackSwing();

    setTimeout(() => {
      const dmgResult = calculateTurnDamage(
        derived.atk,
        derived.matk,
        derived.hit,
        derived.critRate,
        monster.def,
        monster.def * 0.5,
        120 + monster.level,
        'Neutral',
        monster.element
      );

      if (!dmgResult.isHit) {
        sound.playPoringBounce();
        showPopup('MISS', false, '#94a3b8');
        addLog(`Your attack missed ${monster.name}!`, 'monster');
      } else {
        if (dmgResult.isCrit) {
          sound.playCritical();
          showPopup(`CRITICAL!! ${dmgResult.damage}`, true, '#facc15');
          addLog(`CRITICAL HIT! You deal ${dmgResult.damage} damage to ${monster.name}!`, 'crit');
        } else {
          sound.playHit();
          showPopup(`-${dmgResult.damage}`, false, '#f87171');
          addLog(`You strike ${monster.name} for ${dmgResult.damage} damage.`, 'player');
        }
        setHitEffect('monster-hit');
        setTimeout(() => setHitEffect('none'), 200);
        setMonsterHp((prev) => Math.max(0, prev - dmgResult.damage));
      }

      setIsActing(false);
      setIsPlayerTurn(false);
    }, 250);
  };

  // Player Cast Skill
  const handlePlayerSkill = (skill: Skill) => {
    if (!isPlayerTurn || isActing || playerSp < skill.spCost) return;
    setIsActing(true);
    setPlayerSp((sp) => sp - skill.spCost);
    sound.playMagicCast();

    setTimeout(() => {
      if (skill.id === 'heal') {
        const healAmt = Math.floor(derived.matk * 1.8 + player.baseLevel * 10);
        sound.playHeal();
        setPlayerHp((hp) => Math.min(derived.maxHp, hp + healAmt));
        showPopup(`+${healAmt} HP`, false, '#4ade80');
        addLog(`Cast Heal! Recovered ${healAmt} HP.`, 'heal');
      } else {
        const dmgResult = calculateTurnDamage(
          derived.atk,
          derived.matk,
          derived.hit + 50,
          derived.critRate + 15,
          monster.def,
          monster.def * 0.4,
          100 + monster.level,
          skill.element,
          monster.element,
          skill
        );

        if (dmgResult.isCrit || skill.damageMultiplier >= 3.0) {
          sound.playCritical();
          showPopup(`${skill.name.toUpperCase()}!! ${dmgResult.damage}`, true, '#facc15');
          addLog(`${skill.name}! Dealt ${dmgResult.damage} [${skill.element}] damage!`, 'crit');
        } else {
          sound.playHit();
          showPopup(`-${dmgResult.damage}`, false, '#f87171');
          addLog(`${skill.name} hits ${monster.name} for ${dmgResult.damage} damage.`, 'player');
        }
        setHitEffect('monster-hit');
        setTimeout(() => setHitEffect('none'), 200);
        setMonsterHp((prev) => Math.max(0, prev - dmgResult.damage));
      }

      setIsActing(false);
      setIsPlayerTurn(false);
    }, 350);
  };

  // Use Potion
  const handleUsePotion = (item: Item) => {
    if (!isPlayerTurn || isActing) return;
    sound.playHeal();
    if (item.hpRecover) {
      setPlayerHp((hp) => Math.min(derived.maxHp, hp + item.hpRecover!));
      showPopup(`+${item.hpRecover} HP`, false, '#4ade80');
      addLog(`Drank ${item.name}, restored ${item.hpRecover} HP!`, 'heal');
    }
    if (item.spRecover) {
      setPlayerSp((sp) => Math.min(derived.maxSp, sp + item.spRecover!));
      showPopup(`+${item.spRecover} SP`, false, '#38bdf8');
      addLog(`Drank ${item.name}, restored ${item.spRecover} SP!`, 'heal');
    }
    setIsPlayerTurn(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="battle-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col text-slate-100">
        {/* Top Header: Turn Counter & Timeline */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-5 py-2.5 bg-slate-950 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              TURN {turnCount}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isPlayerTurn ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              {isPlayerTurn ? 'Your Turn' : `${monster.name}'s Turn`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Element:</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-bold">
              {monster.element}
            </span>
            {monster.isMvp && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                MVP BOSS
              </span>
            )}
          </div>
        </div>

        {/* Center Arena Battle Stage */}
        <div className="relative p-6 flex flex-col items-center justify-center min-h-[200px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          {/* Damage popup notification */}
          {damagePopup && (
            <div
              className={`absolute top-10 font-black tracking-wider transition-all z-20 ${
                damagePopup.isCrit ? 'text-3xl text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]' : 'text-2xl text-red-400'
              }`}
            >
              {damagePopup.text}
            </div>
          )}

          {/* Monster Display & HP Gauge */}
          <div className={`flex flex-col items-center transition-transform ${hitEffect === 'monster-hit' ? 'scale-90 brightness-150' : 'scale-100'}`}>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl shadow-lg border-2 border-amber-400/60 mb-3"
              style={{ backgroundColor: monster.color }}
            >
              {monster.name[0]}
            </div>
            <div className="text-lg font-black tracking-wide text-slate-100 flex items-center gap-2">
              <span>{monster.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-bold">
                Lv {monster.level}
              </span>
            </div>

            {/* Monster HP Bar */}
            <div className="w-64 mt-2">
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-0.5">
                <span>HP</span>
                <span>{monsterHp} / {monster.maxHp}</span>
              </div>
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-700 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, (monsterHp / monster.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Player Status Cluster */}
        <div className={`px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 ${hitEffect === 'player-hit' ? 'bg-red-950/60' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-700 border border-blue-400 flex items-center justify-center font-bold text-white">
              {player.name[0]}
            </div>
            <div>
              <div className="font-bold text-sm text-slate-200">
                {player.name} <span className="text-xs text-amber-400 font-semibold">({player.job})</span>
              </div>
              <div className="text-[11px] text-slate-400">Base Lv {player.baseLevel} · Job Lv {player.jobLevel}</div>
            </div>
          </div>

          {/* Player HP / SP Readouts */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 w-5">HP</span>
              <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.max(0, (playerHp / derived.maxHp) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-300 w-16 text-right tabular-nums">
                {playerHp}/{derived.maxHp}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-sky-400 w-5">SP</span>
              <div className="flex-1 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all"
                  style={{ width: `${Math.max(0, (playerSp / derived.maxSp) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-300 w-16 text-right tabular-nums">
                {playerSp}/{derived.maxSp}
              </span>
            </div>
          </div>
        </div>

        {/* Combat Action Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
          {/* Action Tabs */}
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('actions');
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'actions' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Basic Attack
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('skills');
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'skills' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Job Skills ({player.skills.length})
            </button>
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('items');
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'items' ? 'bg-amber-500 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Potions
            </button>
          </div>

          {/* Action Contents */}
          {activeTab === 'actions' && (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!isPlayerTurn || isActing}
                onClick={handlePlayerAttack}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Normal Strike [Space]
              </button>
              <button
                type="button"
                disabled={!isPlayerTurn || isActing}
                onClick={() => {
                  sound.playClick();
                  onFlee();
                }}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                Flee Battle
              </button>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
              {player.skills.map((skill) => {
                const canAfford = playerSp >= skill.spCost;
                return (
                  <button
                    key={skill.id}
                    type="button"
                    disabled={!isPlayerTurn || isActing || !canAfford}
                    onClick={() => handlePlayerSkill(skill)}
                    className="flex flex-col items-start p-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 disabled:opacity-40 disabled:cursor-not-allowed text-left transition-all"
                  >
                    <div className="flex justify-between w-full items-center">
                      <span className="font-bold text-xs text-amber-300">{skill.name}</span>
                      <span className="text-[10px] text-sky-400 font-semibold">{skill.spCost} SP</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{skill.description}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="flex gap-2">
              {player.inventory
                .filter((i) => i.type === 'usable')
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!isPlayerTurn || isActing}
                    onClick={() => handleUsePotion(item)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span>{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">x{item.quantity ?? 1}</span>
                  </button>
                ))}
            </div>
          )}

          {/* Mini Combat Log */}
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 max-h-16 overflow-y-auto flex flex-col-reverse">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`py-0.5 ${
                  log.type === 'crit'
                    ? 'text-yellow-400 font-bold'
                    : log.type === 'heal'
                    ? 'text-emerald-400'
                    : log.type === 'monster'
                    ? 'text-red-400'
                    : 'text-slate-300'
                }`}
              >
                {log.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
