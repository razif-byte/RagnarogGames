import React, { useEffect } from 'react';
import { JobClass } from '../types';
import { sound } from '../audio';
import { WATERMARK_INFO } from '../constants';

interface TitleScreenProps {
  selectedJob: JobClass;
  onSelectJob: (job: JobClass) => void;
  onStartGame: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedJob,
  onSelectJob,
  onStartGame,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        sound.playClick();
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame]);

  const jobs: { id: JobClass; name: string; desc: string; color: string }[] = [
    { id: 'Swordsman', name: 'Swordsman', desc: 'Master of steel, high HP and ferocious melee strikes.', color: 'from-blue-600 to-indigo-700' },
    { id: 'Mage', name: 'Mage', desc: 'Wielder of primal elemental magic, devastating spell power.', color: 'from-purple-600 to-violet-800' },
    { id: 'Archer', name: 'Archer', desc: 'Deadly marksman with high precision and rapid arrows.', color: 'from-emerald-600 to-teal-800' },
    { id: 'Thief', name: 'Thief', desc: 'Shadow striker boasting lightning speed and deadly crits.', color: 'from-slate-700 to-zinc-900' },
    { id: 'Acolyte', name: 'Acolyte', desc: 'Holy servant with divine heals, holy smites, and sacred buffs.', color: 'from-amber-500 to-yellow-600' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-radial from-slate-900/60 via-slate-950/85 to-black/95 text-white select-none p-6 overflow-hidden"
      data-testid="title-screen"
    >
      {/* Top Banner & World Crest */}
      <div className="pt-8 flex flex-col items-center text-center">
        {/* Bespoke Inline SVG Ragnarok Crown & Wings Emblem */}
        <div className="mb-3 animate-bounce" style={{ animationDuration: '3s' }}>
          <svg className="w-20 h-20 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" viewBox="0 0 100 100" fill="none">
            {/* Angel Wings */}
            <path
              d="M 50 45 C 30 15 5 25 10 55 C 15 65 35 60 48 50 Z"
              fill="url(#wingGradientL)"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <path
              d="M 50 45 C 70 15 95 25 90 55 C 85 65 65 60 52 50 Z"
              fill="url(#wingGradientR)"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            {/* Center Crown / Valkyrie Crest */}
            <path
              d="M 50 20 L 58 38 L 74 38 L 62 48 L 66 65 L 50 54 L 34 65 L 38 48 L 26 38 L 42 38 Z"
              fill="#f59e0b"
              stroke="#fef08a"
              strokeWidth="2"
            />
            <circle cx="50" cy="42" r="5" fill="#38bdf8" />
            <defs>
              <linearGradient id="wingGradientL" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="wingGradientR" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-wider uppercase bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-lg">
          RAGNAROK
        </h1>
        <p className="text-sm sm:text-base tracking-widest text-sky-300 font-semibold uppercase mt-1">
          Chronicles of Rune-Midgarts 3D
        </p>
        <span className="text-xs text-slate-400 mt-1">
          Cross-Platform 3D MMORPG · Android & PC Edition
        </span>
      </div>

      {/* Center Character Class Selection */}
      <div className="w-full max-w-3xl flex flex-col items-center">
        <span className="text-xs tracking-wider uppercase text-slate-300 font-medium mb-3">
          Select Your Class
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
          {jobs.map((job) => {
            const isSelected = selectedJob === job.id;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  onSelectJob(job.id);
                }}
                className={`relative flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-slate-800/90 shadow-[0_0_18px_rgba(251,191,36,0.4)] scale-105'
                    : 'border-slate-700/80 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800/60'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${job.color} flex items-center justify-center font-bold text-lg mb-2 shadow`}>
                  {job.name[0]}
                </div>
                <span className="font-bold text-xs sm:text-sm text-slate-100">{job.name}</span>
                <span className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {job.desc}
                </span>
                {isSelected && (
                  <span className="absolute -top-2 right-2 text-[10px] bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                    Ready
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Start Game Action CTA */}
        <div className="mt-8 flex flex-col items-center">
          <button
            type="button"
            data-start="true"
            onClick={() => {
              sound.playClick();
              sound.startPronteraBgm();
              onStartGame();
            }}
            className="group relative px-8 py-3.5 rounded-xl font-black text-base sm:text-lg tracking-widest uppercase bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            Enter Rune-Midgarts
          </button>
          <span className="text-[11px] text-slate-400 tracking-wider mt-2.5">
            Press [Space] or [Enter] to Start
          </span>
        </div>
      </div>

      {/* Footer: Flat Control Hint & Mandatory Watermark */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2 border-t border-slate-800/60 pt-4">
        <div>WASD / Touch Joystick Move · Space Action · Esc Menu</div>

        {/* MANDATORY WATERMARK LINK */}
        <a
          href={WATERMARK_INFO.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-bold tracking-wide transition-colors"
          title="Visit Nasadef"
        >
          <span>{WATERMARK_INFO.text}</span>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>
    </div>
  );
};
