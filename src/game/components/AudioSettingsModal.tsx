import React, { useState, useRef } from 'react';
import { sound } from '../audio';

interface AudioSettingsModalProps {
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [trackInfo, setTrackInfo] = useState(sound.getTrackInfo());
  const [volume, setVolume] = useState(Math.round(sound.getBgmVolume() * 100));
  const [isMuted, setIsMuted] = useState(sound.isMuted());
  const [message, setMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.endsWith('.mp3')) {
      setMessage('⚠️ Please select a valid MP3 or audio file.');
      return;
    }

    try {
      setMessage('Saving custom MP3 permanently to IndexedDB...');
      await sound.savePermanentBgm(file, file.name);
      setTrackInfo(sound.getTrackInfo());
      sound.startBgm();
      setMessage(`✅ "${file.name}" set as permanent background music!`);
    } catch (err: any) {
      setMessage(`❌ Failed to save custom audio: ${err.message}`);
    }
  };

  const handleResetDefault = async () => {
    sound.playClick();
    await sound.resetToDefaultBgm();
    setTrackInfo(sound.getTrackInfo());
    setMessage('🎵 Reset to default Nasadef official theme (Ini Peringatan).');
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    sound.setBgmVolume(newVol / 100);
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="audio-settings-modal"
    >
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              🎵 Game Background Music
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              Permanent
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          {/* Active Track Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Current Track:</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                {trackInfo.isCustom ? 'Custom Upload (Saved)' : 'Nasadef Official BGM'}
              </span>
            </div>
            <div className="text-sm font-extrabold text-amber-300 truncate">
              {trackInfo.title}
            </div>
            <div className="text-[11px] text-slate-400 leading-snug">
              Plays seamlessly and loops permanently during Midgarts exploration and title screen.
            </div>
          </div>

          {/* Volume & Mute Controls */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
              <span>BGM Volume: {volume}%</span>
              <button
                type="button"
                onClick={handleToggleMute}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {isMuted ? '🔇 Unmute' : '🔊 Mute'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Feedback banner */}
          {message && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-center text-amber-300 font-medium">
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mp3,audio/*,.mp3,.wav,.ogg"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow flex items-center justify-center gap-2"
            >
              <span>📁</span>
              <span>Upload Custom MP3 File (Permanent)</span>
            </button>

            {trackInfo.isCustom && (
              <button
                type="button"
                onClick={handleResetDefault}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Reset to Official Theme (Ini Peringatan)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
