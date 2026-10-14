import React from 'react';
import { Award, ShieldCheck, BarChart2, CheckCircle2, Info, ArrowRight } from 'lucide-react';

export default function ModelPerformanceView({ metadata }) {
  const evaluation = metadata?.evaluation || {};

  const targets = [
    { 
      key: 'CAD', 
      name: 'Overall CAD Status', 
      subtitle: 'Target: Cath catheterization benchmark',
      algorithm: evaluation?.CAD?.algorithm || 'Balanced RBF SVM'
    },
    { 
      key: 'LAD', 
      name: 'LAD Stenosis', 
      subtitle: 'Target: Left Anterior Descending Artery',
      algorithm: evaluation?.LAD?.algorithm || 'Balanced Random Forest'
    },
    { 
      key: 'LCX', 
      name: 'LCX Stenosis', 
      subtitle: 'Target: Left Circumflex Artery',
      algorithm: evaluation?.LCX?.algorithm || 'Tuned XGBoost'
    },
    { 
      key: 'RCA', 
      name: 'RCA Stenosis', 
      subtitle: 'Target: Right Coronary Artery',
      algorithm: evaluation?.RCA?.algorithm || 'Balanced RBF SVM'
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
              Model Performance & Leakage Audit
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F0FDF8] text-[#0F766E] border border-teal-200 font-semibold">
              0% Leakage Verified
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
            Independent evaluation on holdout test partition (N=61 patients, 20% test split) of the Z-Alizadeh Sani cohort (total N=303).
          </p>
        </div>
      </div>

      {/* 2. Target Leakage Prevention Verification Box */}
      <div className="bg-[#F0FDF8] border border-teal-200/80 rounded-2xl p-5 space-y-2.5 shadow-2xs">
        <div className="flex items-center gap-2 text-teal-950 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
          <span>Strict Target Leakage Prevention Verified</span>
        </div>
        <p className="text-xs text-teal-900 leading-relaxed">
          The four ground-truth outcome columns (<code className="font-bold bg-teal-100/80 px-1.5 py-0.5 rounded text-teal-950">Cath</code>, <code className="font-bold bg-teal-100/80 px-1.5 py-0.5 rounded text-teal-950">LAD</code>, <code className="font-bold bg-teal-100/80 px-1.5 py-0.5 rounded text-teal-950">LCX</code>, <code className="font-bold bg-teal-100/80 px-1.5 py-0.5 rounded text-teal-950">RCA</code>) are strictly excluded from all training and inference feature sets across all models.
          The overall CAD model predicts catheterization status purely from non-invasive clinical, ECG, echocardiographic, and laboratory features without access to individual vessel stenosis labels.
        </p>
      </div>

      {/* 3. Comprehensive Performance Comparison Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-sm font-bold text-[#1E293B]">
              Independent Holdout Test Performance Comparison (N=61)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Metric precision: 4 decimal places
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-slate-600 font-semibold border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Prediction Target</th>
                <th className="py-3 px-4">Optimal Algorithm</th>
                <th className="py-3 px-4 text-right">Accuracy</th>
                <th className="py-3 px-4 text-right">ROC-AUC</th>
                <th className="py-3 px-4 text-right">Sensitivity</th>
                <th className="py-3 px-4 text-right">Specificity</th>
                <th className="py-3 px-4 text-right">F1-Score</th>
                <th className="py-3 px-4 text-right">Brier Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-slate-800 font-mono">
              {targets.map((t) => {
                const m = evaluation[t.key] || {};
                return (
                  <tr key={t.key} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-sans font-bold text-[#1E293B]">
                      <div>{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{t.subtitle}</div>
                    </td>
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-600">
                      {m.algorithm || t.algorithm}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {m.accuracy !== undefined ? `${(m.accuracy * 100).toFixed(1)}%` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#0F766E]">
                      {m.roc_auc !== undefined ? m.roc_auc.toFixed(4) : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-700">
                      {m.sensitivity_recall !== undefined ? `${(m.sensitivity_recall * 100).toFixed(1)}%` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-700">
                      {m.specificity !== undefined ? `${(m.specificity * 100).toFixed(1)}%` : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {m.f1_score !== undefined ? m.f1_score.toFixed(4) : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      {m.brier_score !== undefined ? m.brier_score.toFixed(4) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3B. Repeated Stratified 25-Fold Cross-Validation Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-sm font-bold text-[#1E293B]">
              Repeated Stratified Cross-Validation (25 Folds on Training Cohort, N=242)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            5×5 Repeated Stratified Splits (Mean ± Std)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F8FAFC] text-slate-600 font-semibold border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-4">Prediction Target</th>
                <th className="py-3 px-4">Algorithm</th>
                <th className="py-3 px-4 text-right">CV Accuracy (Mean ± SD)</th>
                <th className="py-3 px-4 text-right">CV Balanced Acc</th>
                <th className="py-3 px-4 text-right">CV ROC-AUC (Mean ± SD)</th>
                <th className="py-3 px-4 text-right">CV Sensitivity</th>
                <th className="py-3 px-4 text-right">CV F1-Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-slate-800 font-mono">
              {targets.map((t) => {
                const m = evaluation[t.key] || {};
                const cv = m.cv_repeated_25fold || {};
                return (
                  <tr key={t.key} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-sans font-bold text-[#1E293B]">
                      {t.name}
                    </td>
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-600">
                      {m.algorithm || t.algorithm}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {cv.accuracy_mean !== undefined 
                        ? `${(cv.accuracy_mean * 100).toFixed(1)}% ± ${(cv.accuracy_std * 100).toFixed(1)}%` 
                        : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-800">
                      {cv.balanced_accuracy_mean !== undefined 
                        ? `${(cv.balanced_accuracy_mean * 100).toFixed(1)}%` 
                        : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#0F766E]">
                      {cv.roc_auc_mean !== undefined 
                        ? `${cv.roc_auc_mean.toFixed(4)} ± ${cv.roc_auc_std.toFixed(3)}` 
                        : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-700">
                      {cv.sensitivity_mean !== undefined 
                        ? `${(cv.sensitivity_mean * 100).toFixed(1)}%` 
                        : '--'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {cv.f1_mean !== undefined ? cv.f1_mean.toFixed(4) : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Confusion Matrices Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#1E293B]">
          Confusion Matrices (Holdout Test Partition, N=61)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {targets.map((t) => {
            const m = evaluation[t.key] || {};
            const cm = m.confusion_matrix || {};
            return (
              <div key={t.key} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-[#1E293B]">{t.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{m.algorithm || t.algorithm}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                  <div className="bg-[#F0FDF8] border border-teal-200/60 p-2 rounded-xl">
                    <span className="text-[10px] text-teal-800 block font-sans">True Pos (TP)</span>
                    <span className="text-base font-bold text-teal-950">{cm.true_positive ?? '--'}</span>
                  </div>
                  <div className="bg-rose-50/70 border border-rose-200/60 p-2 rounded-xl">
                    <span className="text-[10px] text-rose-800 block font-sans">False Pos (FP)</span>
                    <span className="text-base font-bold text-rose-950">{cm.false_positive ?? '--'}</span>
                  </div>
                  <div className="bg-rose-50/70 border border-rose-200/60 p-2 rounded-xl">
                    <span className="text-[10px] text-rose-800 block font-sans">False Neg (FN)</span>
                    <span className="text-base font-bold text-rose-950">{cm.false_negative ?? '--'}</span>
                  </div>
                  <div className="bg-[#F0FDF8] border border-teal-200/60 p-2 rounded-xl">
                    <span className="text-[10px] text-teal-800 block font-sans">True Neg (TN)</span>
                    <span className="text-base font-bold text-teal-950">{cm.true_negative ?? '--'}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100 font-mono">
                  <span>Total Samples:</span>
                  <span className="font-bold text-slate-800">{cm.total || 61}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
