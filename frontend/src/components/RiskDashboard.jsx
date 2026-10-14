import React from 'react';
import { Sliders, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Gauge, Info } from 'lucide-react';

export default function RiskDashboard({
  predictions,
  thresholds,
  setThresholds,
  selectedVessel,
  setSelectedVessel,
  colorblindMode
}) {
  const getStatusBadge = (prob) => {
    if (prob === undefined) {
      return <span className="text-xs text-slate-400">Evaluating...</span>;
    }

    if (prob < thresholds.low) {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          colorblindMode ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Low Risk / Normal
        </span>
      );
    } else if (prob <= thresholds.high) {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          colorblindMode ? 'bg-purple-50 text-purple-800 border border-purple-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Borderline
        </span>
      );
    } else {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          colorblindMode ? 'bg-yellow-50 text-yellow-900 border border-yellow-300' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <ShieldAlert className="w-3 h-3 text-rose-600" />
          Stenosis Risk
        </span>
      );
    }
  };

  const getMeterColor = (prob) => {
    if (prob === undefined) return '#94A3B8';
    if (colorblindMode) {
      if (prob < thresholds.low) return '#0D9488';
      if (prob <= thresholds.high) return '#7C3AED';
      return '#EAB308';
    } else {
      if (prob < thresholds.low) return '#10B981';
      if (prob <= thresholds.high) return '#F59E0B';
      return '#EF4444';
    }
  };

  const targets = [
    { key: 'CAD', name: 'Overall CAD Status', subtitle: 'Global Coronary Artery Disease (Cath Target)' },
    { key: 'LAD', name: 'LAD Stenosis', subtitle: 'Left Anterior Descending Artery' },
    { key: 'LCX', name: 'LCX Stenosis', subtitle: 'Left Circumflex Artery' },
    { key: 'RCA', name: 'RCA Stenosis', subtitle: 'Right Coronary Artery' },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Prediction Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {targets.map(({ key, name, subtitle }) => {
          const pred = predictions?.[key];
          const prob = pred?.probability;
          const isSelected = selectedVessel === key;

          return (
            <div
              key={key}
              onClick={() => setSelectedVessel(key)}
              className={`bg-white rounded-2xl p-4 transition-all duration-200 cursor-pointer border flex flex-col justify-between shadow-xs ${
                isSelected 
                  ? 'border-blue-600 ring-2 ring-blue-500/20' 
                  : 'border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                    {pred?.algorithm || 'Model'}
                  </span>
                  {getStatusBadge(prob)}
                </div>

                <h3 className="text-sm font-bold text-[#172B4D] tracking-tight">{name}</h3>
                <p className="text-[11px] text-slate-500 mb-3">{subtitle}</p>

                {/* Probability Meter & Exact Value */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-600 font-medium">Decision Probability:</span>
                    <span className="text-lg font-bold font-mono text-[#172B4D]">
                      {prob !== undefined ? `${(prob * 100).toFixed(1)}%` : '--%'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (prob || 0) * 100)}%`,
                        backgroundColor: getMeterColor(prob)
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                      style={{ left: `${thresholds.low * 100}%` }}
                      title={`Low Threshold: ${thresholds.low}`}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-slate-400"
                      style={{ left: `${thresholds.high * 100}%` }}
                      title={`High Threshold: ${thresholds.high}`}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="text-slate-500 font-mono">
                  ROC-AUC: <span className="text-slate-800 font-bold">{pred?.metrics?.roc_auc?.toFixed(3) || '--'}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-semibold">
                  {isSelected ? 'Focused' : 'Focus Vessel'}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Threshold Configuration Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-[#172B4D]">Configurable Risk Thresholds:</span>
          <span className="text-slate-500 text-[11px]">
            Adjust cutoffs for Low (&lt; {thresholds.low}) vs Borderline vs High (&gt; {thresholds.high})
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono">Low cutoff:</span>
            <input
              type="range"
              min="0.10"
              max="0.45"
              step="0.05"
              value={thresholds.low}
              onChange={(e) => setThresholds(prev => ({ ...prev, low: parseFloat(e.target.value) }))}
              className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="font-mono font-bold text-slate-900 text-xs">{thresholds.low}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono">High cutoff:</span>
            <input
              type="range"
              min="0.55"
              max="0.90"
              step="0.05"
              value={thresholds.high}
              onChange={(e) => setThresholds(prev => ({ ...prev, high: parseFloat(e.target.value) }))}
              className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
            <span className="font-mono font-bold text-slate-900 text-xs">{thresholds.high}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
