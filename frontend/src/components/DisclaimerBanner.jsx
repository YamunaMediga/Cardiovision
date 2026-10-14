import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export default function DisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {/* <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> */}
          {/* <p className="font-medium text-amber-950">
            <span className="font-semibold uppercase tracking-wider text-amber-800 mr-1.5">[Clinical Research Disclaimer]</span>
            CardioVision is an experimental AI research prototype for educational and decision-support exploration. Its predictions are not a diagnosis and do not replace professional clinical assessment or formal diagnostic imaging.
          </p> */}
        </div>
        {/* <button
          onClick={() => setExpanded(!expanded)}
          className="text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1 shrink-0 transition"
        >
          {expanded ? 'Less Details' : 'Methodology Notes'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button> */}
      </div>

      {expanded && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-amber-900 leading-relaxed">
          <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 shadow-xs">
            <span className="font-semibold text-amber-950 block mb-1">Target Leakage Prevention:</span>
            Catheterization outcomes (<code className="text-amber-900 font-bold">Cath</code>, <code className="text-amber-900 font-bold">LAD</code>, <code className="text-amber-900 font-bold">LCX</code>, <code className="text-amber-900 font-bold">RCA</code>) are strictly excluded from all model feature spaces during training and inference.
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 shadow-xs">
            <span className="font-semibold text-amber-950 block mb-1">Anatomical Scope:</span>
            The 3D visualization displays vessel-level predictive classification status (LAD, LCX, RCA). It does not infer millimeter lesion coordinates, narrowing percentage, or intra-luminal geometry from clinical features.
          </div>
          <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/80 shadow-xs">
            <span className="font-semibold text-amber-950 block mb-1">SHAP & Probability Quality:</span>
            SHAP attributions describe statistical feature importance within the fitted decision function, not physiological causation. Model scores are machine learning decision outputs evaluated alongside Brier calibration metrics.
          </div>
        </div>
      )}
    </div>
  );
}
