import React from 'react';
import {
  Heart,
  Activity,
  BarChart3,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileEdit,
  Layers,
  Info,
  ShieldCheck
} from 'lucide-react';

export default function DashboardOverview({
  metadata,
  predictions,
  thresholds,
  patientRefId,
  selectedVessel,
  setSelectedVessel,
  colorblindMode,
  onNavigate
}) {
  const getStatusBadge = (prob) => {
    if (prob === undefined) return <span className="text-xs text-slate-400">Evaluating...</span>;

    if (prob < thresholds.low) {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorblindMode
          ? 'bg-teal-50 text-teal-800 border border-teal-200'
          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Low Risk / Normal
        </span>
      );
    } else if (prob <= thresholds.high) {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorblindMode
          ? 'bg-purple-50 text-purple-800 border border-purple-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          Borderline
        </span>
      );
    } else {
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorblindMode
          ? 'bg-yellow-50 text-yellow-900 border border-yellow-300'
          : 'bg-rose-50 text-rose-800 border border-rose-200'
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
      if (prob < thresholds.low) return '#059669';
      if (prob <= thresholds.high) return '#D97706';
      return '#DC2626';
    }
  };

  const targetCards = [
    {
      key: 'CAD',
      title: 'Overall CAD Status',
      subtitle: 'Global Coronary Artery Disease (Cath benchmark)',
      territory: 'Systemic evaluation across epicardial coronary circulation',
      model: predictions?.CAD?.algorithm || 'Balanced SVM'
    },
    {
      key: 'LAD',
      title: 'LAD Stenosis',
      subtitle: 'Left Anterior Descending Artery',
      territory: 'Supplies anterior LV wall, septum & cardiac apex',
      model: predictions?.LAD?.algorithm || 'Balanced Random Forest'
    },
    {
      key: 'LCX',
      title: 'LCX Stenosis',
      subtitle: 'Left Circumflex Artery',
      territory: 'Supplies lateral & posterior LV free wall',
      model: predictions?.LCX?.algorithm || 'XGBoost Classifier'
    },
    {
      key: 'RCA',
      title: 'RCA Stenosis',
      subtitle: 'Right Coronary Artery',
      territory: 'Supplies RV myocardium, inferior wall & AV node',
      model: predictions?.RCA?.algorithm || 'Balanced SVM'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Hero Welcome & Clinical Context Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#F0FDF8] border border-teal-200/80 text-[#0F766E] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" />
              <span>Cardiovascular Risk Decision Support</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] tracking-tight">
              Evidence-based CAD and coronary vessel risk assessment
            </h2>

            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              CardioVision estimates overall coronary artery disease (CAD) risk and individual stenosis probabilities for the
              <strong> Left Anterior Descending (LAD)</strong>, <strong>Left Circumflex (LCX)</strong>, and <strong>Right Coronary Artery (RCA)</strong> from routine non-invasive clinical biomarkers, vital signs, ECG, and echocardiography.
            </p>

            <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">

              {/* <span>Experimental research prototype trained on the Z-Alizadeh Sani cohort ($N=303$). Not a replacement for formal coronary angiography.</span> */}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('assessment')}
              className="px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-[#0F766E] hover:bg-[#0D6D65] text-white flex items-center justify-center gap-2 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Assessment</span>
            </button>

            {predictions && (
              <button
                onClick={() => onNavigate('results')}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 flex items-center justify-center gap-2 transition shadow-2xs"
              >
                <span>View Results & SHAP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Assessment Status: Active Multi-Vessel Results OR Thoughtful Empty State */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3.5">
          <div>
            <h3 className="text-base font-bold text-[#1E293B] tracking-tight">
              Patient Assessment Summary
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              {predictions
                ? `Active assessment reference: ${patientRefId || 'Current Patient'}`
                : 'Current assessment status and multi-vessel decision scores'
              }
            </p>
          </div>

          {predictions && (
            <button
              onClick={() => onNavigate('results')}
              className="text-xs font-semibold text-[#0F766E] hover:text-teal-900 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Full SHAP breakdown</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {predictions ? (
          /* ACTIVE PREDICTIONS: 4 Target Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {targetCards.map((target) => {
              const pred = predictions[target.key];
              const prob = pred?.probability;
              const isSelected = selectedVessel === target.key;

              return (
                <div
                  key={target.key}
                  onClick={() => {
                    setSelectedVessel(target.key);
                    onNavigate('visualization');
                  }}
                  className={`
                    p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between
                    ${isSelected
                      ? 'border-[#0F766E] bg-[#F0FDF8]/40 ring-1 ring-[#0F766E]/20'
                      : 'border-[#E2E8F0] bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }
                  `}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase font-semibold text-slate-500">
                        {pred?.algorithm || target.key}
                      </span>
                      {getStatusBadge(prob)}
                    </div>

                    <h4 className="text-sm font-bold text-[#1E293B] tracking-tight">{target.title}</h4>
                    <p className="text-[11px] text-[#64748B] mt-0.5 mb-3">{target.subtitle}</p>

                    {/* Probability Value */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 space-y-1">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">Estimated Score:</span>
                        <span className="font-bold font-mono text-[#1E293B] text-sm">
                          {prob !== undefined ? `${(prob * 100).toFixed(1)}%` : '--'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (prob || 0) * 100)}%`,
                            backgroundColor: getMeterColor(prob)
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="truncate pr-1">{target.territory}</span>
                    <ArrowRight className="w-3 h-3 text-[#0F766E] shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* THOUGHTFUL EMPTY STATE */
          <div className="py-8 px-4 text-center max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-2xl bg-[#F0FDF8] text-[#0F766E] flex items-center justify-center mx-auto border border-teal-200/60 shadow-2xs">
                <FileEdit className="w-5 h-5" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1E293B]">
                No active assessment loaded
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed max-w-lg mx-auto">
                Begin a new assessment to generate calibrated stenosis probabilities for all 3 major vessels, local SHAP physiological attributions, and dynamic 3D vessel risk coloring.
              </p>
            </div>

            {/* 3-Step Workflow Guidance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">Step 1</div>
                <div className="text-xs font-semibold text-[#1E293B]">Enter Clinical Features</div>
                <div className="text-[11px] text-slate-500">Provide vitals, ECG findings, labs & echocardiography.</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">Step 2</div>
                <div className="text-xs font-semibold text-[#1E293B]">Predict Vessel Stenosis</div>
                <div className="text-[11px] text-slate-500">Obtain verified scores for Overall CAD, LAD, LCX, and RCA.</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">Step 3</div>
                <div className="text-xs font-semibold text-[#1E293B]">Explore 3D & SHAP</div>
                <div className="text-[11px] text-slate-500">Inspect anatomical vessel coloring and feature contributions.</div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('assessment')}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D6D65] text-white inline-flex items-center gap-1.5 transition shadow-2xs"
            >
              <span>Begin Patient Assessment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Three Refined Exploration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 3D Heart */}
        <div
          onClick={() => onNavigate('visualization')}
          className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs hover:border-slate-300 transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-[#F0FDF8] text-[#0F766E] flex items-center justify-center mb-3 border border-teal-200/60">
              <Heart className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] transition">
              3D Heart & Coronary Vessels
            </h4>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Interactive WebGL anatomical model displaying the myocardium, aorta, and LAD, LCX, RCA vessels colored by model-estimated risk tiers.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <span>Open 3D Viewer</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 2: SHAP Explainability */}
        <div
          onClick={() => onNavigate(predictions ? 'results' : 'assessment')}
          className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs hover:border-slate-300 transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center mb-3 border border-slate-200">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] transition">
              Explainable AI (SHAP)
            </h4>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Patient-specific local SHAP attributions explaining which clinical features positively drive or protect against coronary stenosis.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <span>{predictions ? 'Inspect SHAP Breakdown' : 'Start Assessment'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Card 3: Model Performance & Audit */}
        <div
          onClick={() => onNavigate('performance')}
          className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs hover:border-slate-300 transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center mb-3 border border-slate-200">
              <BarChart3 className="w-4.5 h-4.5" />
            </div>
            <h4 className="text-sm font-bold text-[#1E293B] group-hover:text-[#0F766E] transition">
              Validation & Leakage Audit
            </h4>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Independent evaluation on held-out test data (N=61) reporting ROC-AUC, sensitivity, specificity, Brier scores, and zero target leakage.
            </p>
          </div>
          <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-[#0F766E]">
            <span>View Validation Metrics</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
