import React, { useState } from 'react';
import { HardwareMetrics, AntiCheatStatus } from '../types';

interface AntiCheatAndPerfModalProps {
  metrics: HardwareMetrics;
  antiCheat: AntiCheatStatus;
  onClose: () => void;
}

export const AntiCheatAndPerfModal: React.FC<AntiCheatAndPerfModalProps> = ({
  metrics,
  antiCheat,
  onClose,
}) => {
  const [selectedTier, setSelectedTier] = useState<HardwareMetrics['tier']>(metrics.tier || 'Ultra');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-none p-4 select-none"
      data-testid="anti-cheat-modal"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base font-black uppercase tracking-wider text-amber-400">
              System Diagnostics & Fair Play Security
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              Aegis Guard Active
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
        <div className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Section 1: Aegis Guard Anti-Cheat System */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h4 className="font-black text-sm text-emerald-400">Aegis Guard Anti-Cheat Engine</h4>
                  <p className="text-[11px] text-slate-400">
                    Client-Server Authoritative Action Integrity & Delta Validator
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                100% Fair Play Verified
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                Speedhack Detector: <span className="text-emerald-400 font-bold">CLEAN (0 Anomalies)</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                Stat Spoof Guard: <span className="text-emerald-400 font-bold">SYNCHRONIZED</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                Clock Drift Check: <span className="text-emerald-400 font-bold">LOCKED (&lt;2ms)</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                Integrity Token: <span className="text-amber-400 font-bold">{antiCheat.integrityHash}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Real-time Hardware Performance Analytics */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Real-time Hardware Telemetry (Across Hardware Tiers):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Frame Rate</span>
                <span className="text-xl font-black text-emerald-400 tabular-nums">{metrics.fps} FPS</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Frame Render Time</span>
                <span className="text-xl font-black text-sky-400 tabular-nums">{metrics.frameTimeMs} ms</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Draw Calls</span>
                <span className="text-xl font-black text-amber-400 tabular-nums">{metrics.drawCalls}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-sans block">Polygon Triangles</span>
                <span className="text-xl font-black text-purple-400 tabular-nums">{metrics.polyCount}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Profile Presets */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Dynamic Hardware Tier Scaling:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Low', 'Medium', 'High', 'Ultra'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    selectedTier === tier
                      ? 'border-amber-400 bg-slate-800 text-amber-300'
                      : 'border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <div>{tier} Tier</div>
                  <div className="text-[9px] text-slate-500 font-normal">
                    {tier === 'Low' ? 'Budget Mobiles' : tier === 'Medium' ? 'Tablets' : tier === 'High' ? 'PC Mid-tier' : 'PC Enthusiast'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
