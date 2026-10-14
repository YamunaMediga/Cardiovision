import React, { useState } from 'react';
import { 
  User, 
  Activity, 
  Heart, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  ShieldAlert,
  Sliders,
  ChevronRight,
  ChevronLeft,
  FileText
} from 'lucide-react';

export default function PatientAssessmentForm({
  formData,
  setFormData,
  onSubmit,
  loading,
  metadata
}) {
  const [patientRefId, setPatientRefId] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(0); // 0: All, 1: Demographics, 2: Vitals & Symptoms, 3: History, 4: Labs, 5: ECG & Echo

  // Standard physiological ranges matching dataset distribution
  const fieldRanges = {
    Age: { min: 30, max: 86, label: 'Age', unit: 'years' },
    Weight: { min: 48, max: 120, label: 'Weight', unit: 'kg' },
    Length: { min: 145, max: 188, label: 'Height (Length)', unit: 'cm' },
    BP: { min: 90, max: 180, label: 'Systolic Blood Pressure', unit: 'mmHg' },
    PR: { min: 60, max: 110, label: 'Pulse Rate', unit: 'bpm' },
    FBS: { min: 62, max: 400, label: 'Fasting Blood Sugar', unit: 'mg/dL' },
    CR: { min: 0.5, max: 2.2, label: 'Serum Creatinine', unit: 'mg/dL' },
    TG: { min: 37, max: 1050, label: 'Triglycerides', unit: 'mg/dL' },
    LDL: { min: 18, max: 232, label: 'LDL Cholesterol', unit: 'mg/dL' },
    HDL: { min: 15.9, max: 111.0, label: 'HDL Cholesterol', unit: 'mg/dL' },
    BUN: { min: 8, max: 52, label: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL' },
    ESR: { min: 1, max: 90, label: 'Erythrocyte Sedimentation Rate', unit: 'mm/hr' },
    HB: { min: 9.0, max: 17.6, label: 'Hemoglobin', unit: 'g/dL' },
    K: { min: 3.0, max: 6.6, label: 'Serum Potassium', unit: 'mEq/L' },
    Na: { min: 130, max: 156, label: 'Serum Sodium', unit: 'mEq/L' },
    WBC: { min: 3700, max: 18000, label: 'White Blood Cells', unit: 'cells/μL' },
    Lymph: { min: 7, max: 60, label: 'Lymphocyte %', unit: '%' },
    Neut: { min: 32, max: 86, label: 'Neutrophil %', unit: '%' },
    PLT: { min: 25, max: 742, label: 'Platelets', unit: 'x10³/μL' },
    'EF-TTE': { min: 15, max: 60, label: 'Ejection Fraction (EF-TTE)', unit: '%' },
    'Region RWMA': { min: 0, max: 4, label: 'Regional Wall Motion Score', unit: '0–4' }
  };

  const sections = [
    { id: 0, title: 'All Sections', short: 'All (54)' },
    { id: 1, title: '1. Patient Information & Anthropometrics', short: '1. Demographics' },
    { id: 2, title: '2. Vital Signs & Symptoms', short: '2. Vitals & Symptoms' },
    { id: 3, title: '3. Medical History & Risk Factors', short: '3. History' },
    { id: 4, title: '4. Laboratory Results', short: '4. Labs' },
    { id: 5, title: '5. ECG & Echocardiographic Assessment', short: '5. ECG & Echo' },
  ];

  // Handle field change with automatic BMI calculation
  const handleFieldChange = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };

      // Calculate BMI automatically if Height (Length) and Weight are present
      if (field === 'Weight' || field === 'Length') {
        const w = field === 'Weight' ? parseFloat(value) : parseFloat(prev.Weight);
        const h = field === 'Length' ? parseFloat(value) : parseFloat(prev.Length);
        if (w > 0 && h > 0) {
          const heightM = h / 100.0;
          const bmiVal = parseFloat((w / (heightM * heightM)).toFixed(2));
          next.BMI = bmiVal;
          next.Obesity = bmiVal >= 30 ? 'Y' : 'N';
        }
      }
      return next;
    });

    // Clear validation error for this field if any
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Validate all fields before submission
  const validateForm = () => {
    const errors = {};

    // 1. Check numeric ranges and required values
    Object.entries(fieldRanges).forEach(([field, range]) => {
      const val = formData[field];
      if (val === undefined || val === null || val === '' || isNaN(val)) {
        errors[field] = `${range.label} is required.`;
      } else {
        const num = parseFloat(val);
        if (num < range.min || num > range.max) {
          errors[field] = `Range: ${range.min}–${range.max} ${range.unit}`;
        }
      }
    });

    // 2. Check categoricals
    if (!formData.Sex) errors.Sex = 'Biological sex is required.';
    if (!formData.VHD) errors.VHD = 'Valvular Heart Disease status is required.';
    if (!formData.BBB) errors.BBB = 'Bundle Branch Block status is required.';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData, patientRefId || 'PATIENT-ASSESSMENT');
    } else {
      window.scrollTo({ top: 80, behavior: 'smooth' });
    }
  };

  // Clear / Reset form action
  const handleClearForm = () => {
    const blank = {};
    Object.keys(formData).forEach(k => {
      if (k === 'Sex') blank[k] = 'Male';
      else if (k === 'BBB') blank[k] = 'N';
      else if (k === 'VHD') blank[k] = 'N';
      else if (k === 'Obesity') blank[k] = 'N';
      else if (typeof formData[k] === 'string') blank[k] = 'N';
      else if (typeof formData[k] === 'number' && [
        'DM', 'HTN', 'Current Smoker', 'EX-Smoker', 'FH', 'Edema', 
        'Typical Chest Pain', 'Function Class', 'Q Wave', 'St Elevation', 
        'St Depression', 'Tinversion', 'Region RWMA'
      ].includes(k)) blank[k] = 0;
      else blank[k] = '';
    });
    setFormData(blank);
    setValidationErrors({});
    setPatientRefId('');
  };

  // Load standard validated clinical case (Z-Alizadeh Sani benchmark)
  const handleLoadSample = () => {
    setPatientRefId('CV-SAMPLE-01');
    setFormData({
      Age: 46, Weight: 80, Length: 175, Sex: 'Male', BMI: 26.12,
      DM: 1, HTN: 1, 'Current Smoker': 0, 'EX-Smoker': 0, FH: 0,
      Obesity: 'N', CRF: 'N', CVA: 'N', 'Airway disease': 'N',
      'Thyroid Disease': 'N', CHF: 'N', DLP: 'N', BP: 130, PR: 70,
      Edema: 0, 'Weak Peripheral Pulse': 'N', 'Lung rales': 'N',
      'Systolic Murmur': 'N', 'Diastolic Murmur': 'N', 'Typical Chest Pain': 1,
      Dyspnea: 'N', 'Function Class': 3, Atypical: 'N', Nonanginal: 'N',
      'LowTH Ang': 'N', 'Q Wave': 1, 'St Elevation': 1, 'St Depression': 0,
      Tinversion: 1, LVH: 'N', 'Poor R Progression': 'N', BBB: 'N',
      FBS: 153, CR: 0.6, TG: 204, LDL: 110, HDL: 40, BUN: 18,
      ESR: 20, HB: 14.5, K: 4.2, Na: 140, WBC: 7200, Lymph: 30,
      Neut: 62, PLT: 220, 'EF-TTE': 50, 'Region RWMA': 1, VHD: 'N'
    });
    setValidationErrors({});
  };

  const errorCount = Object.keys(validationErrors).length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Toolbar */}
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
            <h2 className="text-base font-bold text-[#1E293B] tracking-tight">
              Clinical Assessment Form
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Structured 54-parameter non-invasive clinical evaluation mapped directly to CardioVision inference pipelines.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleLoadSample}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F0FDF8] text-[#0F766E] border border-teal-200/80 hover:bg-teal-50 transition shadow-2xs flex items-center gap-1.5"
            title="Populate form with validated sample patient case"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Sample Case</span>
          </button>

          <button
            type="button"
            onClick={handleClearForm}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-[#E2E8F0] text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
            title="Reset form fields"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Form</span>
          </button>
        </div>
      </div>

      {/* 2. Section Navigation Tabs / Stepper */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {sections.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setCurrentStep(sec.id)}
            className={`px-3 py-2 rounded-xl font-semibold transition shrink-0 flex items-center gap-1.5 ${
              currentStep === sec.id
                ? 'bg-[#0F766E] text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-[#E2E8F0] hover:bg-slate-50'
            }`}
          >
            <span>{sec.short}</span>
          </button>
        ))}
      </div>

      {/* 3. Validation Errors Alert (if any) */}
      {errorCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-900 shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-rose-800 mb-1">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Form contains {errorCount} required or out-of-range field{errorCount > 1 ? 's' : ''}:</span>
          </div>
          <p className="text-rose-700 leading-relaxed text-[11px]">
            Please verify the highlighted fields below. All 54 features are strictly required by the underlying model pipeline without silent value substitution.
          </p>
        </div>
      )}

      {/* 4. Form Container */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Patient ID Banner */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <User className="w-4 h-4 text-[#0F766E]" />
            <span className="font-semibold text-[#1E293B]">Patient Reference ID:</span>
            <input
              type="text"
              value={patientRefId}
              onChange={(e) => setPatientRefId(e.target.value)}
              placeholder="e.g. CV-2026-001"
              className="bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0F766E] font-mono w-44"
            />
          </div>

          <div className="text-[11px] text-slate-400">
            Fields marked with <span className="text-rose-500 font-bold">*</span> are required
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: PATIENT INFORMATION & ANTHROPOMETRICS
           ========================================================================= */}
        {(currentStep === 0 || currentStep === 1) && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  1. Patient Information and Anthropometrics
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Demographics, height, weight, and automated BMI calculation
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                6 Features
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Age */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(years)</span>
                </label>
                <input
                  type="number"
                  min="30"
                  max="86"
                  value={formData.Age || ''}
                  onChange={(e) => handleFieldChange('Age', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.Age ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="30 – 86"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Dataset range: 30 to 86 yrs</span>
              </div>

              {/* Biological Sex */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biological Sex <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.Sex || 'Male'}
                  onChange={(e) => handleFieldChange('Sex', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="Male">Male</option>
                  <option value="Fmale">Female (Fmale)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Categorical feature</span>
              </div>

              {/* Height / Length */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Height (Length) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(cm)</span>
                </label>
                <input
                  type="number"
                  min="145"
                  max="188"
                  value={formData.Length || ''}
                  onChange={(e) => handleFieldChange('Length', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.Length ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="145 – 188"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 145 to 188 cm</span>
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weight <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(kg)</span>
                </label>
                <input
                  type="number"
                  min="48"
                  max="120"
                  value={formData.Weight || ''}
                  onChange={(e) => handleFieldChange('Weight', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.Weight ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="48 – 120"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 48 to 120 kg</span>
              </div>

              {/* Calculated BMI */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Body Mass Index (BMI) <span className="text-slate-400 font-normal">(kg/m²)</span>
                </label>
                <div className="w-full bg-slate-100 border border-[#E2E8F0] text-slate-900 text-xs rounded-xl px-3 py-2 font-mono flex items-center justify-between">
                  <span className="font-bold">{formData.BMI || '--'}</span>
                  <span className="text-[10px] text-slate-500">Auto-calculated</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Computed from weight / height²</span>
              </div>

              {/* Obesity Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Obesity Status <span className="text-slate-400 font-normal">(BMI ≥ 30)</span>
                </label>
                <div className="w-full bg-slate-100 border border-[#E2E8F0] text-slate-900 text-xs rounded-xl px-3 py-2 font-mono flex items-center justify-between">
                  <span className={`font-bold ${formData.Obesity === 'Y' ? 'text-amber-700' : 'text-slate-700'}`}>
                    {formData.Obesity === 'Y' ? 'Yes (Obese)' : 'No (Non-obese)'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">[{formData.Obesity}]</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Categorical encoding</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 2: VITAL SIGNS & SYMPTOMS
           ========================================================================= */}
        {(currentStep === 0 || currentStep === 2) && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  2. Vital Signs and Symptoms
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Hemodynamics, chest pain presentation, murmurs, and physical examination
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                13 Features
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Systolic BP */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Systolic Blood Pressure <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mmHg)</span>
                </label>
                <input
                  type="number"
                  min="90"
                  max="180"
                  value={formData.BP || ''}
                  onChange={(e) => handleFieldChange('BP', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.BP ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="90 – 180"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Normal: 90 to 180 mmHg</span>
              </div>

              {/* Pulse Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pulse Rate (PR) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(bpm)</span>
                </label>
                <input
                  type="number"
                  min="60"
                  max="110"
                  value={formData.PR || ''}
                  onChange={(e) => handleFieldChange('PR', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.PR ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="60 – 110"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Normal: 60 to 110 bpm</span>
              </div>

              {/* Typical Chest Pain */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Typical Chest Pain <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Typical Chest Pain']}
                  onChange={(e) => handleFieldChange('Typical Chest Pain', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — No Typical Angina</option>
                  <option value={1}>1 — Yes (Typical Angina)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Substernal exertional pain</span>
              </div>

              {/* Atypical Chest Pain */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atypical Chest Pain <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.Atypical || 'N'}
                  onChange={(e) => handleFieldChange('Atypical', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Atypical angina symptoms</span>
              </div>

              {/* Nonanginal Chest Pain */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nonanginal Chest Pain <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.Nonanginal || 'N'}
                  onChange={(e) => handleFieldChange('Nonanginal', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Non-cardiac chest pain</span>
              </div>

              {/* LowTH Ang (Low Threshold Angina) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Low Threshold Angina <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['LowTH Ang'] || 'N'}
                  onChange={(e) => handleFieldChange('LowTH Ang', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Angina on mild exertion</span>
              </div>

              {/* Dyspnea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dyspnea (Shortness of Breath) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.Dyspnea || 'N'}
                  onChange={(e) => handleFieldChange('Dyspnea', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Exertional dyspnea</span>
              </div>

              {/* Function Class */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NYHA Function Class <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Function Class']}
                  onChange={(e) => handleFieldChange('Function Class', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>Class 0 — Asymptomatic</option>
                  <option value={1}>Class 1 — Mild limitation</option>
                  <option value={2}>Class 2 — Moderate limitation</option>
                  <option value={3}>Class 3 — Marked limitation</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Functional capacity score</span>
              </div>

              {/* Edema */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Peripheral Edema <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.Edema}
                  onChange={(e) => handleFieldChange('Edema', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — None</option>
                  <option value={1}>1 — Present</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Lower extremity edema</span>
              </div>

              {/* Weak Peripheral Pulse */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weak Peripheral Pulse <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Weak Peripheral Pulse'] || 'N'}
                  onChange={(e) => handleFieldChange('Weak Peripheral Pulse', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Diminished radial/dorsalis pedis</span>
              </div>

              {/* Lung Rales */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lung Rales / Crackles <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Lung rales'] || 'N'}
                  onChange={(e) => handleFieldChange('Lung rales', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Pulmonary auscultation</span>
              </div>

              {/* Systolic Murmur */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Systolic Murmur <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Systolic Murmur'] || 'N'}
                  onChange={(e) => handleFieldChange('Systolic Murmur', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Cardiac auscultation</span>
              </div>

              {/* Diastolic Murmur */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diastolic Murmur <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Diastolic Murmur'] || 'N'}
                  onChange={(e) => handleFieldChange('Diastolic Murmur', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Cardiac auscultation</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 3: MEDICAL HISTORY & RISK FACTORS
           ========================================================================= */}
        {(currentStep === 0 || currentStep === 3) && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  3. Medical History and Risk Factors
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Cardiovascular comorbidities, smoking history, and chronic organ disease
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                11 Features
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Diabetes Mellitus */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diabetes Mellitus (DM) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.DM}
                  onChange={(e) => handleFieldChange('DM', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — No</option>
                  <option value={1}>1 — Yes</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Diagnosed DM status</span>
              </div>

              {/* Hypertension */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hypertension (HTN) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.HTN}
                  onChange={(e) => handleFieldChange('HTN', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — No</option>
                  <option value={1}>1 — Yes</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Diagnosed hypertension</span>
              </div>

              {/* Current Smoker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Smoker <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Current Smoker']}
                  onChange={(e) => handleFieldChange('Current Smoker', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — No</option>
                  <option value={1}>1 — Yes</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Active tobacco use</span>
              </div>

              {/* EX-Smoker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ex-Smoker <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['EX-Smoker']}
                  onChange={(e) => handleFieldChange('EX-Smoker', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — No</option>
                  <option value={1}>1 — Yes</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Former tobacco use</span>
              </div>

              {/* Family History */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Family History of CAD (FH) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.FH}
                  onChange={(e) => handleFieldChange('FH', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — No</option>
                  <option value={1}>1 — Yes</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">First-degree premature CAD</span>
              </div>

              {/* Chronic Renal Failure (CRF) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chronic Renal Failure (CRF) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.CRF || 'N'}
                  onChange={(e) => handleFieldChange('CRF', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Chronic kidney disease</span>
              </div>

              {/* Cerebrovascular Accident (CVA) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cerebrovascular Accident (CVA) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.CVA || 'N'}
                  onChange={(e) => handleFieldChange('CVA', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Prior stroke / TIA</span>
              </div>

              {/* Airway Disease */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Airway Disease (COPD/Asthma) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Airway disease'] || 'N'}
                  onChange={(e) => handleFieldChange('Airway disease', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Chronic lung disease</span>
              </div>

              {/* Thyroid Disease */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thyroid Disease <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Thyroid Disease'] || 'N'}
                  onChange={(e) => handleFieldChange('Thyroid Disease', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Hypo/hyperthyroidism</span>
              </div>

              {/* Congestive Heart Failure (CHF) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Congestive Heart Failure (CHF) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.CHF || 'N'}
                  onChange={(e) => handleFieldChange('CHF', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Prior heart failure history</span>
              </div>

              {/* Dyslipidemia (DLP) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dyslipidemia (DLP) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.DLP || 'N'}
                  onChange={(e) => handleFieldChange('DLP', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Hypercholesterolemia history</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 4: LABORATORY RESULTS
           ========================================================================= */}
        {(currentStep === 0 || currentStep === 4) && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  4. Laboratory Results
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Serum lipid panel, metabolic markers, renal function, and hematology
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                14 Features
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Fasting Blood Sugar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fasting Blood Sugar (FBS) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mg/dL)</span>
                </label>
                <input
                  type="number"
                  min="62"
                  max="400"
                  value={formData.FBS || ''}
                  onChange={(e) => handleFieldChange('FBS', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.FBS ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="62 – 400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 62 to 400 mg/dL</span>
              </div>

              {/* Serum Creatinine */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Serum Creatinine (CR) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mg/dL)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2.2"
                  value={formData.CR || ''}
                  onChange={(e) => handleFieldChange('CR', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.CR ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="0.5 – 2.2"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 0.5 to 2.2 mg/dL</span>
              </div>

              {/* Triglycerides */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Triglycerides (TG) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mg/dL)</span>
                </label>
                <input
                  type="number"
                  min="37"
                  max="1050"
                  value={formData.TG || ''}
                  onChange={(e) => handleFieldChange('TG', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.TG ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="37 – 1050"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 37 to 1050 mg/dL</span>
              </div>

              {/* LDL Cholesterol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LDL Cholesterol <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mg/dL)</span>
                </label>
                <input
                  type="number"
                  min="18"
                  max="232"
                  value={formData.LDL || ''}
                  onChange={(e) => handleFieldChange('LDL', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.LDL ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="18 – 232"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 18 to 232 mg/dL</span>
              </div>

              {/* HDL Cholesterol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HDL Cholesterol <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mg/dL)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="15.9"
                  max="111.0"
                  value={formData.HDL || ''}
                  onChange={(e) => handleFieldChange('HDL', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.HDL ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="15.9 – 111.0"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 15.9 to 111.0 mg/dL</span>
              </div>

              {/* Blood Urea Nitrogen (BUN) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Urea Nitrogen (BUN) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mg/dL)</span>
                </label>
                <input
                  type="number"
                  min="8"
                  max="52"
                  value={formData.BUN || ''}
                  onChange={(e) => handleFieldChange('BUN', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.BUN ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="8 – 52"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 8 to 52 mg/dL</span>
              </div>

              {/* ESR */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ESR <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mm/hr)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.ESR || ''}
                  onChange={(e) => handleFieldChange('ESR', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.ESR ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="1 – 90"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Erythrocyte sedimentation rate</span>
              </div>

              {/* Hemoglobin */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hemoglobin (HB) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(g/dL)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="9.0"
                  max="17.6"
                  value={formData.HB || ''}
                  onChange={(e) => handleFieldChange('HB', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.HB ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="9.0 – 17.6"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 9.0 to 17.6 g/dL</span>
              </div>

              {/* Serum Potassium */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Potassium (K) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mEq/L)</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="3.0"
                  max="6.6"
                  value={formData.K || ''}
                  onChange={(e) => handleFieldChange('K', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.K ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="3.0 – 6.6"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Normal: 3.0 to 6.6 mEq/L</span>
              </div>

              {/* Serum Sodium */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sodium (Na) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(mEq/L)</span>
                </label>
                <input
                  type="number"
                  min="130"
                  max="156"
                  value={formData.Na || ''}
                  onChange={(e) => handleFieldChange('Na', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.Na ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="130 – 156"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Normal: 130 to 156 mEq/L</span>
              </div>

              {/* White Blood Cell Count */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  White Blood Cells (WBC) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(cells/μL)</span>
                </label>
                <input
                  type="number"
                  min="3700"
                  max="18000"
                  value={formData.WBC || ''}
                  onChange={(e) => handleFieldChange('WBC', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.WBC ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="3700 – 18000"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 3,700 to 18,000</span>
              </div>

              {/* Lymphocyte % */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lymphocyte % <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(%)</span>
                </label>
                <input
                  type="number"
                  min="7"
                  max="60"
                  value={formData.Lymph || ''}
                  onChange={(e) => handleFieldChange('Lymph', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.Lymph ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="7 – 60"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Normal: 7 to 60%</span>
              </div>

              {/* Neutrophil % */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Neutrophil % <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(%)</span>
                </label>
                <input
                  type="number"
                  min="32"
                  max="86"
                  value={formData.Neut || ''}
                  onChange={(e) => handleFieldChange('Neut', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.Neut ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="32 – 86"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Normal: 32 to 86%</span>
              </div>

              {/* Platelets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Platelets (PLT) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(x10³/μL)</span>
                </label>
                <input
                  type="number"
                  min="25"
                  max="742"
                  value={formData.PLT || ''}
                  onChange={(e) => handleFieldChange('PLT', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors.PLT ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="25 – 742"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Range: 25 to 742 x10³/μL</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 5: ECG & ECHOCARDIOGRAPHY
           ========================================================================= */}
        {(currentStep === 0 || currentStep === 5) && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">
                  5. ECG and Echocardiographic Assessment
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  12-lead electrocardiogram findings, ventricular kinetics, and valvular function
                </p>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                10 Features
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Ejection Fraction (EF-TTE) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ejection Fraction (EF-TTE) <span className="text-rose-500">*</span> <span className="text-slate-400 font-normal">(%)</span>
                </label>
                <input
                  type="number"
                  min="15"
                  max="60"
                  value={formData['EF-TTE'] || ''}
                  onChange={(e) => handleFieldChange('EF-TTE', e.target.value)}
                  className={`w-full bg-slate-50 border text-xs rounded-xl px-3 py-2 focus:outline-none font-mono ${
                    validationErrors['EF-TTE'] ? 'border-rose-400 bg-rose-50/40' : 'border-[#E2E8F0] focus:border-[#0F766E]'
                  }`}
                  placeholder="15 – 60"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Transthoracic echo EF (15–60%)</span>
              </div>

              {/* Regional Wall Motion Abnormality Score (Region RWMA) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Regional Wall Motion (RWMA) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Region RWMA']}
                  onChange={(e) => handleFieldChange('Region RWMA', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — Normal kinetics</option>
                  <option value={1}>1 — Hypokinesia (1 segment)</option>
                  <option value={2}>2 — Hypokinesia (2 segments)</option>
                  <option value={3}>3 — Akinesia / dyskinesia</option>
                  <option value={4}>4 — Severe multi-segmental RWMA</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Echocardiography score (0–4)</span>
              </div>

              {/* Valvular Heart Disease (VHD) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valvular Heart Disease (VHD) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.VHD || 'N'}
                  onChange={(e) => handleFieldChange('VHD', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="mild">Mild (mild)</option>
                  <option value="Moderate">Moderate (Moderate)</option>
                  <option value="Severe">Severe (Severe)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Echo valvular assessment</span>
              </div>

              {/* Q Wave */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pathological Q Wave <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Q Wave']}
                  onChange={(e) => handleFieldChange('Q Wave', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — Absent</option>
                  <option value={1}>1 — Present</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Sign of prior infarction</span>
              </div>

              {/* ST Elevation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ST Elevation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['St Elevation']}
                  onChange={(e) => handleFieldChange('St Elevation', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — Absent</option>
                  <option value={1}>1 — Present</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Acute transmural injury pattern</span>
              </div>

              {/* ST Depression */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ST Depression <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['St Depression']}
                  onChange={(e) => handleFieldChange('St Depression', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — Absent</option>
                  <option value={1}>1 — Present</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Subendocardial ischemia</span>
              </div>

              {/* T-Wave Inversion */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  T-Wave Inversion (Tinversion) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.Tinversion}
                  onChange={(e) => handleFieldChange('Tinversion', parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value={0}>0 — Absent</option>
                  <option value={1}>1 — Present</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Repolarization abnormality</span>
              </div>

              {/* Left Ventricular Hypertrophy (LVH) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  LV Hypertrophy (LVH) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.LVH || 'N'}
                  onChange={(e) => handleFieldChange('LVH', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Voltage criteria on ECG</span>
              </div>

              {/* Poor R Progression */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Poor R-Wave Progression <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData['Poor R Progression'] || 'N'}
                  onChange={(e) => handleFieldChange('Poor R Progression', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Anterior precordial leads</span>
              </div>

              {/* Bundle Branch Block (BBB) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bundle Branch Block (BBB) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.BBB || 'N'}
                  onChange={(e) => handleFieldChange('BBB', e.target.value)}
                  className="w-full bg-slate-50 border border-[#E2E8F0] text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="N">None (N)</option>
                  <option value="LBBB">Left BBB (LBBB)</option>
                  <option value="RBBB">Right BBB (RBBB)</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Intraventricular conduction delay</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Stepper Navigation & Final Submit Button */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Section</span>
              </button>
            )}

            {currentStep > 0 && currentStep < 5 && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition flex items-center gap-1.5"
              >
                <span>Next Section</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep !== 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[#0F766E] hover:underline"
              >
                View All 54 Fields
              </button>
            )}
          </div>

          {/* Submission Action Button */}
          <button
            type="submit"
            disabled={loading}
            className={`
              px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-2 transition shadow-xs
              ${loading
                ? 'bg-teal-700/60 cursor-not-allowed'
                : 'bg-[#0F766E] hover:bg-[#0D6D65]'
              }
            `}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Inference & SHAP Analysis...</span>
              </>
            ) : (
              <>
                <span>Run Clinical Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
