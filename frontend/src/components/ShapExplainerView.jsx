import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  User, 
  Globe
} from 'lucide-react';

export default function ShapExplainerView({
  explanation,
  globalShap,
  selectedVessel,
  setSelectedVessel,
  loadingExplanation,
  colorblindMode
}) {
  const [viewMode, setViewMode] = useState('local'); // 'local' or 'global'

  const currentGlobal = globalShap?.[selectedVessel]?.original_features || [];
  const topDrivers = explanation?.top_risk_drivers || [];
  const topProtective = explanation?.top_protective_factors || [];

  const targets = ['CAD', 'LAD', 'LCX', 'RCA'];

  const getPositiveColor = () => colorblindMode ? '#B45309' : '#BE123C'; // Restrained amber vs restrained rose
  const getNegativeColor = () => colorblindMode ? '#0D9488' : '#0F766E'; // Accessible teal vs medical teal

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Top Header with Target Switcher & View Mode */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-[#1E293B]">
              Clinical Explainability & Feature Attributions (SHAP)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F0FDF8] text-[#0F766E] border border-teal-200 font-semibold">
              Target: {selectedVessel}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Explains how individual patient features contributed positively or negatively to the {selectedVessel} decision score.
          </p>
        </div>

        {/* Target Tabs & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {targets.map((tgt) => (
              <button
                key={tgt}
                onClick={() => setSelectedVessel(tgt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedVessel === tgt
                    ? 'bg-white text-[#0F766E] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tgt}
              </button>
            ))}
          </div>

          {/* View Mode (Local vs Global) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('local')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'local'
                  ? 'bg-white text-[#0F766E] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Patient Local</span>
            </button>
            <button
              onClick={() => setViewMode('global')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'global'
                  ? 'bg-white text-[#0F766E] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Cohort Global</span>
            </button>
          </div>
        </div>
      </div>

      {loadingExplanation ? (
        <div className="py-12 text-center text-slate-500 space-y-2">
          <div className="w-6 h-6 border-2 border-[#0F766E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium">Computing exact SHAP feature attributions on transformed feature space...</p>
        </div>
      ) : viewMode === 'local' ? (
        /* LOCAL PATIENT EXPLANATION VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Risk Drivers (Increases Stenosis Score) */}
            <div className="bg-rose-50/40 rounded-xl p-4 border border-rose-200/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                  <TrendingUp className="w-4 h-4 text-rose-600" />
                  <span>Risk Drivers (Increases Stenosis Probability)</span>
                </div>
                <span className="text-[10px] text-rose-700 font-mono font-bold bg-rose-100/70 px-2 py-0.5 rounded">
                  + SHAP
                </span>
              </div>

              {topDrivers.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No positive risk-driving features identified for this target.</p>
              ) : (
                <div className="space-y-2.5">
                  {topDrivers.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-rose-100 shadow-2xs space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#1E293B] mr-1.5">{item.feature}</span>
                          <span className="text-[11px] text-[#64748B]">({item.description})</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-700 shrink-0">
                          +{item.shap_value.toFixed(4)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="text-slate-500">Patient Measurement:</span>
                        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                          {String(item.patient_value)} {item.unit || ''}
                        </span>
                      </div>

                      {/* Visual Proportional Contribution Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (item.abs_shap / 0.15) * 100)}%`,
                            backgroundColor: getPositiveColor()
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Protective Factors (Lowers Stenosis Score) */}
            <div className="bg-[#F0FDF8]/60 rounded-xl p-4 border border-teal-200/70 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-teal-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <TrendingDown className="w-4 h-4 text-[#0F766E]" />
                  <span>Protective Factors (Lowers Stenosis Probability)</span>
                </div>
                <span className="text-[10px] text-teal-800 font-mono font-bold bg-teal-100/70 px-2 py-0.5 rounded">
                  − SHAP
                </span>
              </div>

              {topProtective.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No protective negative features identified for this target.</p>
              ) : (
                <div className="space-y-2.5">
                  {topProtective.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-3 border border-teal-100 shadow-2xs space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-[#1E293B] mr-1.5">{item.feature}</span>
                          <span className="text-[11px] text-[#64748B]">({item.description})</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[#0F766E] shrink-0">
                          {item.shap_value.toFixed(4)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="text-slate-500">Patient Measurement:</span>
                        <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                          {String(item.patient_value)} {item.unit || ''}
                        </span>
                      </div>

                      {/* Visual Proportional Contribution Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (item.abs_shap / 0.15) * 100)}%`,
                            backgroundColor: getNegativeColor()
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* GLOBAL COHORT IMPORTANCE VIEW */
        <div className="bg-slate-50 rounded-xl p-5 border border-[#E2E8F0] space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-[#0F766E]" />
              <span>Global Mean Absolute SHAP Importance across Test Cohort (N=61)</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Target: {selectedVessel}</span>
          </div>

          <div className="space-y-2 pt-1">
            {currentGlobal.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs">
                <span className="w-32 font-medium text-slate-700 truncate text-right font-mono text-[11px]" title={item.feature}>
                  {item.feature}
                </span>
                <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                  <div
                    className="h-full bg-[#0F766E] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (item.mean_abs_shap / (currentGlobal[0]?.mean_abs_shap || 1)) * 100)}%` }}
                  />
                </div>
                <span className="w-14 font-mono font-bold text-slate-800 text-[11px]">
                  {item.mean_abs_shap.toFixed(4)}
                </span>
                <span className="w-44 text-[10px] text-slate-500 truncate">
                  {item.desc} {item.unit ? `[${item.unit}]` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
