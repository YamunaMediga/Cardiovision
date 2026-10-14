import React from 'react';
import { Layers, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function VesselFallback2D({
  predictions,
  thresholds,
  selectedVessel,
  setSelectedVessel,
  colorblindMode
}) {
  const getVesselColor = (prob) => {
    if (prob === undefined || prob === null) return '#94A3B8';
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

  const ladProb = predictions?.LAD?.probability;
  const lcxProb = predictions?.LCX?.probability;
  const rcaProb = predictions?.RCA?.probability;
  const cadProb = predictions?.CAD?.probability;

  return (
    <div className="relative w-full h-[540px] bg-slate-50 rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs flex flex-col items-center justify-between p-4">
      {/* Fallback Notice */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-900 text-xs">
          <Layers className="w-3.5 h-3.5 text-amber-600" />
          <span>2D Schematic Fallback Mode (Optimized for low-spec/non-WebGL devices)</span>
        </div>

        {/* Vessel Toggle */}
        <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] p-1 rounded-xl shadow-2xs">
          {['CAD', 'LAD', 'LCX', 'RCA'].map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVessel(v)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedVessel === v ? 'bg-[#0F766E] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v === 'CAD' ? 'Full Heart' : v}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Coronary Tree Anatomical Diagram */}
      <div className="relative w-full max-w-md h-80 flex items-center justify-center my-auto">
        <svg viewBox="0 0 400 320" className="w-full h-full filter drop-shadow-sm">
          {/* Cardiac Silhouette Outline */}
          <path
            d="M 200 40 C 260 40 320 80 320 160 C 320 230 220 290 200 305 C 180 290 80 230 80 160 C 80 80 140 40 200 40 Z"
            fill="#FEE2E2"
            fillOpacity="0.45"
            stroke="#FDA4AF"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Ascending Aorta Root */}
          <path
            d="M 180 75 Q 180 25 210 25 Q 235 25 235 75 Z"
            fill="#EF4444"
            fillOpacity="0.85"
            stroke="#DC2626"
            strokeWidth="2"
          />
          <text x="207" y="52" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">Aorta</text>

          {/* RCA (Right Coronary Artery) */}
          <g 
            onClick={() => setSelectedVessel('RCA')} 
            className="cursor-pointer group"
          >
            <path
              d="M 180 70 Q 130 90 120 150 Q 115 210 145 250"
              fill="none"
              stroke={getVesselColor(rcaProb)}
              strokeWidth={selectedVessel === 'RCA' ? '7' : '5'}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {/* RCA Marginal branch */}
            <path
              d="M 120 150 Q 100 170 95 200"
              fill="none"
              stroke={getVesselColor(rcaProb)}
              strokeWidth={selectedVessel === 'RCA' ? '4' : '3'}
              strokeLinecap="round"
            />
            <circle cx="120" cy="150" r="5" fill={getVesselColor(rcaProb)} />
            <text x="95" y="145" fill="#1E293B" fontSize="11" fontWeight="bold">RCA</text>
            <text x="95" y="160" fill={getVesselColor(rcaProb)} fontSize="9" fontFamily="monospace" fontWeight="bold">
              {rcaProb !== undefined ? `${(rcaProb * 100).toFixed(0)}%` : '--'}
            </text>
          </g>

          {/* LMCA (Left Main) */}
          <path
            d="M 235 70 L 255 85"
            fill="none"
            stroke="#64748B"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* LAD (Left Anterior Descending) */}
          <g 
            onClick={() => setSelectedVessel('LAD')} 
            className="cursor-pointer group"
          >
            <path
              d="M 255 85 Q 245 140 230 190 Q 215 240 200 300"
              fill="none"
              stroke={getVesselColor(ladProb)}
              strokeWidth={selectedVessel === 'LAD' ? '7' : '5'}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {/* LAD Diagonal branch */}
            <path
              d="M 240 160 Q 270 190 280 230"
              fill="none"
              stroke={getVesselColor(ladProb)}
              strokeWidth={selectedVessel === 'LAD' ? '4' : '3'}
              strokeLinecap="round"
            />
            <circle cx="235" cy="170" r="5" fill={getVesselColor(ladProb)} />
            <text x="205" y="175" fill="#1E293B" fontSize="11" fontWeight="bold">LAD</text>
            <text x="205" y="190" fill={getVesselColor(ladProb)} fontSize="9" fontFamily="monospace" fontWeight="bold">
              {ladProb !== undefined ? `${(ladProb * 100).toFixed(0)}%` : '--'}
            </text>
          </g>

          {/* LCX (Left Circumflex Artery) */}
          <g 
            onClick={() => setSelectedVessel('LCX')} 
            className="cursor-pointer group"
          >
            <path
              d="M 255 85 Q 295 105 305 155 Q 310 195 285 240"
              fill="none"
              stroke={getVesselColor(lcxProb)}
              strokeWidth={selectedVessel === 'LCX' ? '7' : '5'}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {/* LCX Obtuse Marginal branch */}
            <path
              d="M 305 155 Q 320 180 325 210"
              fill="none"
              stroke={getVesselColor(lcxProb)}
              strokeWidth={selectedVessel === 'LCX' ? '4' : '3'}
              strokeLinecap="round"
            />
            <circle cx="305" cy="155" r="5" fill={getVesselColor(lcxProb)} />
            <text x="320" y="145" fill="#1E293B" fontSize="11" fontWeight="bold">LCX</text>
            <text x="320" y="160" fill={getVesselColor(lcxProb)} fontSize="9" fontFamily="monospace" fontWeight="bold">
              {lcxProb !== undefined ? `${(lcxProb * 100).toFixed(0)}%` : '--'}
            </text>
          </g>

          {/* Apex Marker */}
          <circle cx="200" cy="300" r="3" fill="#64748B" />
          <text x="200" y="318" fill="#64748B" fontSize="9" textAnchor="middle">Apex</text>
        </svg>
      </div>

      {/* Detail Footer */}
      <div className="w-full flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">Selected: {selectedVessel}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">
            {selectedVessel === 'CAD' && `Overall CAD Probability: ${(cadProb * 100 || 0).toFixed(1)}%`}
            {selectedVessel === 'LAD' && `LAD Stenosis Probability: ${(ladProb * 100 || 0).toFixed(1)}%`}
            {selectedVessel === 'LCX' && `LCX Stenosis Probability: ${(lcxProb * 100 || 0).toFixed(1)}%`}
            {selectedVessel === 'RCA' && `RCA Stenosis Probability: ${(rcaProb * 100 || 0).toFixed(1)}%`}
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Click any vessel path above or use buttons to switch target
        </div>
      </div>
    </div>
  );
}
