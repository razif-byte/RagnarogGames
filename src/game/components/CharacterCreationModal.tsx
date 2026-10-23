import React, { useState } from 'react';
import {
  CharacterAppearance,
  DEFAULT_APPEARANCE,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  HAIRSTYLES,
  HAIR_COLORS,
  SKIN_TONES,
  FACIAL_EXPRESSIONS,
  OUTFIT_CHOICES,
  ACCESSORY_CHOICES,
  Race,
  Gender,
} from '../characterCustomization';
import { sound } from '../audio';
import { PlayerProfile } from '../types';

interface CharacterCreationModalProps {
  player: PlayerProfile;
  initialAppearance?: CharacterAppearance;
  onSave: (name: string, appearance: CharacterAppearance) => void;
  onClose: () => void;
}

export const CharacterCreationModal: React.FC<CharacterCreationModalProps> = ({
  player,
  initialAppearance = DEFAULT_APPEARANCE,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(player.name || 'RuneKnight');
  const [appearance, setAppearance] = useState<CharacterAppearance>(initialAppearance);
  const [activeStep, setActiveStep] = useState<'race' | 'hair' | 'face' | 'outfit'>('race');

  const selectedOutfit = OUTFIT_CHOICES.find((o) => o.id === appearance.outfitChoice) || OUTFIT_CHOICES[0];

  const handleConfirm = () => {
    sound.playLevelUp();
    onSave(name.trim() || 'RuneKnight', appearance);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-none p-4 select-none"
      data-testid="character-creation-modal"
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              Character Creator & Avatar Forge
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-bold">
              3D Customization
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

        {/* Wizard Step Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6">
          {(
            [
              { id: 'race', label: '1. Race & Identity' },
              { id: 'hair', label: '2. Hairstyle & Color' },
              { id: 'face', label: '3. Skin & Face' },
              { id: 'outfit', label: '4. Outfit & Accessories' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveStep(s.id);
              }}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeStep === s.id ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Center 2-Column Layout: Left Live Avatar Stage, Right Customizer Panel */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Left Avatar Stage (5 cols) */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 flex flex-col items-center justify-center border-r border-slate-800">
            {/* 3D-Style Vector Character Preview */}
            <div className="relative w-48 h-64 rounded-2xl bg-slate-950/80 border-2 border-amber-500/40 p-4 flex flex-col items-center justify-center shadow-inner overflow-hidden">
              {/* Radial Halo behind avatar */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  background: `radial-gradient(circle at center, ${appearance.hairColor} 0%, transparent 70%)`,
                }}
              />

              {/* Headgear Accessory Badge */}
              {appearance.accessory !== 'none' && (
                <div className="absolute top-4 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {appearance.accessory}
                </div>
              )}

              {/* Composite SVG Doll Preview */}
              <div className="relative z-10 flex flex-col items-center mt-2">
                {/* Hair Top / Ears */}
                {appearance.race === 'Doram' && (
                  <div className="flex justify-between w-20 mb--2 z-20">
                    <span className="text-xl">🐱</span>
                    <span className="text-xl">🐱</span>
                  </div>
                )}
                {appearance.race === 'Valkyrie' && (
                  <div className="absolute -top-4 w-32 flex justify-between z-0">
                    <span className="text-xl">🪽</span>
                    <span className="text-xl">🪽</span>
                  </div>
                )}

                {/* Head with skin tone */}
                <div
                  className="w-16 h-16 rounded-full border-2 border-slate-800 shadow relative flex items-center justify-center transition-colors"
                  style={{ backgroundColor: appearance.skinTone }}
                >
                  {/* Hair Overlay */}
                  <div
                    className="absolute -top-2 inset-x-0 h-8 rounded-t-full opacity-90 transition-colors"
                    style={{ backgroundColor: appearance.hairColor }}
                  />

                  {/* Facial Expression Icon */}
                  <div className="relative z-10 text-lg mt-2">
                    {FACIAL_EXPRESSIONS.find((f) => f.id === appearance.facialFeature)?.icon || '😊'}
                  </div>
                </div>

                {/* Torso & Outfit */}
                <div
                  className="w-20 h-24 rounded-xl mt-1 shadow-lg border border-slate-700/80 flex flex-col items-center justify-between p-2 transition-colors relative"
                  style={{ backgroundColor: selectedOutfit.color }}
                >
                  <div className="w-8 h-2 rounded bg-amber-400/80 mx-auto" />
                  <div className="text-[9px] font-black uppercase text-white/90 tracking-tighter">
                    {appearance.race}
                  </div>
                  <div className="w-full flex justify-between px-1">
                    <div className="w-2 h-4 rounded bg-slate-900/60" />
                    <div className="w-2 h-4 rounded bg-slate-900/60" />
                  </div>
                </div>

                {/* Ground Shadow */}
                <div className="w-24 h-3 rounded-full bg-black/60 mt-1 blur-[1px]" />
              </div>
            </div>

            {/* Character Name Input */}
            <div className="w-full max-w-xs mt-4">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Character Name:
              </label>
              <input
                type="text"
                value={name}
                maxLength={20}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Hero Name..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm focus:border-amber-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Right Customization Controls (7 cols) */}
          <div className="md:col-span-7 p-6 flex flex-col gap-5 overflow-y-auto max-h-[60vh]">
            {/* Step 1: Race & Gender */}
            {activeStep === 'race' && (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Select Origin Race:
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {RACE_OPTIONS.map((race) => (
                      <button
                        key={race.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, race: race.id }));
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          appearance.race === race.id
                            ? 'border-amber-400 bg-slate-800 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{race.icon}</span>
                          <span className="font-bold text-xs">{race.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{race.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Gender Identity:
                  </span>
                  <div className="flex gap-2">
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, gender: g }));
                        }}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-colors ${
                          appearance.gender === g
                            ? 'border-amber-400 bg-amber-500 text-slate-950'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Hairstyle & Hair Color */}
            {activeStep === 'hair' && (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Hairstyle Cut:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {HAIRSTYLES.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, hairStyle: h.id }));
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                          appearance.hairStyle === h.id
                            ? 'border-amber-400 bg-slate-800 text-amber-300'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Hair Pigment Dye:
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {HAIR_COLORS.map((hc) => (
                      <button
                        key={hc.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, hairColor: hc.hex }));
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                          appearance.hairColor === hc.hex
                            ? 'border-amber-400 bg-slate-800 text-amber-300 shadow'
                            : 'border-slate-800 bg-slate-950 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-700"
                          style={{ backgroundColor: hc.hex }}
                        />
                        <span>{hc.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Skin Tone & Facial Feature */}
            {activeStep === 'face' && (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Skin Complexion:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SKIN_TONES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, skinTone: st.hex }));
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          appearance.skinTone === st.hex
                            ? 'border-amber-400 bg-slate-800 text-amber-300'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-slate-700"
                          style={{ backgroundColor: st.hex }}
                        />
                        <span>{st.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Facial Expression & Gaze:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FACIAL_EXPRESSIONS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, facialFeature: f.id }));
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          appearance.facialFeature === f.id
                            ? 'border-amber-400 bg-slate-800 text-amber-300'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-base">{f.icon}</span>
                        <span>{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Outfits & Accessories */}
            {activeStep === 'outfit' && (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Initial Outfit Attire:
                  </span>
                  <div className="flex flex-col gap-2">
                    {OUTFIT_CHOICES.map((outfit) => (
                      <button
                        key={outfit.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, outfitChoice: outfit.id }));
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          appearance.outfitChoice === outfit.id
                            ? 'border-amber-400 bg-slate-800 text-amber-300'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-4 h-4 rounded-full border border-slate-700"
                            style={{ backgroundColor: outfit.color }}
                          />
                          <div>
                            <div className="text-xs font-bold">{outfit.name}</div>
                            <div className="text-[10px] text-slate-400">{outfit.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Starter Headgear Accessory:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ACCESSORY_CHOICES.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setAppearance((p) => ({ ...p, accessory: acc.name }));
                        }}
                        className={`p-2 rounded-lg border text-xs font-bold text-center transition-all ${
                          appearance.accessory === acc.name
                            ? 'border-amber-400 bg-slate-800 text-amber-300'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        {acc.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            Selected: <span className="text-amber-300 font-bold">{appearance.race} ({appearance.gender})</span>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all"
            >
              Forge Hero Avatar ✨
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
