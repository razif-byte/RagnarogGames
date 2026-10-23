import React, { useState } from 'react';
import { Guild, Monster, PlayerProfile } from '../types';
import { sound } from '../audio';

interface GuildModalProps {
  guild: Guild;
  player: PlayerProfile;
  onLaunchRaid: (bossMonster: Monster) => void;
  onClose: () => void;
}

export const GuildModal: React.FC<GuildModalProps> = ({
  guild,
  player,
  onLaunchRaid,
  onClose,
}) => {
  const [tab, setTab] = useState<'roster' | 'raid' | 'skills'>('roster');

  const baphometBoss: Monster = {
    id: 'baphomet',
    name: 'Baphomet [MVP Raid]',
    level: 70,
    hp: 12500,
    maxHp: 12500,
    atk: 390,
    def: 60,
    exp: 6500,
    zenyDrop: 45000,
    element: 'Shadow',
    isMvp: true,
    scale: 2.4,
    color: '#2c3e50',
    drops: [
      { itemId: 'mat-oridecon', dropRate: 1.0 },
      { itemId: 'mat-elunium', dropRate: 1.0 },
      { itemId: 'card-poring', dropRate: 0.2 },
    ],
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="guild-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
              🛡️
            </div>
            <div>
              <div className="font-black text-sm text-amber-400">{guild.name}</div>
              <div className="text-[10px] text-slate-400">Guild Level {guild.level} · Tax {guild.taxRate}%</div>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('roster');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'roster' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Guild Roster ({guild.members.length})
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('raid');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'raid' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Epic MVP Raids ⚔️
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('skills');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'skills' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Guild Skills & Buffs
          </button>
        </div>

        {/* Tab 1: Member Roster */}
        {tab === 'roster' && (
          <div className="p-6 flex flex-col gap-3 overflow-y-auto">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
              📢 Notice: <span className="text-amber-200">{guild.notice}</span>
            </div>

            <div className="flex flex-col gap-2">
              {guild.members.map((member) => (
                <div
                  key={member.id}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-300">
                      {member.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-100 flex items-center gap-2">
                        <span>{member.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-semibold">
                          {member.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {member.job} · Lv {member.level} · Contrib: {member.contribution.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                    {member.lastOnline}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: MVP Raid Dungeon */}
        {tab === 'raid' && (
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950 via-slate-950 to-slate-950 border border-red-500/40 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-400">
                    Active Guild Raid Instance
                  </span>
                  <h3 className="text-lg font-black text-amber-400">Descent of Lord Baphomet</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Enter the labyrinthine Catacombs under Prontera to confront the Lord of Chaos.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-mono text-xs font-bold">
                  Lv 70+ Required
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div className="p-2 rounded bg-slate-900">Boss HP: 12,500</div>
                <div className="p-2 rounded bg-slate-900">Element: Shadow Lv 3</div>
                <div className="p-2 rounded bg-slate-900">Guild EXP: +6,500</div>
                <div className="p-2 rounded bg-slate-900">MVP Zeny: 45,000 Z</div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playCritical();
                  onLaunchRaid(baphometBoss);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-lg transition-all"
              >
                Initiate Guild Raid Expedition ⚔️
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Guild Skills */}
        {tab === 'skills' && (
          <div className="p-6 flex flex-col gap-3 overflow-y-auto">
            {[
              { name: 'Glory of Guild', level: 3, desc: 'Increases all guild member EXP and Zeny gain by +15%.' },
              { name: 'Battle Orders', level: 2, desc: 'Increases guild members ATK and MATK by +10 in battle.' },
              { name: 'Kafra Contract', level: 1, desc: 'Grants all members 50% discount on teleport and storage.' },
            ].map((skill) => (
              <div key={skill.name} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-xs text-amber-300">{skill.name} (Lv {skill.level})</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{skill.desc}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
