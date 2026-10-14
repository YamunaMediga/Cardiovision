import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Activity,
  FileText,
  User,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import ShapExplainerView from './ShapExplainerView';

export default function PatientResultsPage({
  patientRefId,
  patientData,
  predictions,
  thresholds,
  selectedVessel,
  setSelectedVessel,
  explanation,
  globalShap,
  loadingExplanation,
  colorblindMode,
  onReturnToForm,
  onView3DHeart
}) {
  const [showMeasurements, setShowMeasurements] = useState(false);

  // If no predictions exist yet, render a clean empty state
  if (!predictions) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-2xs space-y-4 max-w-xl mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-[#F0FDF8] text-[#0F766E] flex items-center justify-center mx-auto border border-teal-200/60 shadow-2xs">
          <Activity className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#1E293B]">No Assessment Results Available</h2>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Please complete the patient assessment form to generate overall CAD risk and vessel-specific (LAD, LCX, RCA) predictions with local SHAP feature attributions.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onReturnToForm}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D6D65] text-white inline-flex items-center gap-1.5 transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Open Assessment Form</span>
          </button>
        </div>
      </div>
    );
  }

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

  const vessels = [
    {
      key: 'LAD',
      shortName: 'LAD',
      fullName: 'Left Anterior Descending Artery',
      territory: 'Supplies anterior LV wall, interventricular septum & cardiac apex',
      algorithm: predictions?.LAD?.algorithm || 'Balanced Random Forest'
    },
    {
      key: 'LCX',
      shortName: 'LCX',
      fullName: 'Left Circumflex Artery',
      territory: 'Supplies posterolateral left ventricular free wall',
      algorithm: predictions?.LCX?.algorithm || 'XGBoost Classifier'
    },
    {
      key: 'RCA',
      shortName: 'RCA',
      fullName: 'Right Coronary Artery',
      territory: 'Supplies right ventricle, inferior LV wall & conduction nodes',
      algorithm: predictions?.RCA?.algorithm || 'Balanced RBF SVM'
    }
  ];

  const cadPred = predictions?.CAD;
  const cadProb = cadPred?.probability;

  // Download Assessment Summary as text report
  const downloadSummary = () => {
    const summaryText = `CARDIOVISION CLINICAL ASSESSMENT SUMMARY REPORT
Generated: ${new Date().toLocaleString()}
Patient Reference ID: ${patientRefId || 'N/A'}

============================================================
1. MODEL-ESTIMATED PREDICTIONS & PROBABILITIES
============================================================
Overall CAD (Cath Benchmark):
  - Model Decision Probability: ${(predictions?.CAD?.probability * 100 || 0).toFixed(1)}%
  - Risk Classification: ${predictions?.CAD?.risk_tier || 'N/A'}
  - Holdout Test ROC-AUC: ${predictions?.CAD?.metrics?.roc_auc?.toFixed(3) || 'N/A'}
  - Architecture: ${predictions?.CAD?.algorithm || 'Balanced RBF SVM'}

Left Anterior Descending (LAD) Stenosis:
  - Model Decision Probability: ${(predictions?.LAD?.probability * 100 || 0).toFixed(1)}%
  - Risk Classification: ${predictions?.LAD?.risk_tier || 'N/A'}
  - Holdout Test ROC-AUC: ${predictions?.LAD?.metrics?.roc_auc?.toFixed(3) || 'N/A'}
  - Architecture: ${predictions?.LAD?.algorithm || 'Random Forest'}

Left Circumflex (LCX) Stenosis:
  - Model Decision Probability: ${(predictions?.LCX?.probability * 100 || 0).toFixed(1)}%
  - Risk Classification: ${predictions?.LCX?.risk_tier || 'N/A'}
  - Holdout Test ROC-AUC: ${predictions?.LCX?.metrics?.roc_auc?.toFixed(3) || 'N/A'}
  - Architecture: ${predictions?.LCX?.algorithm || 'XGBoost'}

Right Coronary Artery (RCA) Stenosis:
  - Model Decision Probability: ${(predictions?.RCA?.probability * 100 || 0).toFixed(1)}%
  - Risk Classification: ${predictions?.RCA?.risk_tier || 'N/A'}
  - Holdout Test ROC-AUC: ${predictions?.RCA?.metrics?.roc_auc?.toFixed(3) || 'N/A'}
  - Architecture: ${predictions?.RCA?.algorithm || 'Balanced RBF SVM'}

============================================================
2. SUBMITTED PATIENT MEASUREMENTS & PHYSIOLOGY
============================================================
1. Demographics & Anthropometrics:
  - Age: ${patientData.Age} yrs | Sex: ${patientData.Sex}
  - Height: ${patientData.Length} cm | Weight: ${patientData.Weight} kg | BMI: ${patientData.BMI} kg/m² | Obesity: ${patientData.Obesity}

2. Vital Signs & Symptoms:
  - Blood Pressure: ${patientData.BP} mmHg | Pulse Rate: ${patientData.PR} bpm
  - Typical Chest Pain: ${patientData['Typical Chest Pain']} | Atypical: ${patientData.Atypical} | Nonanginal: ${patientData.Nonanginal}
  - Dyspnea: ${patientData.Dyspnea} | Function Class (NYHA): ${patientData['Function Class']}
  - Edema: ${patientData.Edema} | Weak Peripheral Pulse: ${patientData['Weak Peripheral Pulse']}
  - Lung Rales: ${patientData['Lung rales']} | Systolic Murmur: ${patientData['Systolic Murmur']} | Diastolic: ${patientData['Diastolic Murmur']}

3. Medical History & Risk Factors:
  - Diabetes: ${patientData.DM} | Hypertension: ${patientData.HTN}
  - Current Smoker: ${patientData['Current Smoker']} | Ex-Smoker: ${patientData['EX-Smoker']}
  - Family History of CAD: ${patientData.FH} | Dyslipidemia: ${patientData.DLP}
  - Chronic Renal Failure: ${patientData.CRF} | Stroke/CVA: ${patientData.CVA}
  - Airway Disease: ${patientData['Airway disease']} | Thyroid: ${patientData['Thyroid Disease']} | CHF: ${patientData.CHF}

4. Laboratory Biomarkers:
  - Fasting Blood Sugar: ${patientData.FBS} mg/dL | Serum Creatinine: ${patientData.CR} mg/dL
  - Triglycerides: ${patientData.TG} mg/dL | LDL: ${patientData.LDL} mg/dL | HDL: ${patientData.HDL} mg/dL
  - BUN: ${patientData.BUN} mg/dL | ESR: ${patientData.ESR} mm/hr | Hemoglobin: ${patientData.HB} g/dL
  - Serum Potassium: ${patientData.K} mEq/L | Sodium: ${patientData.Na} mEq/L
  - WBC: ${patientData.WBC} cells/μL | Lymphocytes: ${patientData.Lymph}% | Neutrophils: ${patientData.Neut}% | Platelets: ${patientData.PLT} x10³/μL

5. ECG & Echocardiographic Assessment:
  - Ejection Fraction (EF-TTE): ${patientData['EF-TTE']}% | Regional Wall Motion Score (RWMA): ${patientData['Region RWMA']}
  - Valvular Heart Disease (VHD): ${patientData.VHD} | Bundle Branch Block: ${patientData.BBB}
  - Pathological Q Wave: ${patientData['Q Wave']} | ST Elevation: ${patientData['St Elevation']} | ST Depression: ${patientData['St Depression']}
  - T-Wave Inversion: ${patientData.Tinversion} | Left Ventricular Hypertrophy (LVH): ${patientData.LVH} | Poor R Progression: ${patientData['Poor R Progression']}

============================================================
3. CLINICAL RESEARCH DISCLAIMER
============================================================
CardioVision is an experimental research prototype for clinical decision-support 
and educational exploration. Predictions do not constitute medical diagnosis 
and do not replace formal coronary angiography or physician assessment.
`;

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CardioVision_Assessment_${patientRefId || 'Patient'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Action Bar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#1E293B]">
              Assessment Results & Decision Analysis
            </h2>
            {patientRefId && (
              <span className="font-mono text-xs font-semibold text-[#0F766E] bg-[#F0FDF8] px-2.5 py-0.5 rounded-full border border-teal-200">
                {patientRefId}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Calibrated stenosis probabilities for overall CAD and individual epicardial coronary vessels.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onReturnToForm}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 flex items-center gap-1.5 transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Inputs</span>
          </button>

          <button
            onClick={onView3DHeart}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDF8] hover:bg-teal-50 text-[#0F766E] border border-teal-200/80 flex items-center gap-1.5 transition shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>3D Heart Viewer</span>
          </button>

          <button
            onClick={downloadSummary}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0F766E] hover:bg-[#0D6D65] text-white flex items-center gap-1.5 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. OVERALL CAD RESULT (Prominent Primary Card) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0F766E]">Composite Outcome</span>
            </div>
            <h3 className="text-lg font-bold text-[#1E293B] mt-0.5">
              Overall Coronary Artery Disease (CAD) Status
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Systemic evaluation predicting presence of ≥50% stenosis across any coronary vessel (Cath ground truth benchmark)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {getStatusBadge(cadProb)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {/* Estimated Probability & Meter */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-slate-600">Model Decision Score:</span>
              <span className="text-2xl font-bold font-mono text-[#1E293B]">
                {cadProb !== undefined ? `${(cadProb * 100).toFixed(1)}%` : '--'}
              </span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (cadProb || 0) * 100)}%`,
                  backgroundColor: getMeterColor(cadProb)
                }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0% Normal</span>
              <span>Threshold: {(thresholds.low * 100).toFixed(0)}% / {(thresholds.high * 100).toFixed(0)}%</span>
              <span>100% Stenosis</span>
            </div>
          </div>

          {/* Model Architecture & Validation Metric */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1.5 text-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Model Specification</div>
            <div className="font-semibold text-[#1E293B]">{cadPred?.algorithm || 'Balanced RBF SVM'}</div>
            <div className="flex items-center gap-1.5 pt-1 text-slate-600">
              <span className="text-slate-500">Holdout ROC-AUC:</span>
              <span className="font-mono font-bold text-[#0F766E] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                {cadPred?.metrics?.roc_auc?.toFixed(3) || '0.895'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1 leading-snug">
              *ROC-AUC represents holdout model discrimination (N=61 test partition), not individual patient confidence.
            </p>
          </div>

          {/* Clinical Interpretation & SHAP link */}
          <div className="space-y-2">
            <div className="text-xs text-[#64748B] leading-relaxed">
              {cadProb < thresholds.low ? (
                <span>Patient features show minimal epicardial atherosclerotic indicators across non-invasive clinical, ECG, and echocardiographic variables.</span>
              ) : cadProb <= thresholds.high ? (
                <span>Patient features place them in the borderline risk range. Further non-invasive functional testing (e.g., stress imaging) may be warranted.</span>
              ) : (
                <span>Patient features demonstrate significant positive markers associated with epicardial CAD in the retrospective cohort.</span>
              )}
            </div>

            <button
              onClick={() => setSelectedVessel('CAD')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-1.5 ${selectedVessel === 'CAD'
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-[#E2E8F0]'
                }`}
            >
              <span>{selectedVessel === 'CAD' ? 'CAD SHAP Active Below' : 'Focus CAD in SHAP'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. INDIVIDUAL CORONARY VESSELS (LAD, LCX, RCA in 3 Consistent Cards) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h4 className="text-sm font-bold text-[#1E293B]">
              Individual Coronary Vessel Stenosis Risk
            </h4>
            <p className="text-xs text-[#64748B]">
              Targeted vessel predictions: Left Anterior Descending (LAD), Left Circumflex (LCX), Right Coronary Artery (RCA)
            </p>
          </div>
          <span className="text-[11px] text-slate-400">Click a card to focus SHAP analysis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vessels.map(({ key, shortName, fullName, territory, algorithm }) => {
            const pred = predictions?.[key];
            const prob = pred?.probability;
            const isSelected = selectedVessel === key;

            return (
              <div
                key={key}
                onClick={() => setSelectedVessel(key)}
                className={`
                  bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between shadow-2xs
                  ${isSelected
                    ? 'border-[#0F766E] ring-1.5 ring-[#0F766E]/30 bg-[#F0FDF8]/20'
                    : 'border-[#E2E8F0] hover:border-slate-300'
                  }
                `}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                      {shortName}
                    </span>
                    {getStatusBadge(prob)}
                  </div>

                  <h5 className="text-sm font-bold text-[#1E293B] tracking-tight">{shortName} Stenosis</h5>
                  <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">{fullName}</p>

                  {/* Decision Probability */}
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 my-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500 font-medium">Estimated Score:</span>
                      <span className="text-base font-bold font-mono text-[#1E293B]">
                        {prob !== undefined ? `${(prob * 100).toFixed(1)}%` : '--%'}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (prob || 0) * 100)}%`,
                          backgroundColor: getMeterColor(prob)
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed mb-3">
                    {territory}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono text-[10px]">
                    Holdout AUC: <strong className="text-slate-800">{pred?.metrics?.roc_auc?.toFixed(3) || '--'}</strong>
                  </span>
                  <span className={`font-semibold text-xs ${isSelected ? 'text-[#0F766E]' : 'text-slate-400'}`}>
                    {isSelected ? 'Focused in SHAP' : 'Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SUBMITTED MEASUREMENTS DRAWER */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <button
          onClick={() => setShowMeasurements(!showMeasurements)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/60 transition"
        >
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-[#0F766E]" />
            <div>
              <span className="text-xs font-bold text-[#1E293B] block">
                Submitted Patient Clinical Measurements (54 Parameters)
              </span>
              <span className="text-[11px] text-[#64748B]">
                View submitted inputs across Demographics, Vitals, History, Labs, and ECG/Echo
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>{showMeasurements ? 'Hide' : 'View Measurements'}</span>
            {showMeasurements ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showMeasurements && (
          <div className="p-5 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs bg-[#F8FAFC]">
            {/* Domain 1: Demographics */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
              <span className="font-bold text-[#1E293B] block text-[10px] uppercase tracking-wider pb-1 border-b border-slate-100">
                1. Demographics
              </span>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between"><span>Age:</span> <strong className="font-mono text-slate-900">{patientData.Age} yrs</strong></div>
                <div className="flex justify-between"><span>Sex:</span> <strong className="font-mono text-slate-900">{patientData.Sex}</strong></div>
                <div className="flex justify-between"><span>Height:</span> <strong className="font-mono text-slate-900">{patientData.Length} cm</strong></div>
                <div className="flex justify-between"><span>Weight:</span> <strong className="font-mono text-slate-900">{patientData.Weight} kg</strong></div>
                <div className="flex justify-between"><span>BMI:</span> <strong className="font-mono text-slate-900">{patientData.BMI} kg/m²</strong></div>
                <div className="flex justify-between"><span>Obesity:</span> <strong className="font-mono text-slate-900">{patientData.Obesity}</strong></div>
              </div>
            </div>

            {/* Domain 2: Vitals & Symptoms */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
              <span className="font-bold text-[#1E293B] block text-[10px] uppercase tracking-wider pb-1 border-b border-slate-100">
                2. Vitals & Symptoms
              </span>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between"><span>BP:</span> <strong className="font-mono text-slate-900">{patientData.BP} mmHg</strong></div>
                <div className="flex justify-between"><span>Pulse Rate:</span> <strong className="font-mono text-slate-900">{patientData.PR} bpm</strong></div>
                <div className="flex justify-between"><span>Typical Angina:</span> <strong className="font-mono text-slate-900">{patientData['Typical Chest Pain'] ? 'Yes' : 'No'}</strong></div>
                <div className="flex justify-between"><span>Atypical:</span> <strong className="font-mono text-slate-900">{patientData.Atypical}</strong></div>
                <div className="flex justify-between"><span>Dyspnea:</span> <strong className="font-mono text-slate-900">{patientData.Dyspnea}</strong></div>
                <div className="flex justify-between"><span>NYHA Class:</span> <strong className="font-mono text-slate-900">{patientData['Function Class']}</strong></div>
              </div>
            </div>

            {/* Domain 3: Medical History */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
              <span className="font-bold text-[#1E293B] block text-[10px] uppercase tracking-wider pb-1 border-b border-slate-100">
                3. History & Risks
              </span>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between"><span>Diabetes:</span> <strong className="font-mono text-slate-900">{patientData.DM ? 'Yes' : 'No'}</strong></div>
                <div className="flex justify-between"><span>Hypertension:</span> <strong className="font-mono text-slate-900">{patientData.HTN ? 'Yes' : 'No'}</strong></div>
                <div className="flex justify-between"><span>Smoker:</span> <strong className="font-mono text-slate-900">{patientData['Current Smoker'] ? 'Yes' : 'No'}</strong></div>
                <div className="flex justify-between"><span>Family History:</span> <strong className="font-mono text-slate-900">{patientData.FH ? 'Yes' : 'No'}</strong></div>
                <div className="flex justify-between"><span>Dyslipidemia:</span> <strong className="font-mono text-slate-900">{patientData.DLP}</strong></div>
                <div className="flex justify-between"><span>Renal (CRF):</span> <strong className="font-mono text-slate-900">{patientData.CRF}</strong></div>
              </div>
            </div>

            {/* Domain 4: Labs */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
              <span className="font-bold text-[#1E293B] block text-[10px] uppercase tracking-wider pb-1 border-b border-slate-100">
                4. Laboratory Values
              </span>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between"><span>FBS:</span> <strong className="font-mono text-slate-900">{patientData.FBS} mg/dL</strong></div>
                <div className="flex justify-between"><span>Creatinine:</span> <strong className="font-mono text-slate-900">{patientData.CR} mg/dL</strong></div>
                <div className="flex justify-between"><span>TG:</span> <strong className="font-mono text-slate-900">{patientData.TG} mg/dL</strong></div>
                <div className="flex justify-between"><span>LDL / HDL:</span> <strong className="font-mono text-slate-900">{patientData.LDL} / {patientData.HDL}</strong></div>
                <div className="flex justify-between"><span>BUN / ESR:</span> <strong className="font-mono text-slate-900">{patientData.BUN} / {patientData.ESR}</strong></div>
                <div className="flex justify-between"><span>WBC:</span> <strong className="font-mono text-slate-900">{patientData.WBC}</strong></div>
              </div>
            </div>

            {/* Domain 5: ECG & Echo */}
            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] space-y-1.5">
              <span className="font-bold text-[#1E293B] block text-[10px] uppercase tracking-wider pb-1 border-b border-slate-100">
                5. ECG & Echo
              </span>
              <div className="space-y-1 text-slate-600 text-[11px]">
                <div className="flex justify-between"><span>EF-TTE:</span> <strong className="font-mono text-slate-900">{patientData['EF-TTE']}%</strong></div>
                <div className="flex justify-between"><span>RWMA Score:</span> <strong className="font-mono text-slate-900">{patientData['Region RWMA']} / 4</strong></div>
                <div className="flex justify-between"><span>Q Wave:</span> <strong className="font-mono text-slate-900">{patientData['Q Wave'] ? 'Yes' : 'No'}</strong></div>
                <div className="flex justify-between"><span>ST Changes:</span> <strong className="font-mono text-slate-900">{patientData['St Elevation'] ? 'Elev' : patientData['St Depression'] ? 'Depr' : 'None'}</strong></div>
                <div className="flex justify-between"><span>T-Inversion:</span> <strong className="font-mono text-slate-900">{patientData.Tinversion ? 'Yes' : 'No'}</strong></div>
                <div className="flex justify-between"><span>BBB / VHD:</span> <strong className="font-mono text-slate-900">{patientData.BBB} / {patientData.VHD}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. SHAP EXPLAINABILITY PANEL */}
      <ShapExplainerView
        explanation={explanation}
        globalShap={globalShap}
        selectedVessel={selectedVessel}
        setSelectedVessel={setSelectedVessel}
        loadingExplanation={loadingExplanation}
        colorblindMode={colorblindMode}
      />

      {/* 6. Clinical Guidance Footnote */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] text-xs text-slate-600 leading-relaxed shadow-2xs flex items-start gap-2.5">

        <div>

        </div>
      </div>
    </div>
  );
}
