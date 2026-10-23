import React, { useState } from 'react';
import { Monster, PlayerProfile } from '../types';
import { sound } from '../audio';

interface RankedArenaModalProps {
  player: PlayerProfile;
  onStartDuel: (opponentMonster: Monster) => void;
  onClose: () => void;
}

export const RankedArenaModal: React.FC<RankedArenaModalProps> = ({
  player,
  onStartDuel,
  onClose,
}) => {
  const [tab, setTab] = useState<'matchmaking' | 'leaderboard'>('matchmaking');
  const [isSearching, setIsSearching] = useState(false);
  const [queueTimer, setQueueTimer] = useState(0);

  const getRankTier = (rating: number) => {
    if (rating >= 2000) return { name: 'Champion MVP', color: 'text-amber-400', icon: '👑' };
    if (rating >= 1800) return { name: 'Diamond Lord', color: 'text-cyan-400', icon: '💎' };
    if (rating >= 1600) return { name: 'Platinum Knight', color: 'text-purple-400', icon: '⚔️' };
    if (rating >= 1400) return { name: 'Gold Priest', color: 'text-yellow-400', icon: '🥇' };
    if (rating >= 1200) return { name: 'Silver Crusader', color: 'text-slate-300', icon: '🥈' };
    return { name: 'Bronze Novice', color: 'text-amber-700', icon: '🥉' };
  };

  const currentTier = getRankTier(player.pvpRating);

  const handleFindMatch = () => {
    sound.playClick();
    setIsSearching(true);
    setQueueTimer(0);

    const interval = setInterval(() => {
      setQueueTimer((t) => t + 1);
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      setIsSearching(false);
      sound.playLevelUp();

      // Create ranked duelist monster adversary
      const duelist: Monster = {
        id: `pvp-duelist-${Date.now()}`,
        name: 'Challenger Valerius [PvP]',
        level: player.baseLevel,
        hp: player.baseLevel * 85,
        maxHp: player.baseLevel * 85,
        atk: Math.floor(player.baseLevel * 6.5),
        def: 30,
        exp: 800,
        zenyDrop: 3500,
        element: 'Neutral',
        isMvp: false,
        scale: 1.0,
        color: '#dc2626',
        drops: [{ itemId: 'mat-oridecon', dropRate: 0.5 }],
      };

      onStartDuel(duelist);
      onClose();
    }, 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="ranked-arena-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              Valhalla Ranked Colosseum
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold">
              Automated Tournament Ladder
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('matchmaking');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'matchmaking' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Matchmaking & Duels
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setTab('leaderboard');
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              tab === 'leaderboard' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Season Leaderboards 🏆
          </button>
        </div>

        {/* Tab 1: Matchmaking */}
        {tab === 'matchmaking' && (
          <div className="p-6 flex flex-col gap-5 overflow-y-auto">
            {/* Rank Tier Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">{currentTier.icon}</span>
                <div>
                  <div className={`text-base font-black ${currentTier.color}`}>
                    {currentTier.name}
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Rating: <span className="font-bold text-amber-300">{player.pvpRating} MMR</span>
                  </div>
                </div>
              </div>

              <div className="text-right text-xs font-mono">
                <div className="text-emerald-400 font-bold">{player.pvpWins} Wins</div>
                <div className="text-red-400">{player.pvpLosses} Losses</div>
              </div>
            </div>

            {/* Matchmaking Queue Section */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
              {isSearching ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin" />
                  <div className="text-sm font-bold text-amber-300">Searching for Opponent...</div>
                  <div className="text-xs font-mono text-slate-400">Estimated: 3s · Elapsed: {queueTimer}s</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-3xl">⚔️</span>
                  <div className="text-sm font-black text-slate-100">1v1 Automated Ranked Tournament</div>
                  <p className="text-xs text-slate-400 max-w-md">
                    Matches players in real-time based on competitive Elo ratings. Win matches to ascend the ladder and unlock seasonal rewards.
                  </p>
                  <button
                    type="button"
                    onClick={handleFindMatch}
                    className="mt-2 px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                  >
                    Enter Ranked Matchmaking
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Leaderboard */}
        {tab === 'leaderboard' && (
          <div className="p-6 flex flex-col gap-2 overflow-y-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Top Ranked Duelists (Season 4):
            </span>
            {[
              { rank: 1, name: 'Siegfried_Valkyrie', job: 'Lord Knight', rating: 2450, winRate: '88%' },
              { rank: 2, name: 'ArcaneHighWizard', job: 'Wizard', rating: 2380, winRate: '85%' },
              { rank: 3, name: 'ShadowSinCross', job: 'Assassin', rating: 2310, winRate: '82%' },
              { rank: 4, name: 'HolyBenediction', job: 'Priest', rating: 2240, winRate: '79%' },
              { rank: 5, name: 'SniperArtemis', job: 'Hunter', rating: 2190, winRate: '76%' },
              { rank: 14, name: player.name, job: player.job, rating: player.pvpRating, winRate: `${Math.round((player.pvpWins / Math.max(1, player.pvpWins + player.pvpLosses)) * 100)}%` },
            ].map((p) => (
              <div
                key={p.rank}
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  p.name === player.name
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-800 bg-slate-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-black font-mono text-sm w-6 text-center ${p.rank <= 3 ? 'text-amber-400' : 'text-slate-400'}`}>
                    #{p.rank}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-100">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.job}</div>
                  </div>
                </div>

                <div className="text-right text-xs font-mono">
                  <div className="font-bold text-amber-300">{p.rating} MMR</div>
                  <div className="text-[10px] text-slate-400">Win Rate: {p.winRate}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
