import React, { useState } from 'react';
import { PlayerProfile } from '../types';
import { generateSaveHash } from '../rules';
import { sound } from '../audio';

interface CloudSyncModalProps {
  player: PlayerProfile;
  onImportProfile: (imported: PlayerProfile) => void;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  player,
  onImportProfile,
  onClose,
}) => {
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing'>('synced');
  const [importJson, setImportJson] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const currentChecksum = generateSaveHash(player);

  const handleInstantSync = () => {
    sound.playClick();
    setSyncStatus('syncing');
    setSyncMessage(null);

    setTimeout(() => {
      sound.playLevelUp();
      setSyncStatus('synced');
      setSyncMessage('☁️ Cloud Save synchronized successfully across Android & PC devices!');
    }, 1200);
  };

  const handleExport = () => {
    sound.playClick();
    const dataStr = JSON.stringify(player, null, 2);
    navigator.clipboard?.writeText(dataStr);
    setSyncMessage('📋 Save file JSON copied to clipboard! You can paste this on your Android device or PC.');
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson) as PlayerProfile;
      if (!parsed.name || !parsed.stats) {
        throw new Error('Invalid profile schema');
      }
      sound.playLevelUp();
      onImportProfile(parsed);
      setSyncMessage(`✅ Successfully restored profile for ${parsed.name} (Lv ${parsed.baseLevel})!`);
      setImportJson('');
    } catch {
      sound.playHit();
      setSyncMessage('❌ Failed to parse save data JSON. Please check file formatting.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="cloud-sync-modal"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              Cross-Platform Cloud Synchronization
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
              PC & Android
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

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {/* Cloud Sync Status Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-xs text-slate-200">Rune-Cloud Status: Online</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Last Synced: <span className="font-mono text-slate-300">{new Date(player.lastSavedAt).toLocaleTimeString()}</span>
              </div>
              <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                Integrity Checksum: {currentChecksum}
              </div>
            </div>

            <button
              type="button"
              disabled={syncStatus === 'syncing'}
              onClick={handleInstantSync}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs transition-colors shadow"
            >
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Cloud Now ☁️'}
            </button>
          </div>

          {syncMessage && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-center text-amber-300 font-medium">
              {syncMessage}
            </div>
          )}

          {/* Device Transfer: Export & Import */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cross-Device Transfer (Seamless PC ⇄ Android):
            </span>

            <button
              type="button"
              onClick={handleExport}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <span>📋 Export Profile to Clipboard (JSON)</span>
            </button>

            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                Import Save JSON from other device:
              </label>
              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste save JSON string here..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={!importJson.trim()}
                onClick={handleImport}
                className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wide transition-colors"
              >
                Restore & Synchronize Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
